export type UserRole = 'admin' | 'manager' | 'client'
export type ContainerStatus = 'loading' | 'in_transit' | 'customs' | 'delivered'
export type ContainerType = '20ft' | '40ft' | '40ft_hc'
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

export interface Client {
  id: string
  name: string
  company: string | null
  phone: string | null
  email: string | null
  address: string | null
  contact_person: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Container {
  id: string
  container_number: string
  type: ContainerType
  status: ContainerStatus
  origin: string | null
  destination: string | null
  departure_date: string | null
  arrival_date: string | null
  estimated_arrival: string | null
  client_id: string | null
  notes: string | null
  created_at: string
  updated_at: string
  client?: Client
}

export interface ContainerItem {
  id: string
  container_id: string
  description: string
  quantity: number
  weight: number | null
  volume: number | null
  value: number | null
  created_at: string
}

export interface Transaction {
  id: string
  type: TransactionType
  amount: number
  currency: string
  description: string | null
  category: string | null
  client_id: string | null
  container_id: string | null
  date: string
  created_at: string
  client?: Client
  container?: Container
}

export interface Document {
  id: string
  title: string
  type: DocumentType
  file_url: string | null
  file_name: string | null
  client_id: string | null
  container_id: string | null
  created_by: string | null
  created_at: string
  updated_at: string
  client?: Client
  container?: Container
}

export const STATUS_LABELS: Record<ContainerStatus, string> = {
  loading: 'Загрузка',
  in_transit: 'В пути',
  customs: 'Таможня',
  delivered: 'Доставлен',
}

export const TYPE_LABELS: Record<ContainerType, string> = {
  '20ft': '20 футов',
  '40ft': '40 футов',
  '40ft_hc': '40 футов HC',
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  invoice: 'Счёт',
  bill_of_lading: 'Коносамент',
  customs_declaration: 'Таможенная декларация',
  contract: 'Договор',
  other: 'Прочее',
}

export const TRANSACTION_CATEGORIES = [
  'Доставка',
  'Таможня',
  'Хранение',
  'Страхование',
  'Погрузка/разгрузка',
  'Оплата от клиента',
  'Прочее',
]
