import assert from 'node:assert/strict'
import test from 'node:test'
import { parseISO } from 'date-fns'
import { shipmentCalendarDays, shipmentDateBounds, shipmentDateError } from '../src/lib/shipment-dates.ts'

test('route dates stay ordered, including missing intermediate dates and same-day stages', () => {
  const dates = { departure_date: '2026-09-19', arrival_date: null, delivery_date: '2026-10-10' }
  const bounds = shipmentDateBounds('arrival_date', dates)
  assert.deepEqual(bounds, { min: '2026-09-19', max: '2026-10-10' })
  assert.equal(shipmentDateError('2026-09-19', bounds), null)
  assert.equal(shipmentDateError('2026-10-10', bounds), null)
  assert.match(shipmentDateError('2026-09-18', bounds), /раньше 19.09.2026/)
  assert.match(shipmentDateError('2026-10-11', bounds), /позже 10.10.2026/)
  assert.deepEqual(shipmentDateBounds('departure_date', dates), { min: undefined, max: '2026-10-10' })
  assert.deepEqual(shipmentDateBounds('delivery_date', dates), { min: '2026-09-19', max: undefined })
  assert.deepEqual(shipmentDateBounds('delivery_date', { ...dates, arrival_date: '2026-10-01' }), { min: '2026-10-01', max: undefined })
})

test('invalid dates are rejected without normalizing them into another month', () => {
  for (const value of ['', '2026-02-29', '2026-04-31', '2026-13-01', '19.09.2026', '2026-9-1']) {
    assert.equal(shipmentDateError(value, {}), 'Выберите корректную дату.')
  }
  assert.equal(shipmentDateError('2024-02-29', {}), null)
})

test('calendar starts Monday and covers six full weeks across leap years and year boundaries', () => {
  const february = shipmentCalendarDays(parseISO('2024-02-01'))
  assert.equal(february.length, 42)
  assert.equal(new Set(february).size, 42)
  assert.equal(february[0], '2024-01-29')
  assert.ok(february.includes('2024-02-29'))
  assert.equal(february[41], '2024-03-10')
  const december = shipmentCalendarDays(parseISO('2026-12-01'))
  assert.equal(december[0], '2026-11-30')
  assert.equal(december[41], '2027-01-10')
})
