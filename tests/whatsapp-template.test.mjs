import assert from 'node:assert/strict'
import test from 'node:test'
import { TEMPLATES, compileTemplate, templatePayload, fillTemplate } from '../src/lib/whatsapp-template.ts'

test('every template compiles to a body Meta accepts', () => {
  for (const t of TEMPLATES) {
    const { body, fields } = compileTemplate(t.text)
    assert.match(t.name, /^[a-z0-9_]+$/)
    assert.ok(body.length <= 1024, t.name)
    assert.ok(!/^\{\{\d+\}\}/.test(body) && !/\{\{\d+\}\}$/.test(body), `${t.name}: starts/ends with a variable`)
    assert.deepEqual([...new Set([...body.matchAll(/\{\{(\d+)\}\}/g)].map(m => +m[1]))], fields.map((_, i) => i + 1), `${t.name}: variables out of order`)
  }
})

test('named fields become numbered variables with samples', () => {
  const c = compileTemplate('Здравствуйте, {Имя клиента}! Контейнер {Номер контейнера}. {Имя клиента}, пишите.')
  assert.equal(c.body, 'Здравствуйте, {{1}}! Контейнер {{2}}. {{1}}, пишите.')
  assert.deepEqual(c.fields, ['client_name', 'container'])
  assert.throws(() => compileTemplate('Привет, {Фамилия}'))
  assert.deepEqual(templatePayload('shipment_status').components[0].example, { body_text: [['Айдар', 'MSKU1234567', 'В пути с 01.11.2026', '21']] })
  assert.equal(templatePayload('greeting_v2').components[0].example, undefined)
  assert.equal(fillTemplate('Привет, {{1}} и {{2}}', ['Айдар']), 'Привет, Айдар и {{2}}')
})
