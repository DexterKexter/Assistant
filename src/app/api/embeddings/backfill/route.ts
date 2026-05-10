import { embedMany } from 'ai'
import { createOpenRouter } from '@openrouter/ai-sdk-provider'
import { createClient } from '@/lib/supabase/server'

const openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })

export const maxDuration = 60

function fmtDate(d: string | null): string {
  if (!d) return ''
  return d
}

function composeText(s: any): string {
  const parts: string[] = []
  if (s.container_number) parts.push(`Контейнер ${s.container_number}`)
  if (s.container_size) parts.push(`${s.container_size}ft`)
  if (s.container_type) parts.push(s.container_type)
  if (s.origin || s.destination_city || s.destination_station) {
    parts.push(`Маршрут: ${s.origin || '?'} → ${s.destination_city || s.destination_station || '?'}${s.destination_city && s.destination_station ? ` (${s.destination_station})` : ''}`)
  }
  if (s.client?.name) parts.push(`Клиент: ${s.client.name}${s.client.is_russia ? ' (РФ)' : ' (КЗ)'}`)
  if (s.carrier?.name) parts.push(`Перевозчик: ${s.carrier.name}`)
  if (s.sender_name) parts.push(`Отправитель: ${s.sender_name}`)
  if (s.cargo_description) parts.push(`Груз: ${s.cargo_description}`)
  if (s.notes) parts.push(`Заметки: ${s.notes}`)
  if (s.departure_date) parts.push(`Отправлено ${fmtDate(s.departure_date)}`)
  if (s.arrival_date) parts.push(`Прибыло на границу ${fmtDate(s.arrival_date)}`)
  if (s.delivery_date) parts.push(`Доставлено ${fmtDate(s.delivery_date)}`)
  if (s.price) parts.push(`Цена $${s.price}`)
  if (s.delivery_cost) parts.push(`Доставка $${s.delivery_cost}`)
  parts.push(s.is_completed ? 'Завершена' : 'В работе')
  return parts.join('. ')
}

export async function POST(req: Request) {
  const supabase = await createClient()
  const url = new URL(req.url)
  const batchSize = Math.min(Math.max(parseInt(url.searchParams.get('batch') || '100'), 1), 200)

  // Сколько ещё осталось
  const { count: remainingBefore } = await supabase
    .from('shipments').select('id', { count: 'exact', head: true }).is('embedded_at', null)

  if (!remainingBefore) return Response.json({ processed: 0, remaining: 0, message: 'Все перевозки уже эмбеддированы' })

  // Берём батч
  const { data: rows, error } = await supabase
    .from('shipments')
    .select(`
      id, container_number, container_size, container_type, origin,
      destination_city, destination_station, departure_date, arrival_date, delivery_date,
      cargo_description, notes, sender_name, price, delivery_cost, is_completed,
      client:clients(name, is_russia),
      carrier:carriers(name)
    `)
    .is('embedded_at', null)
    .limit(batchSize)

  if (error) return Response.json({ error: error.message }, { status: 500 })
  if (!rows?.length) return Response.json({ processed: 0, remaining: remainingBefore })

  const texts = rows.map(composeText)

  let embeddings: number[][]
  try {
    const res = await embedMany({
      model: openrouter.textEmbeddingModel('openai/text-embedding-3-small'),
      values: texts,
    })
    embeddings = res.embeddings
  } catch (e: any) {
    return Response.json({ error: `embedMany failed: ${e?.message || e}` }, { status: 500 })
  }

  // Обновляем записи последовательно (Supabase UPDATE по одному id; pg-batch через rpc можно сделать позже)
  const now = new Date().toISOString()
  let ok = 0
  for (let i = 0; i < rows.length; i++) {
    const { error: upErr } = await supabase
      .from('shipments')
      .update({
        embedding: embeddings[i] as any,
        embedding_text: texts[i],
        embedded_at: now,
      })
      .eq('id', rows[i].id)
    if (!upErr) ok++
  }

  return Response.json({
    processed: ok,
    failed: rows.length - ok,
    remaining: Math.max(0, (remainingBefore || 0) - ok),
    sample_text: texts[0]?.slice(0, 200),
  })
}
