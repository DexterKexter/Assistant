// Shared by the server (classifier) and the CRM UI. No server-only imports here.
export const CHAT_CATEGORIES = {
  lead: { label: 'Новая перевозка', className: 'bg-emerald-50 text-emerald-700' },
  status: { label: 'Вопрос по статусу', className: 'bg-indigo-50 text-indigo-700' },
  partner: { label: 'Партнёр', className: 'bg-sky-50 text-sky-700' },
  spam: { label: 'Не по теме', className: 'bg-slate-100 text-slate-500' },
  other: { label: 'Другое', className: 'bg-slate-100 text-slate-600' },
} as const
export type ChatCategory = keyof typeof CHAT_CATEGORIES

// The model's reply is untrusted text: accept only a known category and a short summary.
export function parseClassification(raw: string): { category: ChatCategory; summary: string } | null {
  try {
    const json = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    if (!(json.category in CHAT_CATEGORIES)) return null
    return { category: json.category, summary: String(json.summary ?? '').trim().slice(0, 300) }
  } catch {
    return null
  }
}
