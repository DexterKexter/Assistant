import { generateText, stepCountIs, tool, type ModelMessage } from 'ai'
import { z } from 'zod'
import type { SupabaseClient } from '@supabase/supabase-js'
import { openrouter } from '@/lib/agent-tools'

/**
 * Telegram assistant for admins/managers: the model writes its own SELECTs (execute_readonly_sql)
 * with the whole schema in the prompt, instead of picking from fixed tools.
 * Runs as the service role, so the webhook must check the asker's role first.
 */

const MODEL = 'anthropic/claude-sonnet-5.5'

export type Turn = { role: 'user' | 'assistant'; content: string }
export type FileOut = { name: string; bytes: Uint8Array }

const SCHEMA_SQL =
  "select table_name, string_agg(column_name || ' ' || data_type, ', ' order by ordinal_position) cols from information_schema.columns " +
  "where table_schema = 'public' and column_name not in ('embedding', 'embedding_text') group by table_name order by table_name"

// Live reference values, so "Алтынколь" or "FOB" land in the right column straight away.
const DICT_SQL = [
  "select (select string_agg(name, ' | ' order by name) from carriers) carriers,",
  "(select string_agg(distinct destination_station, ' | ') from shipments) stations,",
  "(select string_agg(distinct container_type, ' | ') from shipments) container_types,",
  "(select string_agg(v, ' | ') from (select origin v from shipments where origin is not null group by 1 order by count(*) desc limit 25) x) origins,",
  "(select string_agg(v, ' | ') from (select destination_city v from shipments where destination_city is not null group by 1 order by count(*) desc limit 25) x) cities",
].join(' ')

const PLAYBOOK = [
  'Статус перевозки (считай в SQL через case):',
  '• delivery_date is not null или is_completed → «Доставлен»',
  '• arrival_date is not null и clients.is_russia → «Транзит КЗ»; arrival_date и клиент из КЗ → «На границе»',
  '• departure_date is not null → «В пути»; иначе → «Загрузка»',
  'Даты: loading_date/departure_date — загрузка и отправка, arrival_date — прибытие на границу КЗ, delivery_date — доставка клиенту.',
  '',
  'Методики (считай SQL-ом, в ответе — вывод и цифры, без формул):',
  '• Сроки: дни в пути = arrival_date - departure_date, до клиента = delivery_date - departure_date; среднее и медиана по перевозчику, маршруту, месяцу.',
  '• Зависшие: в пути дольше обычного для этого маршрута, или стоят на границе больше 7 дней без delivery_date — назови контейнеры.',
  '• Перевозчики: сколько контейнеров сейчас в работе, сколько за период, средний срок, доля от всех.',
  '• Клиенты: топ по числу контейнеров и по сумме, РФ против КЗ, кто перестал возить (был в прошлом периоде, нет в этом).',
  '• Маршруты: origin → destination_city через destination_station; объёмы и сроки по месяцам.',
  '• Деньги: поля shipments price, delivery_cost, invoice_amount, client_payment, customs_cost, additional_cost и таблица transactions.',
  '  Считая выручку, расходы или прибыль, одной строкой скажи, какие поля взял — трактовку директор должен видеть.',
  '• Заявки на груз: cargo_requests (статус, перевозчик carrier_id, принял ли перевозчик — carrier_accepted_at) и cargo_request_replies.',
  '• Переписка с перевозчиками в Telegram: telegram_messages (chat_id = carriers.telegram_chat_id); переписка с клиентами: crm_chats, crm_messages.',
  '• Сравнение периодов: абсолютная разница и %, назови, что дало основное изменение.',
  'На «как дела / что важного» — короткая сводка: сколько в загрузке, в пути, на границе, доставлено за месяц, что зависло, новые заявки.',
  'Где уместно, в конце дай один практический вывод. Если данных мало для вывода — так и скажи.',
].join('\n')

const TELEGRAM_STYLE = [
  'Ответ уходит в личку Telegram, читают с телефона. Пиши как короткую сводку, а не одну строку:',
  '• первая строка — эмодзи и суть с главной цифрой жирным: «🚛 В пути сейчас **47 контейнеров**, из них 12 у FOB»;',
  '• дальше блоки по 2–6 строк через пустую строку: заголовок блока жирным с эмодзи («📅 **По месяцам**»), строки — «▫️ октябрь — **31** (ср. срок 24 дн.)»;',
  '• крупное сверху, до 10 строк в блоке, хвост — «прочее»; контейнеры называй номером (MSKU1234567);',
  '• даты — дд.мм.гггг и 📅, деньги — 💰, рост — 📈, падение — 📉, важное — ⚠️; последней строкой — вывод с 💡, если он есть;',
  '• суммы с пробелами между разрядами и валютой; жирным (**…**) только главные цифры и заголовки;',
  '• никаких ссылок, таблиц, # и звёздочек в начале строк.',
  'Графиков в Telegram нет: динамику дай строками. Просят список, выгрузку или отчёт файлом — инструмент file, в тексте только что в нём.',
].join('\n')

async function run(db: SupabaseClient, query: string): Promise<Record<string, unknown>[]> {
  // The service role can read more than the business tables; keep the model inside public.
  if (/\b(auth|vault|storage|pg_catalog|supabase_\w+)\s*\./i.test(query)) throw new Error('Доступна только схема public')
  const { data, error } = await db.rpc('execute_readonly_sql', { query })
  if (error) throw new Error(error.message)
  return (data ?? []) as Record<string, unknown>[]
}

