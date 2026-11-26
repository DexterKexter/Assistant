import test from 'node:test'
import assert from 'node:assert/strict'
import { registerHooks } from 'node:module'

// The app imports through the '@/' alias; teach Node the same mapping for this test.
registerHooks({ resolve: (spec, ctx, next) => next(spec.startsWith('@/') ? new URL(`../src/${spec.slice(2)}.ts`, import.meta.url).href : spec, ctx) })
const { buildNotification, eventStillTrue, currentEvent } = await import('../src/lib/shipment-notify.ts')

const s = { container_number: 'MSKU1234567', origin: 'Дубай', destination_city: 'Алматы', destination_station: 'Актау Порт', departure_date: '2026-11-01', arrival_date: null, delivery_date: null, is_completed: false }
const now = new Date('2026-11-21T00:00:00Z').getTime()

test('created needs no container and has no template fallback', () => {
  const r = buildNotification('created', { ...s, container_number: null, departure_date: null }, 'Айдар', false, now)
  assert.match(r.text, /Перевозка оформлена/)
  assert.match(r.text, /Дубай → Алматы/)
  assert.doesNotMatch(r.text, /Контейнер/)
  assert.equal(r.template, undefined)
})
test('departed fills the approved template in field order', () => {
  const r = buildNotification('departed', s, 'Айдар', false, now)
  assert.equal(r.template.name, 'shipment_departed')
  assert.deepEqual(r.template.params, ['Айдар', 'MSKU1234567', 'Дубай → Алматы'])
  assert.match(r.text, /MSKU1234567/)
})
test('delivered uses the new brand in free-form text', () => {
  const r = buildNotification('delivered', { ...s, delivery_date: '2026-11-20' }, 'Айдар', false, now)
  assert.match(r.text, /STI Logistics/)
  assert.match(r.text, /дней: \*19\*/)
})
test('a missing field is an error, not a half-empty message', () => {
  assert.ok('error' in buildNotification('border', s, 'Айдар', false, now))
})
test('an event is cancelled when its date was cleared', () => {
  assert.equal(eventStillTrue('departed', { ...s, departure_date: null }), false)
  assert.equal(eventStillTrue('delivered', { ...s, is_completed: true }), true)
  assert.equal(eventStillTrue('created', s), true)
})
test('manual notify announces the furthest stage reached', () => {
  assert.equal(currentEvent({ ...s, departure_date: null }), 'created')
  assert.equal(currentEvent(s), 'departed')
  assert.equal(currentEvent({ ...s, arrival_date: '2026-11-15' }), 'border')
  assert.equal(currentEvent({ ...s, arrival_date: '2026-11-15', is_completed: true }), 'delivered')
})
