// Renders every route in every language to static HTML after `vite build` and
// `vite build --ssr`, then writes sitemap.xml and robots.txt. Pages are written
// as `<path>.html` so Cloudflare serves them at clean URLs without trailing slashes.
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'

const dist = new URL('../dist/', import.meta.url)
const serverEntry = new URL('../dist-server/entry-server.js', import.meta.url)
const SITE = 'https://super0to1.com'

const { render, renderHead, sitePaths, basePaths, pageLang } = await import(serverEntry.href)
const template = await readFile(new URL('index.html', dist), 'utf8')

async function writePage(pathname, file) {
  const html = template
    .replace('<html lang="en">', `<html lang="${pageLang(pathname)}">`)
    .replace('<!--app-head-->', renderHead(pathname))
    .replace('<!--app-html-->', await render(pathname))
  const target = new URL(file, dist)
  await mkdir(dirname(target.pathname), { recursive: true })
  await writeFile(target, html)
}

for (const pathname of sitePaths) {
  await writePage(pathname, pathname === '/' ? 'index.html' : `${pathname.slice(1)}.html`)
}
await writePage('/404', '404.html')
await writePage('/zh/404', 'zh/404.html')

// Sitemap with hreflang alternates for each page.
const today = new Date().toISOString().slice(0, 10)
const loc = (p) => `${SITE}${p === '/' ? '/' : p}`
const zh = (p) => (p === '/' ? '/zh' : `/zh${p}`)
const entry = (p, base) => `  <url>
    <loc>${loc(p)}</loc>
    <lastmod>${today}</lastmod>
    <xhtml:link rel="alternate" hreflang="en" href="${loc(base)}"/>
    <xhtml:link rel="alternate" hreflang="zh-CN" href="${loc(zh(base))}"/>
    <xhtml:link rel="alternate" hreflang="x-default" href="${loc(base)}"/>
  </url>`
const urls = basePaths.flatMap((p) => [entry(p, p), entry(zh(p), p)]).join('\n')
await writeFile(
  new URL('sitemap.xml', dist),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`,
)
await writeFile(new URL('robots.txt', dist), `User-agent: *\nAllow: /\n\nSitemap: ${SITE}/sitemap.xml\n`)

await rm(new URL('../dist-server/', import.meta.url), { recursive: true, force: true })
console.log(`Prerendered ${sitePaths.length} pages + 2 not-found pages, sitemap.xml, robots.txt`)
