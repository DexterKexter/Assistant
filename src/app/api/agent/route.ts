import { streamText, tool, convertToModelMessages, stepCountIs, type UIMessage } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

export const maxDuration = 60

const SYSTEM_PROMPT = `Ты — AI ассистент для логистической CRM-системы. Помогаешь менеджерам управлять контейнерными перевозками.

База данных содержит:
- shipments (перевозки): container_number, container_size, container_type, origin, destination_city, destination_station, departure_date (загрузка), arrival_date (граница КЗ), delivery_date (доставка клиенту), is_completed, delivery_cost, price, invoice_amount, sender_name
- clients (клиенты): name, is_russia (флаг РФ), phone, address
- carriers (перевозчики): name
- senders (отправители из Дубая/Китая): name
- recipients (получатели в КЗ): name

Логика статусов перевозки:
- delivery_date или is_completed=true → Доставлен
- arrival_date + клиент из РФ → Транзит КЗ
- arrival_date + клиент из КЗ → На границе
- departure_date → В пути
- иначе → Загрузка

Маршрут для КЗ: Загрузка → В пути → На границе → Доставлен
Маршрут для РФ: Загрузка → В пути → Транзит КЗ → Доставлен в РФ

Используй инструменты для запросов в базу. Отвечай кратко, по делу, на русском. Используй markdown для форматирования: жирный текст, списки, таблицы. Сегодняшняя дата: ${new Date().toISOString().split('T')[0]}.

Когда показываешь перевозку — давай ссылку формата [CONTAINER_NUM](/dashboard/shipments/{id}) чтобы пользователь мог открыть её одним кликом.

Когда данные нагляднее показать визуально (тренды по месяцам, топ маршрутов, доли клиентов РФ/КЗ, динамика финансов) — вызывай render_chart. Бери данные из других tools, агрегируй до 20 точек, выбирай:
- bar для сравнений и топов
- line/area для трендов по времени
- pie для долей и распределений
После графика дай короткое 1-2-предложений резюме что видно на нём.

ИЗМЕНЕНИЯ В БАЗЕ:
- create_shipment, create_client, create_carrier, update_shipment — вызывай ТОЛЬКО когда пользователь явно просит создать/изменить ("создай перевозку", "добавь клиента", "поставь дату прибытия").
- Перед созданием перевозки кратко покажи что собираешься создать (список полей) и подтверди в одном сообщении ("Создаю перевозку: ...").
- При update_shipment всегда указывай явно какое поле меняется и на какое значение.
- Если не хватает обязательных полей (container_number, client) — переспроси у пользователя, не выдумывай.
- После создания — покажи ссылку на новую перевозку формата [номер_контейнера](/dashboard/shipments/{id}).`

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json()
  const supabase = await createClient()

  const modelMessages = await convertToModelMessages(messages)
  const result = streamText({
    model: openrouter.chat('deepseek/deepseek-chat-v3.1'),
    system: SYSTEM_PROMPT,
    messages: modelMessages,
    stopWhen: stepCountIs(8),
    tools: {
      get_stats: tool({
        description: 'Получить общую статистику по перевозкам: всего, в пути, на границе, доставлено, активных',
        inputSchema: z.object({}),
        execute: async () => {
          const [total, inTransit, atBorder, delivered] = await Promise.all([
            supabase.from('shipments').select('id', { count: 'exact', head: true }),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).or('is_completed.eq.true,delivery_date.not.is.null'),
          ])
          return {
            total: total.count ?? 0,
            in_transit: inTransit.count ?? 0,
            at_border: atBorder.count ?? 0,
            delivered: delivered.count ?? 0,
          }
        },
      }),

      search_shipments: tool({
        description:
          'Поиск перевозок по фильтрам: статус, клиент, перевозчик, направление, период дат. ' +
          'Фильтры по клиенту/перевозчику работают на уровне БД (full DB scope), не только по последним 20. ' +
          'Возвращает count и срез до limit (по умолчанию 50, максимум 200).',
        inputSchema: z.object({
          status: z.enum(['loading', 'in_transit', 'at_border', 'delivered']).optional(),
          client_name: z.string().optional().describe('Часть имени клиента (ilike)'),
          carrier_name: z.string().optional().describe('Часть имени перевозчика (ilike)'),
          origin: z.string().optional(),
          destination: z.string().optional().describe('Город или станция назначения'),
          container_number: z.string().optional(),
          from_date: z.string().optional().describe('YYYY-MM-DD'),
          to_date: z.string().optional().describe('YYYY-MM-DD'),
          is_russia: z.boolean().optional().describe('Только клиенты из РФ'),
          limit: z.number().int().min(1).max(200).optional().default(50),
        }),
        execute: async (args) => {
          // ── Resolve client_name / carrier_name to IDs server-side first ──
          let clientIds: string[] | null = null
          if (args.client_name) {
            const { data } = await supabase
              .from('clients').select('id').ilike('name', `%${args.client_name}%`).limit(200)
            clientIds = (data || []).map((r) => r.id)
            if (clientIds.length === 0) return { count: 0, shipments: [], note: `Клиент "${args.client_name}" не найден` }
          }
          let carrierIds: string[] | null = null
          if (args.carrier_name) {
            const { data } = await supabase
              .from('carriers').select('id').ilike('name', `%${args.carrier_name}%`).limit(200)
            carrierIds = (data || []).map((r) => r.id)
            if (carrierIds.length === 0) return { count: 0, shipments: [], note: `Перевозчик "${args.carrier_name}" не найден` }
          }
          let russiaClientIds: string[] | null = null
          if (args.is_russia !== undefined) {
            const { data } = await supabase
              .from('clients').select('id').eq('is_russia', args.is_russia).limit(1000)
            russiaClientIds = (data || []).map((r) => r.id)
            if (russiaClientIds.length === 0) return { count: 0, shipments: [] }
          }

          const limit = Math.min(Math.max(args.limit ?? 50, 1), 200)

          let q = supabase
            .from('shipments')
            .select(
              `id, container_number, container_size, container_type,
               origin, destination_city, destination_station,
               departure_date, arrival_date, delivery_date, is_completed,
               sender_name, price, delivery_cost,
               client:clients(id, name, is_russia),
               carrier:carriers(id, name)`,
              { count: 'exact' },
            )
            .order('departure_date', { ascending: false, nullsFirst: false })
            .limit(limit)

          if (args.status === 'loading') q = q.is('departure_date', null).eq('is_completed', false)
          if (args.status === 'in_transit') q = q.not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'at_border') q = q.not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'delivered') q = q.or('is_completed.eq.true,delivery_date.not.is.null')
          if (args.container_number) q = q.ilike('container_number', `%${args.container_number}%`)
          if (args.origin) q = q.ilike('origin', `%${args.origin}%`)
          if (args.destination) q = q.or(`destination_city.ilike.%${args.destination}%,destination_station.ilike.%${args.destination}%`)
          if (args.from_date) q = q.gte('departure_date', args.from_date)
          if (args.to_date) q = q.lte('departure_date', args.to_date)
          if (clientIds) q = q.in('client_id', clientIds)
          if (carrierIds) q = q.in('carrier_id', carrierIds)
          if (russiaClientIds) q = q.in('client_id', russiaClientIds)

          const { data, error, count } = await q
          if (error) return { error: error.message }
          return {
            count: count ?? data?.length ?? 0,
            returned: data?.length ?? 0,
            shipments: data || [],
            ...(count && data && count > data.length
              ? { note: `Всего по фильтрам: ${count}. Показано: ${data.length}. Уточни запрос или увеличь limit (макс 200).` }
              : {}),
          }
        },
      }),

      get_shipment: tool({
        description: 'Получить детали одной перевозки по ID или номеру контейнера',
        inputSchema: z.object({
          id: z.string().optional(),
          container_number: z.string().optional(),
        }),
        execute: async ({ id, container_number }) => {
          let q = supabase.from('shipments').select(`
            *,
            client:clients(*),
            carrier:carriers(*),
            sender:senders(*),
            recipient:recipients(*)
          `).limit(1)
          if (id) q = q.eq('id', id)
          else if (container_number) q = q.ilike('container_number', `%${container_number}%`)
          else return { error: 'Нужен id или container_number' }
          const { data, error } = await q.single()
          if (error) return { error: error.message }
          return data
        },
      }),

      list_clients: tool({
        description: 'Список клиентов. По умолчанию возвращает первые 100. Без фильтров — total count считается отдельно.',
        inputSchema: z.object({
          search: z.string().optional(),
          is_russia: z.boolean().optional().describe('Только клиенты из РФ'),
          limit: z.number().int().min(1).max(500).optional().default(100),
        }),
        execute: async ({ search, is_russia, limit }) => {
          const cap = Math.min(Math.max(limit ?? 100, 1), 500)
          let q = supabase
            .from('clients')
            .select('id, name, is_russia, phone, address', { count: 'exact' })
            .order('name')
            .limit(cap)
          if (search) q = q.ilike('name', `%${search}%`)
          if (is_russia !== undefined) q = q.eq('is_russia', is_russia)
          const { data, error, count } = await q
          if (error) return { error: error.message }
          return {
            count: count ?? data?.length ?? 0,
            returned: data?.length ?? 0,
            clients: data,
            ...(count && data && count > data.length
              ? { note: `Всего по фильтрам: ${count}. Показано: ${data.length}.` }
              : {}),
          }
        },
      }),

      list_carriers: tool({
        description: 'Список перевозчиков с количеством их перевозок в пути',
        inputSchema: z.object({}),
        execute: async () => {
          const { data: carriers } = await supabase.from('carriers').select('id, name')
          if (!carriers) return { carriers: [] }
          const enriched = await Promise.all(carriers.map(async (c) => {
            const { count } = await supabase
              .from('shipments').select('id', { count: 'exact', head: true })
              .eq('carrier_id', c.id)
              .not('departure_date', 'is', null).is('delivery_date', null).eq('is_completed', false)
            return { ...c, in_transit: count ?? 0 }
          }))
          return { carriers: enriched.sort((a, b) => b.in_transit - a.in_transit) }
        },
      }),

      finance_summary: tool({
        description: 'Финансовая сводка: суммарная выручка, расходы, прибыль за период. Считает по ВСЕЙ базе (с пагинацией).',
        inputSchema: z.object({
          from_date: z.string().optional().describe('YYYY-MM-DD'),
          to_date: z.string().optional().describe('YYYY-MM-DD'),
        }),
        execute: async ({ from_date, to_date }) => {
          // Page through all rows — Supabase REST caps at 1000 per request.
          const all: any[] = []
          for (let page = 0; page < 20; page++) { // up to 20k rows
            let q = supabase
              .from('shipments')
              .select('price, delivery_cost, customs_cost, additional_cost, invoice_amount, departure_date')
              .range(page * 1000, page * 1000 + 999)
            if (from_date) q = q.gte('departure_date', from_date)
            if (to_date) q = q.lte('departure_date', to_date)
            const { data, error } = await q
            if (error) return { error: error.message }
            if (!data || data.length === 0) break
            all.push(...data)
            if (data.length < 1000) break
          }
          const sum = (k: string) => all.reduce((a: number, r: any) => a + (Number(r[k]) || 0), 0)
          const revenue = sum('price') || sum('invoice_amount')
          const costs = sum('delivery_cost') + sum('customs_cost') + sum('additional_cost')
          return {
            count: all.length,
            revenue,
            costs,
            profit: revenue - costs,
            currency: 'USD',
          }
        },
      }),

      top_routes: tool({
        description: 'Топ направлений: куда едут контейнеры. Считает по ВСЕЙ базе (с пагинацией).',
        inputSchema: z.object({
          limit: z.number().int().min(1).max(50).optional().default(10),
          from_date: z.string().optional().describe('YYYY-MM-DD'),
          to_date: z.string().optional().describe('YYYY-MM-DD'),
        }),
        execute: async ({ limit, from_date, to_date }) => {
          const all: any[] = []
          for (let page = 0; page < 20; page++) {
            let q = supabase
              .from('shipments')
              .select('origin, destination_city, destination_station, departure_date')
              .range(page * 1000, page * 1000 + 999)
            if (from_date) q = q.gte('departure_date', from_date)
            if (to_date) q = q.lte('departure_date', to_date)
            const { data, error } = await q
            if (error) return { error: error.message }
            if (!data || data.length === 0) break
            all.push(...data)
            if (data.length < 1000) break
          }
          const map = new Map<string, number>()
          for (const r of all) {
            const key = `${r.origin || '?'} → ${r.destination_city || r.destination_station || '?'}`
            map.set(key, (map.get(key) || 0) + 1)
          }
          return {
            total_shipments: all.length,
            routes: Array.from(map.entries())
              .map(([route, count]) => ({ route, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, limit ?? 10),
          }
        },
      }),

      create_shipment: tool({
        description:
          'Создать новую перевозку. Передавай имена клиента/перевозчика — я найду их в базе. ' +
          'Если найдено несколько совпадений или не найдено — верну ошибку с подсказкой.',
        inputSchema: z.object({
          container_number: z.string().describe('Номер контейнера, например MSKU1234567'),
          client_name: z.string().describe('Имя клиента (поиск по подстроке)'),
          carrier_name: z.string().optional().describe('Имя перевозчика'),
          sender_name: z.string().optional().describe('Имя отправителя (свободный текст)'),
          container_size: z.union([z.literal(20), z.literal(40)]).optional(),
          container_type: z.string().optional().describe('Выкупной / Возвратный / Собственный / Малшы'),
          origin: z.string().optional().describe('Откуда (Дубай, Чингдао, Корея...)'),
          destination_city: z.string().optional().describe('Конечный город (Алматы, Москва...)'),
          destination_station: z.string().optional().describe('Погранпереход (Актау Порт, Алтынколь, Сары-агаш, Темир-Баба)'),
          departure_date: z.string().optional().describe('Дата отправления YYYY-MM-DD'),
          arrival_date: z.string().optional().describe('Дата прибытия на границу YYYY-MM-DD'),
          delivery_date: z.string().optional().describe('Дата доставки YYYY-MM-DD'),
          price: z.number().optional().describe('Цена для клиента (USD)'),
          delivery_cost: z.number().optional().describe('Стоимость доставки (USD)'),
          customs_cost: z.number().optional().describe('Таможня (USD)'),
          cargo_description: z.string().optional(),
          notes: z.string().optional(),
        }),
        execute: async (args) => {
          // Resolve client
          let client_id: string | null = null
          if (args.client_name) {
            const { data: clients } = await supabase
              .from('clients').select('id, name').ilike('name', `%${args.client_name}%`).limit(3)
            if (!clients?.length) {
              return { error: `Клиент "${args.client_name}" не найден. Создай его сначала через create_client или уточни имя.` }
            }
            if (clients.length > 1) {
              const exact = clients.find((c) => c.name.toLowerCase() === args.client_name.toLowerCase())
              if (exact) client_id = exact.id
              else return { error: `Несколько клиентов: ${clients.map((c) => c.name).join(', ')}. Уточни имя.` }
            } else {
              client_id = clients[0].id
            }
          }
          // Resolve carrier
          let carrier_id: string | null = null
          if (args.carrier_name) {
            const { data: carriers } = await supabase
              .from('carriers').select('id, name').ilike('name', `%${args.carrier_name}%`).limit(3)
            if (!carriers?.length) {
              return { error: `Перевозчик "${args.carrier_name}" не найден. Создай через create_carrier или уточни.` }
            }
            if (carriers.length > 1) {
              const exact = carriers.find((c) => c.name.toLowerCase() === args.carrier_name!.toLowerCase())
              if (exact) carrier_id = exact.id
              else return { error: `Несколько перевозчиков: ${carriers.map((c) => c.name).join(', ')}. Уточни.` }
            } else {
              carrier_id = carriers[0].id
            }
          }

          const insert: Record<string, unknown> = {
            container_number: args.container_number,
            container_size: args.container_size ?? null,
            container_type: args.container_type ?? null,
            client_id,
            carrier_id,
            sender_name: args.sender_name ?? null,
            origin: args.origin ?? null,
            destination_city: args.destination_city ?? null,
            destination_station: args.destination_station ?? null,
            departure_date: args.departure_date ?? null,
            arrival_date: args.arrival_date ?? null,
            delivery_date: args.delivery_date ?? null,
            price: args.price ?? null,
            delivery_cost: args.delivery_cost ?? null,
            customs_cost: args.customs_cost ?? null,
            cargo_description: args.cargo_description ?? null,
            notes: args.notes ?? null,
            is_completed: false,
          }
          const { data, error } = await supabase
            .from('shipments').insert(insert).select('id, container_number').single()
          if (error) return { error: `Не удалось создать: ${error.message}` }
          return {
            success: true,
            id: data.id,
            container_number: data.container_number,
            link: `/dashboard/shipments/${data.id}`,
            message: `Перевозка ${data.container_number} создана`,
          }
        },
      }),

      update_shipment: tool({
        description:
          'Обновить поля существующей перевозки (даты, цены, статус и т.п.). Передавай id или container_number и только те поля что меняются.',
        inputSchema: z.object({
          id: z.string().optional().describe('UUID перевозки'),
          container_number: z.string().optional().describe('Альтернатива id — найдём по точному совпадению'),
          fields: z.object({
            container_size: z.union([z.literal(20), z.literal(40)]).optional(),
            container_type: z.string().optional(),
            origin: z.string().optional(),
            destination_city: z.string().optional(),
            destination_station: z.string().optional(),
            departure_date: z.string().nullable().optional(),
            arrival_date: z.string().nullable().optional(),
            delivery_date: z.string().nullable().optional(),
            price: z.number().nullable().optional(),
            delivery_cost: z.number().nullable().optional(),
            customs_cost: z.number().nullable().optional(),
            additional_cost: z.number().nullable().optional(),
            invoice_amount: z.number().nullable().optional(),
            is_completed: z.boolean().optional(),
            notes: z.string().nullable().optional(),
            cargo_description: z.string().nullable().optional(),
          }).describe('Только меняющиеся поля'),
        }),
        execute: async ({ id, container_number, fields }) => {
          let target_id = id
          if (!target_id && container_number) {
            const { data } = await supabase.from('shipments').select('id').eq('container_number', container_number).limit(1).single()
            if (!data) return { error: `Перевозка ${container_number} не найдена` }
            target_id = data.id
          }
          if (!target_id) return { error: 'Нужен id или container_number' }
          const cleaned: Record<string, unknown> = {}
          for (const [k, v] of Object.entries(fields)) {
            if (v !== undefined) cleaned[k] = v
          }
          if (Object.keys(cleaned).length === 0) return { error: 'Нет полей для обновления' }
          const { data, error } = await supabase
            .from('shipments').update(cleaned).eq('id', target_id).select('id, container_number').single()
          if (error) return { error: error.message }
          return {
            success: true,
            id: data.id,
            container_number: data.container_number,
            link: `/dashboard/shipments/${data.id}`,
            updated_fields: Object.keys(cleaned),
            message: `Обновлено: ${Object.keys(cleaned).join(', ')}`,
          }
        },
      }),

      create_client: tool({
        description: 'Создать нового клиента. Используй когда клиент не найден перед созданием перевозки.',
        inputSchema: z.object({
          name: z.string().describe('Полное имя клиента'),
          is_russia: z.boolean().optional().default(false).describe('Из РФ?'),
          phone: z.string().optional(),
          address: z.string().optional(),
        }),
        execute: async (args) => {
          const { data, error } = await supabase
            .from('clients')
            .insert({
              name: args.name,
              is_russia: args.is_russia ?? false,
              phone: args.phone ?? null,
              address: args.address ?? null,
            })
            .select('id, name, is_russia').single()
          if (error) return { error: error.message }
          return { success: true, id: data.id, name: data.name, message: `Клиент ${data.name} создан` }
        },
      }),

      create_carrier: tool({
        description: 'Создать нового перевозчика.',
        inputSchema: z.object({ name: z.string() }),
        execute: async (args) => {
          const { data, error } = await supabase
            .from('carriers').insert({ name: args.name }).select('id, name').single()
          if (error) return { error: error.message }
          return { success: true, id: data.id, name: data.name, message: `Перевозчик ${data.name} создан` }
        },
      }),

      render_chart: tool({
        description:
          'Отрендерить график в чате. Используй когда данные нагляднее показать визуально: тренды по периодам (line/area), сравнения количеств (bar), доли (pie). ' +
          'Сначала получи данные через другие tools, потом передай их сюда. Не больше 20 точек на графике.',
        inputSchema: z.object({
          type: z.enum(['bar', 'line', 'area', 'pie']).describe('Тип графика'),
          title: z.string().describe('Заголовок графика'),
          data: z
            .array(
              z.object({
                name: z.string().describe('Метка по оси X (или сегмент для pie)'),
                value: z.number().describe('Значение'),
              })
            )
            .min(1)
            .max(20)
            .describe('Точки данных, до 20 элементов'),
          unit: z
            .string()
            .optional()
            .describe('Единица измерения для подписи (шт, $, км и т.п.)'),
          color: z
            .enum(['indigo', 'emerald', 'amber', 'rose', 'sky', 'violet'])
            .optional()
            .default('indigo')
            .describe('Цветовая схема'),
        }),
        execute: async (args) => args,
      }),
    },
  })

  return result.toUIMessageStreamResponse()
}
