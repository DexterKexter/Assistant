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
