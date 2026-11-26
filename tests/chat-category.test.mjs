import test from 'node:test'
import assert from 'node:assert/strict'
import { parseClassification } from '../src/lib/chat-category.ts'

test('parses a clean reply', () => {
  assert.deepEqual(parseClassification('{"category":"lead","summary":"Хочет 40 ft из Дубая в Алматы"}'), { category: 'lead', summary: 'Хочет 40 ft из Дубая в Алматы' })
})
test('tolerates text around the JSON', () => {
  assert.equal(parseClassification('```json\n{"category":"spam","summary":"реклама"}\n```')?.category, 'spam')
})
test('rejects unknown categories and garbage', () => {
  assert.equal(parseClassification('{"category":"vip","summary":"x"}'), null)
  assert.equal(parseClassification('не знаю'), null)
})
test('caps the summary length', () => {
  assert.equal(parseClassification(JSON.stringify({ category: 'other', summary: 'a'.repeat(500) })).summary.length, 300)
})
