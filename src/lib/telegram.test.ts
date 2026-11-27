// Run: TELEGRAM_WEBHOOK_SECRET=x npx tsx src/lib/telegram.test.ts
import assert from 'node:assert'
import { linkToken, userIdFromLinkToken } from './telegram'

const id = '0e5d5c1b-1b52-4b6f-9288-dc01297ca472'
const token = linkToken(id)
assert.match(token, /^[\w-]{49}$/)
assert.equal(userIdFromLinkToken(token), id)
assert.equal(userIdFromLinkToken(linkToken(id, -1)), null, 'expired')
assert.equal(userIdFromLinkToken(token.slice(0, -1) + (token.endsWith('A') ? 'B' : 'A')), null, 'tampered signature')
assert.equal(userIdFromLinkToken('garbage'), null)
console.log('ok')
