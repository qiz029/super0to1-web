// Renders public/og-image.png (1200×630), the default social preview card.
// Usage: node scripts/og-image.mjs <dir-with-brand-ttf-files>
// resvg needs TTF/OTF; pass the original brand TTFs (BricolageGrotesque-600.ttf,
// InstrumentSans-400.ttf, GeistMono-400.ttf).
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { Resvg } from '@resvg/resvg-js'

const fontDir = process.argv[2]
if (!fontDir) throw new Error('Pass the directory containing the brand TTF files.')

const W = 1200
const H = 630
const cx = 985
const cy = 300
const ring = 160
const r = 46
// Same arrangement as the site's necklace: start bottom-right, clockwise.
const pearls = Array.from({ length: 8 }, (_, i) => {
  const a = ((45 + i * 45) * Math.PI) / 180
  const x = cx + ring * Math.cos(a)
  const y = cy + ring * Math.sin(a)
  if (i < 3) return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff"/>`
  if (i === 3)
    return `<circle cx="${x}" cy="${y}" r="${r}" fill="#3c322b" stroke="#c3ff00" stroke-width="12"/>`
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#ffffff" fill-opacity="0.17"/>`
}).join('')

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="glow" cx="${cx}" cy="${cy}" r="300" gradientUnits="userSpaceOnUse">
      <stop offset="0" stop-color="#c3ff00" stop-opacity="0.18"/>
      <stop offset="1" stop-color="#c3ff00" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#53453a"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>
  <circle cx="${cx}" cy="${cy}" r="${ring}" fill="none" stroke="#c3ff00" stroke-opacity="0.55" stroke-width="2"/>
  ${pearls}
  <text x="80" y="118" font-family="Geist Mono" font-size="20" letter-spacing="2.5" fill="#f4fdaf">SUPER 0→1 INITIATIVE</text>
  <text font-family="Bricolage Grotesque" font-weight="600" font-size="80" letter-spacing="-3.5">
    <tspan x="76" y="250" fill="#ffffff">We empower</tspan>
    <tspan x="76" y="336" fill="#f4fdaf">super individuals</tspan>
  </text>
  <text font-family="Instrument Sans" font-size="28" fill="#e0d9d2">
    <tspan x="80" y="410">to move from 0 to 1 — by helping them</tspan>
    <tspan x="80" y="450">close the loops that matter.</tspan>
  </text>
  <rect x="80" y="520" width="16" height="16" rx="8" fill="#c3ff00"/>
  <text x="108" y="534" font-family="Geist Mono" font-size="20" letter-spacing="1" fill="#e0d9d2">super0to1.com</text>
</svg>`

const png = new Resvg(svg, {
  font: {
    loadSystemFonts: false,
    fontFiles: ['BricolageGrotesque-600.ttf', 'InstrumentSans-400.ttf', 'GeistMono-400.ttf'].map((f) => join(fontDir, f)),
    defaultFontFamily: 'Instrument Sans',
  },
})
  .render()
  .asPng()

await writeFile(new URL('../public/og-image.png', import.meta.url), png)
console.log(`public/og-image.png: ${png.length} bytes`)
