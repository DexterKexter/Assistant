import test from 'node:test'
import assert from 'node:assert/strict'
const { waId } = await import('../src/lib/wa-id.ts')

test('phones as typed in the CRM become WhatsApp ids', () => {
  assert.equal(waId('+7 701 440 8902'), '77014408902')
  assert.equal(waId('87020000418'), '77020000418')
  assert.equal(waId('701 440 89 02'), '77014408902')
  assert.equal(waId('+971 50 123 4567'), '971501234567')
})

test('no usable number, no id', () => {
  for (const p of [null, '', '—', '12345', '+7 701 44']) assert.equal(waId(p), null)
})
