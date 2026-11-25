import assert from 'node:assert/strict'
import test from 'node:test'
import { shipmentStatusText } from '../src/lib/shipment-status.ts'

const base = { container_number: 'MSKU1234567', origin: 'Дубай', destination_city: 'Алматы', destination_station: 'Алтынколь',
  departure_date: null, arrival_date: null, delivery_date: null, is_completed: false }

test('status text follows Загрузка → В пути → граница/транзит → Доставлен', () => {
  assert.match(shipmentStatusText(base, false), /Статус: Загрузка$/)
  assert.match(shipmentStatusText({ ...base, departure_date: '2026-10-01' }, false), /В пути с 01\.10\.2026/)
  const arrived = { ...base, departure_date: '2026-10-01', arrival_date: '2026-10-15' }
  assert.match(shipmentStatusText(arrived, false), /На границе КЗ, Алтынколь с 15\.10\.2026/)
  assert.match(shipmentStatusText(arrived, true), /Транзит КЗ/)
  assert.match(shipmentStatusText({ ...arrived, is_completed: true }, false), /Статус: Доставлен$/)
  assert.match(shipmentStatusText({ ...arrived, delivery_date: '2026-10-20' }, false), /Доставлен 20\.10\.2026/)
  assert.match(shipmentStatusText(base, false), /Маршрут: Дубай → Алматы/)
})
