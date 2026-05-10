import { streamText, tool, convertToModelMessages, stepCountIs, embed, type UIMessage } from 'ai'
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

ВАЖНО — РАБОТА С ПОЛНОЙ БАЗОЙ:
Все tools работают по ВСЕЙ базе (с пагинацией внутри), не только по последним N записям. Используй правильные tools:

1. Вопросы про общую картину/структуру/распределение → db_overview (один вызов даёт всё: счётчики таблиц, статусы, распределение по годам/месяцам).
2. "Сколько перевозок где-то?" → count_shipments (быстрее search_shipments, не возвращает строки).
3. Топ-направления, аналитика маршрутов → top_routes (по всей базе).
4. Финансы за период → finance_summary (по всей базе).
5. Список перевозчиков с активностью → list_carriers.
6. Поиск конкретных строк (детали, контейнеры, клиенты) → search_shipments или list_clients. Эти tools возвращают count (всего по фильтрам) и returned (показано). Если показано меньше чем total — ОБЯЗАТЕЛЬНО упомяни total и предложи уточнить запрос.

ПРАВИЛО: если пользователь спрашивает "сколько X" — НЕ запрашивай строки через search_shipments, используй count_shipments или get_stats/db_overview. Это в 10 раз быстрее и точнее.

ПОИСК — три уровня, выбирай по смыслу запроса:

1. ТОЧНЫЕ ПОЛЯ + НЕЧЁТКОСТЬ (pg_trgm) → search_shipments / count_shipments / smart_search
   Когда: запрос про конкретные имена, номера, маршруты ("перевозки клиента Стеклинев", "контейнер MSKU1234567", "грузы в Алмаату").
   Опечатки, частичные слова, разный регистр обрабатываются автоматически.

2. СМЫСЛОВОЙ ПОИСК (embeddings via semantic_search) →
   Когда: запрос про СУТЬ, а не точные слова ("дорогие перевозки", "контейнеры с электроникой",
   "недавние отправки", "что-то похожее на этот груз", "проблемные контейнеры").
   Понимает синонимы и концепции — не нужны точные слова из базы.

3. АГРЕГАТЫ → db_overview / count_shipments / top_routes / finance_summary
   Когда: нужны цифры/распределения по всей базе.

