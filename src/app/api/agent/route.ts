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
После графика дай короткое 1-2-предложений резюме что видно на нём.`

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
        description: 'Поиск перевозок по фильтрам: статус, клиент, перевозчик, направление, период дат. Возвращает первые 20 результатов.',
        inputSchema: z.object({
          status: z.enum(['loading', 'in_transit', 'at_border', 'delivered']).optional().describe('Статус перевозки'),
          client_name: z.string().optional().describe('Часть имени клиента'),
          carrier_name: z.string().optional().describe('Часть имени перевозчика'),
          origin: z.string().optional().describe('Откуда (часть названия)'),
          destination: z.string().optional().describe('Город или станция назначения (часть названия)'),
          container_number: z.string().optional().describe('Часть номера контейнера'),
          from_date: z.string().optional().describe('Дата отправления от (YYYY-MM-DD)'),
          to_date: z.string().optional().describe('Дата отправления до (YYYY-MM-DD)'),
          limit: z.number().optional().default(20),
        }),
        execute: async (args) => {
          let q = supabase.from('shipments').select(`
            id, container_number, container_size, container_type,
            origin, destination_city, destination_station,
            departure_date, arrival_date, delivery_date, is_completed,
            sender_name, price, delivery_cost,
            client:clients(id, name, is_russia),
            carrier:carriers(id, name)
          `).order('departure_date', { ascending: false }).limit(args.limit ?? 20)

          if (args.status === 'loading') q = q.is('departure_date', null).eq('is_completed', false)
          if (args.status === 'in_transit') q = q.not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'at_border') q = q.not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'delivered') q = q.or('is_completed.eq.true,delivery_date.not.is.null')
          if (args.container_number) q = q.ilike('container_number', `%${args.container_number}%`)
          if (args.origin) q = q.ilike('origin', `%${args.origin}%`)
          if (args.destination) q = q.or(`destination_city.ilike.%${args.destination}%,destination_station.ilike.%${args.destination}%`)
          if (args.from_date) q = q.gte('departure_date', args.from_date)
          if (args.to_date) q = q.lte('departure_date', args.to_date)

          const { data, error } = await q
          if (error) return { error: error.message }
          let rows = data || []
          if (args.client_name) {
            const needle = args.client_name.toLowerCase()
            rows = rows.filter((r: any) => r.client?.name?.toLowerCase().includes(needle))
          }
          if (args.carrier_name) {
            const needle = args.carrier_name.toLowerCase()
            rows = rows.filter((r: any) => r.carrier?.name?.toLowerCase().includes(needle))
          }
          return { count: rows.length, shipments: rows }
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
        description: 'Список клиентов с количеством перевозок',
        inputSchema: z.object({
          search: z.string().optional(),
          is_russia: z.boolean().optional().describe('Только клиенты из РФ'),
          limit: z.number().optional().default(30),
        }),
        execute: async ({ search, is_russia, limit }) => {
          let q = supabase.from('clients').select('id, name, is_russia, phone, address').limit(limit ?? 30)
          if (search) q = q.ilike('name', `%${search}%`)
          if (is_russia !== undefined) q = q.eq('is_russia', is_russia)
          const { data, error } = await q
          if (error) return { error: error.message }
          return { count: data?.length ?? 0, clients: data }
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
        description: 'Финансовая сводка: суммарная выручка, расходы, прибыль за период',
        inputSchema: z.object({
          from_date: z.string().optional().describe('YYYY-MM-DD'),
          to_date: z.string().optional().describe('YYYY-MM-DD'),
        }),
        execute: async ({ from_date, to_date }) => {
          let q = supabase.from('shipments').select('price, delivery_cost, customs_cost, additional_cost, invoice_amount, departure_date')
          if (from_date) q = q.gte('departure_date', from_date)
          if (to_date) q = q.lte('departure_date', to_date)
          const { data, error } = await q
          if (error) return { error: error.message }
          const sum = (k: string) => (data || []).reduce((a: number, r: any) => a + (Number(r[k]) || 0), 0)
          const revenue = sum('price') || sum('invoice_amount')
          const costs = sum('delivery_cost') + sum('customs_cost') + sum('additional_cost')
          return {
            count: data?.length ?? 0,
            revenue,
            costs,
            profit: revenue - costs,
            currency: 'USD',
          }
        },
      }),

      top_routes: tool({
        description: 'Топ направлений: куда едут контейнеры',
        inputSchema: z.object({ limit: z.number().optional().default(10) }),
        execute: async ({ limit }) => {
          const { data } = await supabase.from('shipments').select('origin, destination_city, destination_station')
          const map = new Map<string, number>()
          for (const r of data || []) {
            const key = `${r.origin || '?'} → ${r.destination_city || r.destination_station || '?'}`
            map.set(key, (map.get(key) || 0) + 1)
          }
          return {
            routes: Array.from(map.entries())
              .map(([route, count]) => ({ route, count }))
              .sort((a, b) => b.count - a.count)
              .slice(0, limit ?? 10),
          }
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
