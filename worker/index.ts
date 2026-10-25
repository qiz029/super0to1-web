// Serves the prerendered site from static assets.
// - www → apex redirect.
// - Language: English at /, Chinese at /zh. A visitor's choice is stored in the
//   `lang` cookie by the on-page switch; without it, the browser's preferred
//   language (Accept-Language) picks the default at the English homepage only.
//   Explicit language and deep links always serve the URL requested.
type Env = { ASSETS: { fetch: (request: Request | string) => Promise<Response> }; MEDIA: R2Bucket }
type Locale = 'en' | 'zh'

const isZhPath = (path: string) => path === '/zh' || path.startsWith('/zh/')

function cookieLocale(request: Request): Locale | null {
  const match = (request.headers.get('Cookie') ?? '').match(/(?:^|;\s*)lang=(en|zh)\b/)
  return (match?.[1] as Locale | undefined) ?? null
}

function browserLocale(request: Request): Locale {
  const first = (request.headers.get('Accept-Language') ?? '').split(',')[0]?.trim().toLowerCase() ?? ''
  return first.startsWith('zh') ? 'zh' : 'en'
}

function redirect(url: URL, path: string) {
  const target = new URL(url)
  target.pathname = path
  return new Response(null, {
    status: 302,
    headers: { Location: target.toString(), 'Cache-Control': 'no-store', Vary: 'Cookie, Accept-Language' },
  })
}

export default {
  async fetch(request: Request, env: Env) {
    const url = new URL(request.url)
    if (url.hostname === 'www.super0to1.com') {
      url.hostname = 'super0to1.com'
      return Response.redirect(url.toString(), 301)
    }

    const path = url.pathname
    const media = path.match(/^\/cms-media\/([a-f0-9]{64}\.webp)$/)?.[1]
    if (media) {
      if (!['GET', 'HEAD'].includes(request.method)) return new Response(null, { status: 405, headers: { Allow: 'GET, HEAD' } })
      const object = await env.MEDIA.get(`published/${media}`)
      if (!object) return new Response('Not found', { status: 404 })
      const headers = { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=31536000, immutable', ETag: object.httpEtag, 'X-Content-Type-Options': 'nosniff' }
      if (request.headers.get('If-None-Match') === object.httpEtag) return new Response(null, { status: 304, headers })
      return new Response(request.method === 'HEAD' ? null : object.body, { headers })
    }
    const isPage = request.method === 'GET' && !/\.[a-z0-9]+$/i.test(path)
    if (isPage) {
      const chosen = cookieLocale(request)
      if (path === '/' && (chosen ?? browserLocale(request)) === 'zh') return redirect(url, '/zh')
    }

    const response = await env.ASSETS.fetch(request)
    if (response.status === 404 && isPage && isZhPath(path)) {
      const zhNotFound = await env.ASSETS.fetch(new URL('/zh/404', url).toString())
      return new Response(zhNotFound.body, { status: 404, headers: zhNotFound.headers })
    }
    return response
  },
}
