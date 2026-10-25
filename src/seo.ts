import { site } from './content/site'
import { projects } from './content/projects'
import { sessions } from './content/sessions'
import { thumbnail, videos } from './content/videos'
import { messages } from './i18n/messages'
import { published } from './content/context'
import { sessionDate } from '../shared/format'
import type { Snapshot } from '../shared/content'
import { htmlLang, LOCALES, localePath, splitLocale, tx, type Locale } from './i18n/locale'

export type PageMeta = {
  title: string
  description: string
  image: string
  imageAlt: string
  type: 'website' | 'article' | 'video.other'
  notFound?: boolean
}

const DEFAULT_IMAGE = '/og-image.png'
const DEFAULT_IMAGE_ALT = 'Super 0→1 — We empower super individuals'

export function getMeta(pathname: string, content: Snapshot = published): PageMeta {
  const { site, sessions, videos, projects } = content
  const { locale, path: rawPath } = splitLocale(pathname)
  const path = rawPath.replace(/\/+$/, '') || '/'
  const t = messages[locale]
  const s = t.seo
  const [, section, slug] = path.split('/')

  const page = (title: string, description: string, extra: Partial<PageMeta> = {}): PageMeta => ({
    title: `${title} — ${site.name}`,
    description,
    image: DEFAULT_IMAGE,
    imageAlt: DEFAULT_IMAGE_ALT,
    type: 'website',
    ...extra,
  })
  const notFound = page(s.notFound, s.notFoundBody, { notFound: true })

  if (path === '/')
    return {
      title: site.fullName,
      description: `${t.mission} ${s.home}`,
      image: DEFAULT_IMAGE,
      imageAlt: DEFAULT_IMAGE_ALT,
      type: 'website',
    }

  if (section === 'method' && !slug) return page(t.method.title, s.method)

  if (section === 'projects') {
    if (!slug) return page(t.projects.title, s.projects)
    const project = projects.find((p) => p.slug === slug)
    if (!project) return notFound
    const description = project.summary ?? project.tagline
    return page(project.name, description ? tx(description, locale) : s.project(project.name), {
      image: project.cover ?? DEFAULT_IMAGE,
      imageAlt: project.coverAlt ? tx(project.coverAlt, locale) : project.name,
      type: 'article',
    })
  }

  if (section === 'lab' && !slug) return page('Super Lab', s.lab)

  if (section === 'sessions') {
    const first = sessions[0]
    if (!slug)
      return page('Super Session', s.sessions, {
        image: first?.image ?? DEFAULT_IMAGE,
        imageAlt: first ? tx(first.imageAlt, locale) : DEFAULT_IMAGE_ALT,
      })
    const session = sessions.find((x) => x.slug === slug)
    if (!session) return notFound
    const title = tx(session.title, locale)
    return page(
      title,
      tx(session.summary, locale) || s.session(title, sessionDate(session, locale)),
      { image: session.image, imageAlt: tx(session.imageAlt, locale), type: 'article' },
    )
  }

  if (section === 'lens') {
    if (!slug) return page('Super Lens', s.lens, videos[0] ? { image: videos[0].cover || thumbnail(videos[0].youtubeId), imageAlt: tx(videos[0].title, locale) } : {})
    const video = videos.find((v) => v.youtubeId === slug)
    if (!video) return notFound
    return page(tx(video.title, locale), tx(video.summary, locale) || s.episode(tx(video.title, locale)), {
      image: video.cover || thumbnail(video.youtubeId),
      imageAlt: tx(video.title, locale),
      type: 'video.other',
    })
  }

  if (section === 'about' && !slug) return page(s.aboutTitle, `${t.mission} ${s.about}`)

  return notFound
}

// Every page (English paths) to prerender in each language and list in the sitemap.
export const basePaths = [
  '/',
  '/method',
  '/projects',
  ...projects.map((p) => `/projects/${p.slug}`),
  '/lab',
  '/sessions',
  ...sessions.map((s) => `/sessions/${s.slug}`),
  '/lens',
  ...videos.map((v) => `/lens/${v.youtubeId}`),
  '/about',
]

export const sitePaths = LOCALES.flatMap((locale) => basePaths.map((p) => localePath(locale, p)))

export const absoluteUrl = (path: string) => (path === '/' ? `${site.url}/` : `${site.url}${path}`)

const absoluteImage = (url: string) => (url.startsWith('http') ? url : `${site.url}${url}`)

const escape = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export const pageLang = (pathname: string): string => htmlLang(splitLocale(pathname).locale)

export function renderHead(pathname: string): string {
  const meta = getMeta(pathname)
  const { locale, path } = splitLocale(pathname)
  const url = absoluteUrl(pathname)
  const ogLocale = (l: Locale) => (l === 'zh' ? 'zh_CN' : 'en_US')

  const tags = [
    `<title>${escape(meta.title)}</title>`,
    `<meta name="description" content="${escape(meta.description)}" />`,
  ]
  if (meta.notFound) {
    tags.push('<meta name="robots" content="noindex" />')
  } else {
    tags.push(`<link rel="canonical" href="${url}" />`)
    for (const l of LOCALES)
      tags.push(`<link rel="alternate" hreflang="${htmlLang(l)}" href="${absoluteUrl(localePath(l, path))}" />`)
    tags.push(`<link rel="alternate" hreflang="x-default" href="${absoluteUrl(path)}" />`)
  }
  tags.push(
    `<meta property="og:type" content="${meta.type}" />`,
    `<meta property="og:site_name" content="${escape(site.name)}" />`,
    `<meta property="og:locale" content="${ogLocale(locale)}" />`,
    ...LOCALES.filter((l) => l !== locale).map((l) => `<meta property="og:locale:alternate" content="${ogLocale(l)}" />`),
    `<meta property="og:title" content="${escape(meta.title)}" />`,
    `<meta property="og:description" content="${escape(meta.description)}" />`,
    `<meta property="og:url" content="${url}" />`,
    `<meta property="og:image" content="${absoluteImage(meta.image)}" />`,
    `<meta property="og:image:alt" content="${escape(meta.imageAlt)}" />`,
    `<meta name="twitter:card" content="summary_large_image" />`,
    `<meta name="twitter:title" content="${escape(meta.title)}" />`,
    `<meta name="twitter:description" content="${escape(meta.description)}" />`,
    `<meta name="twitter:image" content="${absoluteImage(meta.image)}" />`,
  )

  if (path === '/') {
    const jsonLd = [
      {
        '@context': 'https://schema.org',
        '@type': 'Organization',
        name: site.fullName,
        alternateName: site.name,
        url: site.url,
        description: messages[locale].mission,
        sameAs: [site.youtube],
      },
      { '@context': 'https://schema.org', '@type': 'WebSite', name: site.fullName, url: site.url, inLanguage: ['en', 'zh-CN'] },
    ]
    tags.push(`<script type="application/ld+json">${JSON.stringify(jsonLd).replace(/</g, '\\u003c')}</script>`)
  }

  return tags.join('\n    ')
}
