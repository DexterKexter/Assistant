export type UserRole = 'admin' | 'manager' | 'client'
export type TransactionType = 'income' | 'expense'
export type DocumentType = 'invoice' | 'bill_of_lading' | 'customs_declaration' | 'contract' | 'other'

export interface Profile {
  id: string
  role: UserRole
  full_name: string | null
  phone: string | null
  email: string | null
  created_at: string
  updated_at: string
}

export interface Carrier {
  id: string
  glide_row_id: string | null
  name: string
  created_at: string
}

export interface Sender {
  id: string
  glide_row_id: string | null
  name: string
  created_at: string
}

export interface Recipient {
  id: string
  glide_row_id: string | null
  name: string
  created_at: string
}

export interface Client {
  id: string
  glide_row_id: string | null
  name: string
  is_russia: boolean
  address: string | null
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Shipment {
  id: string
  glide_row_id: string | null
  recipient_id: string | null
  client_id: string | null
  sender_id: string | null
  carrier_id: string | null
  container_number: string | null
  container_size: number | null
  container_type: string | null
  cargo_description: string | null
  origin: string | null
  destination_station: string | null
  destination_city: string | null
  departure_date: string | null
  arrival_date: string | null
  delivery_date: string | null
  customs_date: string | null
  release_date: string | null
  delivery_cost: number | null
  price: number | null
  invoice_amount: number | null
  client_payment: number | null
  customs_cost: number | null
  weight_tons: number | null
  days_count: number | null
  additional_cost: number | null
  is_completed: boolean
  excel_files: string[] | null
  photos: string[] | null
  contract_pdf: string | null
  email: string | null
  sender_name: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  recipient?: Recipient
  client?: Client
  sender?: Sender
  carrier?: Carrier
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  description: string | null
  category: string | null
  client_id: string | null
  shipment_id: string | null
  date: string
  created_at: string
  client?: Client
  shipment?: Shipment
}

export interface Document {
  id: string
  title: string
  type: string
  file_url: string | null
  file_name: string | null
  client_id: string | null
  shipment_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  client?: Client
  shipment?: Shipment
}

export function getShipmentStatus(s: Shipment, isRussia?: boolean): { key: string; label: string; color: string } {
  if (s.delivery_date || s.is_completed) return { key: 'delivered', label: 'Доставлен', color: '#22c55e' }
  if (s.arrival_date) {
    if (isRussia) return { key: 'transit_kz', label: 'Транзит КЗ', color: '#f59e0b' }
    return { key: 'border', label: 'На границе', color: '#f59e0b' }
  }
  if (s.departure_date) return { key: 'in_transit', label: 'В пути', color: '#6366f1' }
  return { key: 'loading', label: 'Загрузка', color: '#94a3b8' }
}

export function getShipmentProgress(s: Shipment): number {
  if (s.is_completed || s.delivery_date) return 100
  if (s.release_date) return 90
  if (s.customs_date) return 70
  if (s.arrival_date) return 50
  if (s.departure_date) return 25
  return 5
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Счёт',
  bill_of_lading: 'Коносамент',
  customs_declaration: 'Таможенная декларация',
  contract: 'Договор',
  other: 'Прочее',
}

export const TRANSACTION_CATEGORIES = [
  'Доставка', 'Таможня', 'Хранение', 'Страхование',
  'Погрузка/разгрузка', 'Оплата от клиента', 'Прочее',
]
