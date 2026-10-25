import { test, expect } from '@playwright/test'

const origin = 'https://super0to1.com'

test('client navigation has the same metadata as a direct request, including language switches', async ({ page, request }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  page.on('console', message => {
    if (message.type() === 'error' && /hydrat|Minified React error/.test(message.text())) errors.push(message.text())
  })
  await page.goto('/')
  await page.locator('.site-nav a[href="/method"]').click()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/method`)
  await expect(page.locator('meta[property="og:url"]')).toHaveAttribute('content', `${origin}/method`)
  const direct = await (await request.get('/method')).text()
  const heads = await page.evaluate(html => ({
    actual: Array.from(document.head.querySelectorAll('[data-site-seo]'), node => node.outerHTML),
    expected: Array.from(new DOMParser().parseFromString(html, 'text/html').head.querySelectorAll('[data-site-seo]'), node => node.outerHTML),
  }), direct)
  expect(heads.actual.length).toBeGreaterThan(15)
  expect(heads.actual).toEqual(heads.expected)
  await page.locator('.lang-switch a[lang="zh-CN"]').click()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/zh/method`)
  await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'zh_CN')
  await expect(page.locator('link[hreflang="en"]')).toHaveAttribute('href', `${origin}/method`)
  await expect(page.locator('html')).toHaveAttribute('lang', 'zh-CN')
  await expect(page.locator('head title')).toHaveCount(1)
  await expect(page.locator('head script[type="application/ld+json"]')).toHaveCount(1)
  const schema = JSON.parse((await page.locator('head script[type="application/ld+json"]').textContent())!)
  expect(schema.map((item: { '@type': string }) => item['@type'])).toEqual(['BreadcrumbList'])
  expect(errors).toEqual([])
})

test('404 noindex is removed on recovery and foreign preview noindex is preserved', async ({ page }) => {
  const response = await page.goto('/missing-seo-page')
  expect(response?.status()).toBe(404)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
  await page.locator('.site-nav a[href="/method"]').click()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/method`)
  await expect(page.locator('meta[name="robots"]')).toHaveCount(0)
  await page.evaluate(() => {
    const robots = document.createElement('meta')
    robots.name = 'robots'; robots.content = 'noindex,nofollow'
    document.head.append(robots)
  })
  await page.locator('.site-nav a[href="/about"]').click()
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${origin}/about`)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow')
})

test('static crawlability, sitemap, fonts and language routing', async ({ request }) => {
  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBe(200)
  const xml = await sitemap.text()
  expect(xml).not.toContain('<lastmod>')
  const paths = [...xml.matchAll(/<loc>https:\/\/super0to1.com([^<]*)<\/loc>/g)].map(match => match[1])
  expect(paths.length).toBeGreaterThan(10)
  for (const path of paths) {
    const response = await request.get(path)
    expect(response.status(), path).toBe(200)
    const html = await response.text()
    expect(html, path).toContain(`rel="canonical" href="${origin}${path}"`)
    expect(html, path).toContain('hreflang="x-default"')
    expect(html, path).not.toContain('content="noindex"')
    expect(html.match(/<h1[ >]/g), path).toHaveLength(1)
  }
  const home = await (await request.get('/')).text()
  for (const [, font] of home.matchAll(/href="(\/fonts\/[^"]+)"/g)) {
    const response = await request.get(font)
    expect(response.status(), font).toBe(200)
    expect(response.headers()['content-type']).toContain('font/')
  }
  expect((await request.get('/zh/missing-seo-page')).status()).toBe(404)
  const chinese = { 'Accept-Language': 'zh-CN', Cookie: 'lang=zh' }
  const english = { 'Accept-Language': 'en-US', Cookie: 'lang=en' }
  expect((await request.get('/', { headers: chinese, maxRedirects: 0 })).status()).toBe(302)
  expect((await request.get('/method', { headers: chinese, maxRedirects: 0 })).status()).toBe(200)
  expect((await request.get('/zh/method', { headers: english, maxRedirects: 0 })).status()).toBe(200)
  expect((await request.get('/zh', { headers: english, maxRedirects: 0 })).status()).toBe(200)
  expect((await request.get('/', { headers: english, maxRedirects: 0 })).status()).toBe(200)
})
