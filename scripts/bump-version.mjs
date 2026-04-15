// Bump patch version in src/lib/version.ts
// Usage: node scripts/bump-version.mjs [major|minor|patch]   (default: patch)
import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const part = process.argv[2] || 'patch'
const file = join(process.cwd(), 'src/lib/version.ts')
const src = readFileSync(file, 'utf8')

const match = src.match(/APP_VERSION = '(\d+)\.(\d+)\.(\d+)'/)
if (!match) {
  console.error('Cannot find APP_VERSION in', file)
  process.exit(1)
}
let [_, maj, min, pat] = match
maj = parseInt(maj, 10)
min = parseInt(min, 10)
pat = parseInt(pat, 10)

if (part === 'major') { maj++; min = 0; pat = 0 }
else if (part === 'minor') { min++; pat = 0 }
else { pat++ }

const newVer = `${maj}.${min}.${pat}`
const today = new Date().toISOString().slice(0, 10)

const out = src
  .replace(/APP_VERSION = '[^']+'/, `APP_VERSION = '${newVer}'`)
  .replace(/BUILD_DATE = '[^']+'/, `BUILD_DATE = '${today}'`)

writeFileSync(file, out)
console.log(`✓ Bumped to ${newVer} (${today})`)
