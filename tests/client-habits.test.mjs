import test from 'node:test'
import assert from 'node:assert/strict'
const { clientHabits } = await import('../src/lib/client-habits.ts')

const row = (origin, destination_city, container_size = 40, cargo_description = null, sender_name = null, container_type = null) =>
  ({ origin, destination_city, container_size, cargo_description, sender_name, container_type })

test('routes are ranked by frequency, details are the most common on the route', () => {
  const habits = clientHabits([
    row('Дубай', 'Алматы', 40, 'Запчасти', 'Али'), row('Дубай', 'Алматы', 40, 'Запчасти', 'Асад'), row('Дубай', 'Алматы', 20, 'Масло', 'Али'),
    row('Корея', 'Москва', 20), row(null, 'Алматы'), row('Дубай', ' '),
  ])
  assert.deepEqual(habits.map(h => [h.origin, h.destination, h.count]), [['Дубай', 'Алматы', 3], ['Корея', 'Москва', 1]])
  assert.deepEqual([habits[0].size, habits[0].cargo, habits[0].sender, habits[0].type], [40, 'Запчасти', 'Али', ''])
})

test('no shipments, no hints; limit caps the list', () => {
  assert.deepEqual(clientHabits([]), [])
  assert.equal(clientHabits([row('A', 'B'), row('C', 'D'), row('E', 'F')], 2).length, 2)
})
