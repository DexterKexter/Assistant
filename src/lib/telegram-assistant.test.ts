// Run: OPENROUTER_API_KEY=x npx tsx src/lib/telegram-assistant.test.ts
import assert from 'node:assert'
import { telegramHtml } from './telegram-assistant'

assert.deepEqual(telegramHtml('🚛 В пути **47** <шт> & ещё'), ['🚛 В пути <b>47</b> &lt;шт&gt; &amp; ещё'])
const long = Array.from({ length: 30 }, (_, i) => `**Блок ${i}**\n${'строка '.repeat(40)}`).join('\n\n')
const parts = telegramHtml(long)
assert.ok(parts.length > 1 && parts.every(p => p.length <= 3800), 'split under the cap')
assert.ok(parts.every(p => (p.match(/<b>/g) ?? []).length === (p.match(/<\/b>/g) ?? []).length), 'tags stay balanced')
console.log('ok')
