import test from 'node:test'
import assert from 'node:assert/strict'
const { stageOf, movePatch } = await import('../src/lib/pipeline-stage.ts')

test('furthest filled date decides the column', () => {
  assert.equal(stageOf({}), 'loading')
  assert.equal(stageOf({ export_date: '2026-11-01' }), 'export')
  assert.equal(stageOf({ export_date: '2026-11-01', departure_date: '2026-11-02' }), 'transit')
  assert.equal(stageOf({ departure_date: '2026-11-02', arrival_date: '2026-11-20', customs_date: '2026-11-21' }), 'customs')
  assert.equal(stageOf({ is_completed: true }), 'delivered')
})

test('moving forward stamps only the target, moving back clears everything after it', () => {
  assert.deepEqual(movePatch('loading', 'transit', '2026-11-26'), { departure_date: '2026-11-26' })
  assert.deepEqual(movePatch('customs', 'transit', '2026-11-26'), { is_completed: false, arrival_date: null, customs_date: null, delivery_date: null })
  assert.deepEqual(movePatch('border', 'border', '2026-11-26'), {})
  const s = { departure_date: '2026-11-02', arrival_date: '2026-11-20', delivery_date: '2026-11-25' }
  assert.equal(stageOf({ ...s, ...movePatch('delivered', 'border', '2026-11-26') }), 'border')
})
