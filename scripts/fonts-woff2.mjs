// One-off: convert the brand TTFs in public/fonts to WOFF2.
import { readdir, readFile, writeFile, unlink } from 'node:fs/promises'
import { compress } from 'wawoff2'

const dir = new URL('../public/fonts/', import.meta.url)
for (const file of await readdir(dir)) {
  if (!file.endsWith('.ttf')) continue
  const ttf = await readFile(new URL(file, dir))
  const woff2 = await compress(ttf)
  await writeFile(new URL(file.replace(/\.ttf$/, '.woff2'), dir), woff2)
  await unlink(new URL(file, dir))
  console.log(`${file}: ${ttf.length} → ${woff2.length}`)
}
