export const CARGO_STATUSES = {
  draft: { label: 'Черновик', className: 'bg-slate-100 text-slate-600' },
  waiting: { label: 'Ожидаем данные', className: 'bg-sky-50 text-sky-700' },
  submitted: { label: 'На проверке', className: 'bg-amber-50 text-amber-800' },
  changes_requested: { label: 'Нужны исправления', className: 'bg-rose-50 text-rose-700' },
  accepted: { label: 'Принято', className: 'bg-emerald-50 text-emerald-700' },
} as const

export interface CargoItem {
  id: string
  name: string
  quantity: number
  unit: string
  packages: number | null
  weight_kg: number | null
  volume_m3: number | null
  notes: string
  position: number
}

export interface CargoRequest {
  id: string
  request_number: number
  client_name: string
  phone: string
  container_number: string | null
  container_size: number
  origin: string
  destination: string
  loading_date: string | null
  supplier: string | null
  status: keyof typeof CARGO_STATUSES
  notes: string
  review_note: string
  is_demo: boolean
  created_at: string
  cargo_request_items: CargoItem[]
  carrier_message_id?: number | null
  carrier_accepted_at?: string | null
  carrier_accepted_by?: string | null
  cargo_request_replies?: { id: string; author: string; text: string; created_at: string }[]
}

// ponytail: border crossings hardcoded in English (the carrier message is in English); move to reference_items if the list grows.
export const VIA_OPTIONS = ['Aktau', 'Altynkol', 'Nurly Zholy', 'Dostyk', 'Kalzhat', 'Temir-Baba', 'Konysbayev']

// What the bot posts to the carrier's Telegram group; also the live preview in the new-request form.
// No client name/phone: those stay inside STI Logistics.
export function carrierRequestText(r: {
  request_number?: number; container_size: number; container_owner?: string | null; weight_kg?: number | string | null
  yard?: string | null; loading_date?: string | null; via?: string | null; shipper_phone?: string | null; maps_url?: string | null
}): string {
  return [
    `🚛 STI Logistics${r.request_number ? ` — request #${r.request_number.toString().padStart(4, '0')}` : ''}`,
    `📦 Pls provide 1x${r.container_size === 20 ? '20DC' : r.container_size === 45 ? '45HQ' : '40HQ'}${r.container_owner ? ` · ${r.container_owner}` : ''}`,
    r.weight_kg && `⚖️ ${r.weight_kg} KG`,
    r.yard && `📍 ${r.yard} yard`,
    r.maps_url && `🗺 ${r.maps_url}`,
    // Date-only strings parse as UTC; format in UTC so the day never shifts.
    r.loading_date && `📅 ${new Date(r.loading_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', timeZone: 'UTC' })}`,
    r.via && `🛣 via ${r.via}`,
    r.shipper_phone && `📞 Shipper: ${r.shipper_phone} — time to be agreed with shipper`,
    '',
    '✅ Press “Accepted” to confirm. ↩️ Questions — reply to this message.',
  ].filter(line => typeof line === 'string').join('\n')
}

export function cargoContactError(value: { client_name: string; phone: string; container_number: string }, complete = false): string | null {
  if (!value.client_name.trim() || value.client_name.trim().length > 120) return 'Укажите имя клиента — до 120 символов.'
  const digits = value.phone.replace(/\D/g, '')
  if (value.phone.length > 40 || (complete && (!/^\+?[\d\s()-]+$/.test(value.phone) || digits.length < 7 || digits.length > 15))) return 'Укажите контактный телефон с кодом страны.'
  if ((complete || value.container_number) && !/^[A-Z]{4}[0-9]{7}$/.test(value.container_number)) return 'Номер контейнера: 4 латинские буквы и 7 цифр.'
  return null
}

export function cargoItemError(item: { name: string; quantity: number; packages: number | null; weight_kg: number | null; volume_m3: number | null }): string | null {
  if (!item.name.trim() || item.name.trim().length > 160) return 'Укажите название товара — до 160 символов.'
  if (!Number.isFinite(item.quantity) || item.quantity <= 0) return 'Количество должно быть больше нуля.'
  if (item.packages !== null && (!Number.isInteger(item.packages) || item.packages < 0)) return 'Количество мест должно быть целым неотрицательным числом.'
  if ([item.weight_kg,item.volume_m3].some(n => n !== null && (!Number.isFinite(n) || n < 0))) return 'Вес и объём не могут быть отрицательными.'
  return null
}

export function cargoFileError(file: { type: string; size: number }, photosOnly = false): string | null {
  const images = ['image/jpeg', 'image/png', 'image/webp']
  const documents = ['application/pdf','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
  if (![...images, ...(photosOnly ? [] : documents)].includes(file.type)) return photosOnly ? 'Добавьте фото JPG, PNG или WebP.' : 'Поддерживаются PDF, Excel, JPG, PNG и WebP.'
  if (file.size <= 0 || file.size > 10 * 1024 * 1024) return 'Размер файла — от 1 байта до 10 МБ.'
  return null
}
