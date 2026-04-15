import sharp from 'sharp'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'

const root = process.cwd()
const pub = join(root, 'public')

// Main icon — scaled from app/icon.svg design, but at higher canvas so text/details are crisp
const iconSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="ship" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" rx="112" fill="url(#bg)"/>
  <g transform="translate(128, 128) scale(10.67)">
    <path d="M16 8l-8 6v2h16v-2l-8-6z" fill="url(#ship)"/>
    <path d="M8 18h16v2c0 2-1.5 4-8 4s-8-2-8-4v-2z" fill="#a5b4fc" opacity="0.85"/>
    <circle cx="16" cy="14" r="2" fill="white" opacity="0.95"/>
  </g>
</svg>
`.trim()

// Maskable icon — safe area 80% with solid indigo background so OS can crop into any shape
const maskableSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="ship" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g transform="translate(176, 176) scale(5)">
    <path d="M16 8l-8 6v2h16v-2l-8-6z" fill="url(#ship)"/>
    <path d="M8 18h16v2c0 2-1.5 4-8 4s-8-2-8-4v-2z" fill="#a5b4fc" opacity="0.85"/>
    <circle cx="16" cy="14" r="2" fill="white" opacity="0.95"/>
  </g>
</svg>
`.trim()

// Apple touch icon — 180x180, no transparency, rounded corners handled by iOS
const appleSvg = `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0f172a"/>
      <stop offset="100%" stop-color="#1e293b"/>
    </linearGradient>
    <linearGradient id="ship" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#818cf8"/>
      <stop offset="100%" stop-color="#6366f1"/>
    </linearGradient>
  </defs>
  <rect width="180" height="180" fill="url(#bg)"/>
  <g transform="translate(45, 45) scale(2.8)">
    <path d="M16 8l-8 6v2h16v-2l-8-6z" fill="url(#ship)"/>
    <path d="M8 18h16v2c0 2-1.5 4-8 4s-8-2-8-4v-2z" fill="#a5b4fc" opacity="0.85"/>
    <circle cx="16" cy="14" r="2" fill="white" opacity="0.95"/>
  </g>
</svg>
`.trim()

async function run() {
  const iconBuf = Buffer.from(iconSvg)
  const maskBuf = Buffer.from(maskableSvg)
  const appleBuf = Buffer.from(appleSvg)

  await sharp(iconBuf).resize(192, 192).png().toFile(join(pub, 'icon-192.png'))
  await sharp(iconBuf).resize(512, 512).png().toFile(join(pub, 'icon-512.png'))
  await sharp(maskBuf).resize(512, 512).png().toFile(join(pub, 'icon-maskable-512.png'))
  await sharp(appleBuf).resize(180, 180).png().toFile(join(pub, 'apple-touch-icon.png'))

  console.log('✓ Generated PWA icons in /public')
}

run().catch(e => { console.error(e); process.exit(1) })