Стратегия: если первый поиск дал 0 результатов — попробуй другой уровень. Не сдавайся на первом fail.

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

      db_overview: tool({
        description:
          'Полный обзор базы: счётчики ВСЕХ таблиц (shipments, clients, carriers, senders), распределение перевозок ' +
          'по статусам, по странам клиентов (РФ/КЗ), по годам и месяцам. Считает по ВСЕЙ базе через count/aggregations. ' +
          'ВСЕГДА используй этот tool первым когда вопрос про общую картину, статистику, структуру базы.',
        inputSchema: z.object({}),
        execute: async () => {
          const [
            shipTotal, ru, kz, carriersC, clientsC, sendersC, recipsC,
            inTransit, atBorder, delivered, loading,
          ] = await Promise.all([
            supabase.from('shipments').select('id', { count: 'exact', head: true }),
            supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_russia', true),
            supabase.from('clients').select('id', { count: 'exact', head: true }).eq('is_russia', false),
            supabase.from('carriers').select('id', { count: 'exact', head: true }),
            supabase.from('clients').select('id', { count: 'exact', head: true }),
            supabase.from('senders').select('id', { count: 'exact', head: true }),
            supabase.from('recipients').select('id', { count: 'exact', head: true }),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).or('is_completed.eq.true,delivery_date.not.is.null'),
            supabase.from('shipments').select('id', { count: 'exact', head: true }).is('departure_date', null).eq('is_completed', false),
          ])

          // By year (paginated full scan)
          const all: { departure_date: string | null }[] = []
          for (let page = 0; page < 20; page++) {
            const { data } = await supabase.from('shipments').select('departure_date').range(page * 1000, page * 1000 + 999)
            if (!data || data.length === 0) break
            all.push(...data)
            if (data.length < 1000) break
          }
          const byYear: Record<string, number> = {}
          const byMonth: Record<string, number> = {}
          for (const r of all) {
            const d = r.departure_date
            if (!d) { byYear['—'] = (byYear['—'] || 0) + 1; continue }
            const y = d.slice(0, 4)
            const ym = d.slice(0, 7)
            byYear[y] = (byYear[y] || 0) + 1
            byMonth[ym] = (byMonth[ym] || 0) + 1
          }

          return {
            tables: {
              shipments: shipTotal.count ?? 0,
              clients: clientsC.count ?? 0,
              clients_russia: ru.count ?? 0,
              clients_kazakhstan: kz.count ?? 0,
              carriers: carriersC.count ?? 0,
              senders: sendersC.count ?? 0,
              recipients: recipsC.count ?? 0,
            },
            shipments_by_status: {
              loading: loading.count ?? 0,
              in_transit: inTransit.count ?? 0,
              at_border: atBorder.count ?? 0,
              delivered: delivered.count ?? 0,
            },
            shipments_by_year: byYear,
            shipments_by_month: Object.fromEntries(
              Object.entries(byMonth).sort((a, b) => a[0].localeCompare(b[0])),
            ),
          }
        },
      }),

      count_shipments: tool({
        description:
          'Точное количество перевозок по фильтрам по ВСЕЙ базе. Используй когда нужна цифра, не сами строки. ' +
          'Дешевле и быстрее чем search_shipments если строки не нужны.',
        inputSchema: z.object({
          status: z.enum(['loading', 'in_transit', 'at_border', 'delivered']).optional(),
          client_name: z.string().optional(),
          carrier_name: z.string().optional(),
          origin: z.string().optional(),
          destination: z.string().optional(),
          from_date: z.string().optional().describe('YYYY-MM-DD'),
          to_date: z.string().optional().describe('YYYY-MM-DD'),
          is_russia: z.boolean().optional(),
        }),
        execute: async (args) => {
          // Top-1 если sim >= 0.7, иначе все кандидаты — чтобы не складывать перевозки
          // нескольких одноимённых клиентов когда есть явный лидер.
          let clientIds: string[] | null = null
          let resolvedClient: string | null = null
          if (args.client_name) {
            const { data } = await supabase.rpc('fuzzy_find_clients', { q: args.client_name, lim: 50 })
            const arr = (data || []) as any[]
            if (arr.length === 0) return { count: 0, note: `Клиент "${args.client_name}" не найден` }
            if (arr[0].sim >= 0.7) { clientIds = [arr[0].id]; resolvedClient = arr[0].name }
            else clientIds = arr.map((r) => r.id)
          }
          let carrierIds: string[] | null = null
          let resolvedCarrier: string | null = null
          if (args.carrier_name) {
            const { data } = await supabase.rpc('fuzzy_find_carriers', { q: args.carrier_name, lim: 50 })
            const arr = (data || []) as any[]
            if (arr.length === 0) return { count: 0, note: `Перевозчик "${args.carrier_name}" не найден` }
            if (arr[0].sim >= 0.7) { carrierIds = [arr[0].id]; resolvedCarrier = arr[0].name }
            else carrierIds = arr.map((r) => r.id)
          }
          let russiaClientIds: string[] | null = null
          if (args.is_russia !== undefined) {
            const { data } = await supabase.from('clients').select('id').eq('is_russia', args.is_russia).limit(1000)
            russiaClientIds = (data || []).map((r) => r.id)
            if (russiaClientIds.length === 0) return { count: 0 }
          }

          let q = supabase.from('shipments').select('id', { count: 'exact', head: true })
          if (args.status === 'loading') q = q.is('departure_date', null).eq('is_completed', false)
          if (args.status === 'in_transit') q = q.not('departure_date', 'is', null).is('arrival_date', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'at_border') q = q.not('arrival_date', 'is', null).is('delivery_date', null).eq('is_completed', false)
          if (args.status === 'delivered') q = q.or('is_completed.eq.true,delivery_date.not.is.null')
          if (args.origin) q = q.ilike('origin', `%${args.origin}%`)
          if (args.destination) q = q.or(`destination_city.ilike.%${args.destination}%,destination_station.ilike.%${args.destination}%`)
          if (args.from_date) q = q.gte('departure_date', args.from_date)
          if (args.to_date) q = q.lte('departure_date', args.to_date)
          if (clientIds) q = q.in('client_id', clientIds)
          if (carrierIds) q = q.in('carrier_id', carrierIds)
          if (russiaClientIds) q = q.in('client_id', russiaClientIds)

          const { count, error } = await q
          if (error) return { error: error.message }
          return {
            count: count ?? 0,
            ...(resolvedClient ? { resolved_client: resolvedClient } : {}),
            ...(resolvedCarrier ? { resolved_carrier: resolvedCarrier } : {}),
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
          // Если top-кандидат уверенный (sim >= 0.7) — берём только его, чтобы не складывать
          // перевозки нескольких похожих клиентов в одну выборку.
          let clientIds: string[] | null = null
          let resolvedClient: string | null = null
          if (args.client_name) {
            const { data } = await supabase.rpc('fuzzy_find_clients', { q: args.client_name, lim: 20 })
            const arr = (data || []) as any[]
            if (arr.length === 0) return { count: 0, shipments: [], note: `Клиент "${args.client_name}" не найден` }
            const top = arr[0]
            if (top.sim >= 0.7) {
              clientIds = [top.id]
              resolvedClient = top.name
            } else {
              clientIds = arr.map((r) => r.id)
            }
          }
          let carrierIds: string[] | null = null
          let resolvedCarrier: string | null = null
          if (args.carrier_name) {
            const { data } = await supabase.rpc('fuzzy_find_carriers', { q: args.carrier_name, lim: 20 })
            const arr = (data || []) as any[]
            if (arr.length === 0) return { count: 0, shipments: [], note: `Перевозчик "${args.carrier_name}" не найден` }
            const top = arr[0]
            if (top.sim >= 0.7) {
              carrierIds = [top.id]
              resolvedCarrier = top.name
            } else {
              carrierIds = arr.map((r) => r.id)
            }
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
            ...(resolvedClient ? { resolved_client: resolvedClient } : {}),
            ...(resolvedCarrier ? { resolved_carrier: resolvedCarrier } : {}),
            ...(count && data && count > data.length
              ? { note: `Всего по фильтрам: ${count}. Показано: ${data.length}. Уточни запрос или увеличь limit (макс 200).` }
              : {}),
          }
        },
      }),

      semantic_search: tool({
        description:
          'Семантический поиск по СМЫСЛУ через эмбеддинги (pgvector + OpenAI). ' +
          'Используй для запросов где важна суть, а не точное совпадение слов: ' +
          '"перевозки с дорогим грузом", "контейнеры с электроникой", "недавние отправки в РФ", ' +
          '"что-то похожее на этот контейнер". Возвращает топ-N релевантных по cosine similarity. ' +
          'Если запрос про конкретные имена/номера — лучше используй smart_search или search_shipments.',
        inputSchema: z.object({
          query: z.string().describe('Свободный смысловой запрос на русском'),
          limit: z.number().int().min(1).max(50).optional().default(15),
          min_similarity: z.number().min(0).max(1).optional().default(0.3).describe('Минимальная релевантность 0..1'),
        }),
        execute: async ({ query, limit, min_similarity }) => {
          // 1. Получить эмбеддинг запроса
          let queryEmbedding: number[]
          try {
            const { embedding } = await embed({
              model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
              value: query,
            })
            queryEmbedding = embedding
          } catch (e: any) {
            return { error: `Не удалось получить эмбеддинг: ${e?.message || e}` }
          }

          // 2. Передать в RPC
          const { data, error } = await supabase.rpc('semantic_search_shipments', {
            query_embedding: queryEmbedding,
            match_threshold: min_similarity ?? 0.3,
            match_count: limit ?? 15,
          })
          if (error) return { error: error.message }
          if (!data?.length) return { count: 0, results: [], note: `Нет перевозок семантически близких к "${query}". Попробуй смягчить запрос или используй smart_search/search_shipments.` }

          // 3. Обогатить клиентами/перевозчиками
          const clientIds = [...new Set(data.map((r: any) => r.client_id).filter(Boolean))]
          const carrierIds = [...new Set(data.map((r: any) => r.carrier_id).filter(Boolean))]
          const [clientsRes, carriersRes] = await Promise.all([
            clientIds.length ? supabase.from('clients').select('id, name, is_russia').in('id', clientIds) : Promise.resolve({ data: [] } as any),
            carrierIds.length ? supabase.from('carriers').select('id, name').in('id', carrierIds) : Promise.resolve({ data: [] } as any),
          ])
          const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))
          const carrierMap = new Map((carriersRes.data || []).map((c: any) => [c.id, c]))

          const results = data.map((r: any) => ({
            id: r.id,
            container_number: r.container_number,
            origin: r.origin,
            destination_city: r.destination_city,
            destination_station: r.destination_station,
            departure_date: r.departure_date,
            is_completed: r.is_completed,
            cargo_description: r.cargo_description,
            sender_name: r.sender_name,
            price: r.price,
            client: r.client_id ? clientMap.get(r.client_id) : null,
            carrier: r.carrier_id ? carrierMap.get(r.carrier_id) : null,
            relevance: Math.round(r.similarity * 100) / 100,
          }))
          return { count: results.length, results }
        },
      }),

      smart_search: tool({
        description:
          'Универсальный нечёткий поиск перевозок по СВОБОДНОМУ ТЕКСТУ (триграммы pg_trgm). ' +
          'Понимает опечатки, частичные слова, разный регистр. Ищет одновременно по: container_number, ' +
          'origin, destination_city/station, cargo_description, notes, sender_name. Используй когда ' +
          'пользователь ввёл размытый запрос ("перевозки в москау", "груз бытовой техники", "лора"). ' +
          'Возвращает топ-N результатов с similarity score (sim).',
        inputSchema: z.object({
          query: z.string().describe('Свободный текст для поиска'),
          limit: z.number().int().min(1).max(100).optional().default(20),
        }),
        execute: async ({ query, limit }) => {
          const { data, error } = await supabase.rpc('fuzzy_find_shipments', { q: query, lim: limit ?? 20 })
          if (error) return { error: error.message }
          if (!data?.length) return { count: 0, results: [], note: `По запросу "${query}" ничего не найдено даже с нечётким поиском` }

          // Обогащаем joined данными клиента/перевозчика
          const clientIds = [...new Set(data.map((r: any) => r.client_id).filter(Boolean))]
          const carrierIds = [...new Set(data.map((r: any) => r.carrier_id).filter(Boolean))]
          const [clientsRes, carriersRes] = await Promise.all([
            clientIds.length ? supabase.from('clients').select('id, name, is_russia').in('id', clientIds) : Promise.resolve({ data: [] } as any),
            carrierIds.length ? supabase.from('carriers').select('id, name').in('id', carrierIds) : Promise.resolve({ data: [] } as any),
          ])
          const clientMap = new Map((clientsRes.data || []).map((c: any) => [c.id, c]))
          const carrierMap = new Map((carriersRes.data || []).map((c: any) => [c.id, c]))

          const results = data.map((r: any) => ({
            id: r.id,
            container_number: r.container_number,
            origin: r.origin,
            destination_city: r.destination_city,
            destination_station: r.destination_station,
            departure_date: r.departure_date,
            is_completed: r.is_completed,
            cargo_description: r.cargo_description,
            sender_name: r.sender_name,
            client: r.client_id ? clientMap.get(r.client_id) : null,
            carrier: r.carrier_id ? carrierMap.get(r.carrier_id) : null,
            match_score: Math.round(r.sim * 100) / 100,
          }))
          return { count: results.length, results }
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
          // Resolve client (fuzzy via pg_trgm)
          let client_id: string | null = null
          if (args.client_name) {
            const { data: clients } = await supabase.rpc('fuzzy_find_clients', { q: args.client_name, lim: 5 })
            if (!clients?.length) {
              return { error: `Клиент "${args.client_name}" не найден (даже с нечётким поиском). Создай через create_client или уточни.` }
            }
            // Если best score >= 0.7 — берём как точное совпадение, иначе уточнить
            const top = clients[0] as any
            if (top.sim >= 0.7 || clients.length === 1) {
              client_id = top.id
            } else {
              return { error: `Несколько похожих клиентов: ${clients.map((c: any) => `${c.name} (${(c.sim * 100).toFixed(0)}%)`).join(', ')}. Уточни.` }
            }
          }
          // Resolve carrier (fuzzy)
          let carrier_id: string | null = null
          if (args.carrier_name) {
            const { data: carriers } = await supabase.rpc('fuzzy_find_carriers', { q: args.carrier_name, lim: 5 })
            if (!carriers?.length) {
              return { error: `Перевозчик "${args.carrier_name}" не найден. Создай через create_carrier или уточни.` }
            }
            const top = carriers[0] as any
            if (top.sim >= 0.7 || carriers.length === 1) {
              carrier_id = top.id
            } else {
              return { error: `Несколько похожих перевозчиков: ${carriers.map((c: any) => `${c.name} (${(c.sim * 100).toFixed(0)}%)`).join(', ')}. Уточни.` }
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
