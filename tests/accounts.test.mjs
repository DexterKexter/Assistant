import test from 'node:test'
import assert from 'node:assert/strict'
const { totalsByCurrency, maskNumber } = await import('../src/lib/accounts.ts')

test('totals are per currency, skip archived accounts, accept numeric strings', () => {
  const totals = totalsByCurrency([
    { currency: 'USD', balance: '100.50', archived_at: null },
    { currency: 'KZT', balance: 5000, archived_at: null },
    { currency: 'USD', balance: 20, archived_at: null },
    { currency: 'USD', balance: 999, archived_at: '2026-11-01' },
  ])
  assert.deepEqual(totals, [['KZT', 5000], ['USD', 120.5]])
})

test('account number shows only its last four digits', () => {
  assert.equal(maskNumber('KZ12 3456 7890 1234'), '•• 1234')
  assert.equal(maskNumber('123'), '123')
  assert.equal(maskNumber(null), '')
})
