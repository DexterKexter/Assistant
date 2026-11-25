import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

test('an installed worker leaves local dev chunks fresh and still caches production chunks', async () => {
  const source = readFileSync(new URL('../public/sw.js', import.meta.url), 'utf8')
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', 'assistant-gamma-one.vercel.app']) {
    const listeners = {}
    const origin = `http://${hostname}`
    vm.runInNewContext(source, {
      self: { location: { hostname, origin }, addEventListener: (name, handler) => { listeners[name] = handler } },
      URL, caches: { match: async () => 'cached production asset' },
    })
    let response
    listeners.fetch({ request: { method: 'GET', url: `${origin}/_next/static/chunks/app.js` }, respondWith: value => { response = value } })
    assert.equal(await response, hostname.endsWith('vercel.app') ? 'cached production asset' : undefined)
  }
})
