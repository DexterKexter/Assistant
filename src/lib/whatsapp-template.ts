// WhatsApp message templates are written here, in code. In the text, {Имя клиента}-style fields are filled
// by the CRM on send; Meta only understands numbered {{1}}, so compileTemplate converts and keeps the order.
export const TEMPLATE_FIELDS = {
  client_name: { label: 'Имя клиента', sample: 'Айдар', needsShipment: false },
  container: { label: 'Номер контейнера', sample: 'MSKU1234567', needsShipment: true },
  status: { label: 'Статус перевозки', sample: 'В пути с 01.11.2026', needsShipment: true },
  route: { label: 'Маршрут', sample: 'Дубай → Алматы', needsShipment: true },
  arrival_date: { label: 'Дата прибытия', sample: '15.11.2026', needsShipment: true },
  city: { label: 'Город доставки', sample: 'Алматы', needsShipment: true },
  days: { label: 'Дней в пути', sample: '21', needsShipment: true },
} as const
export type TemplateField = keyof typeof TEMPLATE_FIELDS

export const TEMPLATE_LANGUAGE = 'ru'

// name is the id in Meta: changing a text means adding a new name (Meta does not let approved text be swapped silently).
// WhatsApp formatting: *жирный*, _курсив_, перенос строки. A text must not start or end with a field.
export const TEMPLATES = [
  { name: 'greeting', title: 'Приветствие',
    text: '👋 Здравствуйте!\n\nЭто *STI Cargo*. Чем можем помочь?' },
  { name: 'contact_request', title: 'Просьба связаться',
    text: '👋 Здравствуйте, *{Имя клиента}*!\n\nЭто *STI Cargo*. Напишите нам, пожалуйста, по поводу вашей перевозки 🙏' },
  { name: 'shipment_status', title: 'Статус перевозки',
    text: '👋 Здравствуйте, *{Имя клиента}*!\n\n📦 Контейнер: *{Номер контейнера}*\n📍 Статус: *{Статус перевозки}*\n⏱ Дней в пути: *{Дней в пути}*\n\nЕсли есть вопросы — напишите нам 💬' },
  { name: 'shipment_departed', title: 'Контейнер отправлен',
    text: '🚢 *Контейнер отправлен*\n\nЗдравствуйте, {Имя клиента}!\n\n📦 Контейнер: *{Номер контейнера}*\n🗺 Маршрут: *{Маршрут}*\n\nСообщим, когда он прибудет на границу ✅' },
  { name: 'shipment_at_border', title: 'Контейнер на границе',
    text: '📍 *Контейнер на границе*\n\nЗдравствуйте, {Имя клиента}!\n\n📦 Контейнер: *{Номер контейнера}*\n📅 Дата прибытия: *{Дата прибытия}*\n⏱ Дней в пути: *{Дней в пути}*\n\nСообщим о дальнейшем движении 🚛' },
  { name: 'shipment_delivered', title: 'Контейнер доставлен',
    text: '✅ *Контейнер доставлен*\n\nЗдравствуйте, {Имя клиента}!\n\n📦 Контейнер: *{Номер контейнера}*\n🏙 Город: *{Город доставки}*\n⏱ Доставка заняла дней: *{Дней в пути}*\n\nСпасибо, что выбрали *STI Cargo* 🤝' },
] as const
export type TemplateName = typeof TEMPLATES[number]['name']

export function compileTemplate(text: string) {
  const fields: TemplateField[] = []
  const body = text.replace(/\{([^{}]*)\}/g, (m, label: string) => {
    const key = (Object.keys(TEMPLATE_FIELDS) as TemplateField[]).find(k => TEMPLATE_FIELDS[k].label === label)
    if (!key) throw new Error(`Unknown template field ${m}`)
    if (!fields.includes(key)) fields.push(key)
    return `{{${fields.indexOf(key) + 1}}}`
  })
  return { body, fields, examples: fields.map(f => TEMPLATE_FIELDS[f].sample) }
}

export const fillTemplate = (body: string, values: string[]) =>
  body.replace(/\{\{(\d+)\}\}/g, (m, n) => values[Number(n) - 1]?.trim() || m)

// What Meta receives when a template is submitted for approval. All ours are UTILITY (service notifications).
export function templatePayload(name: TemplateName) {
  const { body, examples } = compileTemplate(TEMPLATES.find(t => t.name === name)!.text)
  return {
    name, language: TEMPLATE_LANGUAGE, category: 'UTILITY',
    components: [{ type: 'BODY', text: body, ...(examples.length && { example: { body_text: [examples] } }) }],
  }
}