// ponytail: CSV instead of real XLSX/PDF — ";" and a BOM so Excel opens Cyrillic in columns. Port a PDF builder if reports need charts.
function csv(rows: Record<string, unknown>[]) {
  const cols = Object.keys(rows[0] ?? {})
  const cell = (v: unknown) => `"${(v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)).replace(/"/g, '""')}"`
  return '﻿' + [cols, ...rows.map(r => cols.map(c => r[c]))].map(line => line.map(cell).join(';')).join('\r\n')
}

export async function ask(db: SupabaseClient, asker: { full_name: string | null; role: string }, turns: Turn[]) {
  const [cols, dict] = await Promise.all([run(db, SCHEMA_SQL), run(db, DICT_SQL)])
  const schema = (cols as { table_name: string; cols: string }[]).map(r => `${r.table_name}(${r.cols})`).join('\n')
  const d = (dict[0] ?? {}) as Record<string, string | null>
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Almaty' }).format(new Date())

  const system = [
    `Ты ассистент логистической компании STI Logistics (контейнерные перевозки из Дубая и Китая в Казахстан и Россию). Сегодня ${today}, часовой пояс Asia/Almaty.`,
    `Спрашивает ${asker.full_name ?? 'сотрудник'}, роль ${asker.role}.`,
    'У тебя есть инструмент sql — доступ на чтение ко всей базе: перевозки (shipments), клиенты, перевозчики, отправители, получатели,',
    'заявки на груз, финансы (transactions, prices), задачи, документы, переписка. Данные бери только запросами, ничего не выдумывай.',
    'Агрегируй в SQL (count, sum, avg, group by), а не тащи сырые строки. Если запрос упал — исправь и повтори. Изменять данные нельзя.',
    'Не пересказывай свои запросы, если не просят.',
    '',
    TELEGRAM_STYLE,
    '',
    PLAYBOOK,
    '',
    'Слова → колонки (значения — как в базе сейчас; имена ищи через ilike, в них бывают опечатки):',
    `• перевозчик: shipments.carrier_id → carriers.name: ${d.carriers ?? '—'}`,
    `• погранпереход: shipments.destination_station: ${d.stations ?? '—'}`,
    `• тип контейнера: shipments.container_type: ${d.container_types ?? '—'}; размер — container_size (20/40)`,
    `• откуда: shipments.origin: ${d.origins ?? '—'}`,
    `• куда: shipments.destination_city: ${d.cities ?? '—'}`,
    '• клиент: shipments.client_id → clients.name; РФ или КЗ — clients.is_russia',
    'Если условие можно понять двояко, посчитай очевидное и одной строкой скажи, как понял.',
    '',
    'Схема public:',
    schema,
  ].join('\n')

  const files: FileOut[] = []
  const { text } = await generateText({
    model: openrouter.chat(MODEL),
    system,
    messages: turns.slice(-20).map((t): ModelMessage => ({ role: t.role, content: t.content.slice(0, 8000) })),
    // ponytail: 10 rounds is the ceiling; past that the model is usually going in circles.
    stopWhen: stepCountIs(10),
    tools: {
      sql: tool({
        description: 'Выполнить один SELECT (PostgreSQL) к базе. Вернёт строки JSON. Агрегируй в SQL и ставь LIMIT — длинный ответ обрежется.',
        inputSchema: z.object({ query: z.string().describe('один SELECT или WITH … SELECT, без ;') }),
        execute: async ({ query }) => {
          try {
            return JSON.stringify(await run(db, query)).slice(0, 60000)
          } catch (e) {
            return `Ошибка: ${(e as Error).message}`
          }
        },
      }),
      file: tool({
        description: 'Сделать файл-выгрузку (CSV, открывается в Excel) — он придёт отдельным сообщением под ответом. Таблица из твоего SELECT, до 5000 строк. Колонки называй по-русски алиасами (as "Контейнер").',
        inputSchema: z.object({
          title: z.string().describe('имя файла, например «Контейнеры в пути — ноябрь 2026»'),
          query: z.string().describe('один SELECT с ORDER BY'),
        }),
        execute: async ({ title, query }) => {
          try {
            const rows = (await run(db, query)).slice(0, 5000)
            if (!rows.length) return 'Запрос вернул 0 строк — файл не создан.'
            files.push({ name: `${title.replace(/[\\/:*?"<>|]/g, ' ').trim()}.csv`, bytes: new TextEncoder().encode(csv(rows)) })
            return `Файл готов: ${rows.length} строк. Он придёт под ответом сам — не пиши на него ссылок.`
          } catch (e) {
            return `Ошибка: ${(e as Error).message}`
          }
        },
      }),
    },
  })
  return { answer: text.trim() || 'Не смог ответить — переформулируй вопрос.', files }
}

/** Model's **bold** → Telegram HTML, split into messages under Telegram's 4096-char cap at paragraph breaks. */
export function telegramHtml(text: string): string[] {
  const html = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
  const parts: string[] = []
  for (const block of html.split(/\n{2,}/)) {
    const last = parts.at(-1)
    if (last !== undefined && last.length + block.length + 2 <= 3800) parts[parts.length - 1] = `${last}\n\n${block}`
    // ponytail: a single block over 3800 chars is hard-cut and may split a <b> tag; Telegram then rejects it and we resend as plain text.
    else for (let i = 0; i < block.length; i += 3800) parts.push(block.slice(i, i + 3800))
  }
  return parts
}
