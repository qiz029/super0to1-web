import { z } from 'zod'

const text = z.string().max(20000)
export const localized = z.object({ en: text, zh: text }).strict()
const identifier = z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,79}$/)
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100)
const link = z.string().max(2000).refine(value => {
  if (!value) return true
  try { const u = new URL(value); return u.protocol === 'https:' && !u.username && !u.password } catch { return false }
}, '请输入完整的 https:// 链接')
const image = z.string().max(2000).refine(value => !value || /^media:[a-f0-9]{64}$/.test(value) || /^\/(?:media|cms-media)\/[a-zA-Z0-9_.-]+$/.test(value) || /^https:\/\/[^\s]+$/.test(value), '请选择图片或填写 HTTPS 图片地址')
const common = { id: identifier, published: z.boolean() }
export const sessionSchema = z.object({
  ...common, slug, title: localized, summary: localized, body: localized,
  month: localized, image, imageAlt: localized, datePrecision: z.enum(['month', 'datetime']),
  startsAt: z.string().max(40), endsAt: z.string().max(40), timezone: z.string().max(100),
  location: localized, signupUrl: link, eventState: z.enum(['announced', 'open', 'ended', 'cancelled']),
}).strict()
export const videoSchema = z.object({
  ...common, youtubeId: z.union([z.literal(''), z.string().regex(/^[a-zA-Z0-9_-]{11}$/)]), title: localized,
  summary: localized, cover: image, guestName: z.string().max(200), publishedDate: z.string().max(10),
}).strict()
export const projectSchema = z.object({
  ...common, slug, name: z.string().max(200), domain: z.string().max(200).optional(),
  tagline: localized.optional(), summary: localized.optional(), cover: image.optional(), coverAlt: localized.optional(),
  builder: z.object({ name: z.string().max(200), role: localized.optional(), bio: localized.optional(), url: link.optional() }).strict().optional(),
  stage: localized.optional(), lookingFor: localized.optional(), url: z.object({ en: link, zh: link }).strict().optional(),
  howItWorks: z.array(z.object({ title: localized, body: localized }).strict()).max(12).optional(),
  journey: z.array(z.object({ stage: z.enum(['problem', 'action', 'outcome']), title: localized, body: localized }).strict()).max(50),
}).strict()
export const roles = ['Builder', 'Tester', 'Session attendee', 'Community'] as const
export const snapshotSchema = z.object({
  schemaVersion: z.literal(1), releaseId: identifier,
  site: z.object({
    name: z.string().min(1).max(100), fullName: z.string().min(1).max(200),
    url: z.literal('https://super0to1.com'), mission: text, youtube: link,
    signupUrl: link, contactEmail: z.union([z.literal(''), z.email()]),
    signupTargets: z.object({ Builder: link, Tester: link, 'Session attendee': link, Community: link }).strict(),
  }).strict(),
  home: z.object({
    sessionIds: z.array(identifier).max(6), videoIds: z.array(identifier).max(3), projectIds: z.array(identifier).max(6),
    showSessions: z.boolean(), showVideos: z.boolean(), showProjects: z.boolean(), upcomingSessionId: identifier.nullable(),
  }).strict(),
  sessions: z.array(sessionSchema).max(300), videos: z.array(videoSchema).max(500), projects: z.array(projectSchema).max(300),
}).strict()
export type Snapshot = z.infer<typeof snapshotSchema>
export type Session = z.infer<typeof sessionSchema>
export type Video = z.infer<typeof videoSchema>
export type Project = z.infer<typeof projectSchema>
export type Localized = z.infer<typeof localized>
export type JoinRole = typeof roles[number]
export type ContentIssue = { path: string; message: string }
export const emptyText = (): Localized => ({ en: '', zh: '' })

export function contentIssues(data: Snapshot, previous?: Snapshot): ContentIssue[] {
  const issues: ContentIssue[] = []
  const add = (path: string, message: string) => issues.push({ path, message })
  const required = (value: Localized | undefined, path: string) => {
    for (const lang of ['en', 'zh'] as const) if (!value?.[lang]?.trim()) add(`${path}.${lang}`, '发布前请填写中文和英文')
  }
  const optionalPair = (value: Localized | undefined, path: string) => {
    if (value && (!!value.en.trim() !== !!value.zh.trim())) required(value, path)
  }
  for (const key of ['sessions', 'videos', 'projects'] as const) {
    const seen = new Set<string>(), paths = new Set<string>()
    data[key].forEach((item, i) => {
      const path = `${key}.${i}`
      if (seen.has(item.id)) add(`${path}.id`, '内容 ID 重复')
      seen.add(item.id)
      const route = 'slug' in item ? item.slug : item.youtubeId
      if (route && paths.has(route)) add(path, '网址重复')
      if (route) paths.add(route)
      const old = previous?.[key].find(x => x.id === item.id)
      if (old && ('slug' in old ? old.slug : old.youtubeId) !== route) add(path, '已发布内容的网址不可更改，请新建内容')
      if (!item.published) return
      if ('title' in item) required(item.title, `${path}.title`)
      if ('youtubeId' in item && !/^[a-zA-Z0-9_-]{11}$/.test(item.youtubeId)) add(`${path}.youtubeId`, '请填写有效的 YouTube 链接')
      if ('name' in item && !item.name.trim()) add(`${path}.name`, '请填写项目名称')
      optionalPair(item.summary, `${path}.summary`)
      if ('name' in item) required(item.tagline, `${path}.tagline`)
      if ('image' in item) {
        if (!item.image) add(`${path}.image`, '请选择活动图片')
        required(item.imageAlt, `${path}.imageAlt`)
        optionalPair(item.body, `${path}.body`)
        optionalPair(item.location, `${path}.location`)
        if (item.datePrecision === 'month') required(item.month, `${path}.month`)
        else {
          if (!item.startsAt || !Number.isFinite(Date.parse(item.startsAt)) || !/(Z|[+-]\d\d:\d\d)$/.test(item.startsAt)) add(`${path}.startsAt`, '请输入包含时区的活动时间')
          try { new Intl.DateTimeFormat('en', { timeZone: item.timezone }) } catch { add(`${path}.timezone`, '时区无效') }
          if (item.endsAt && (!Number.isFinite(Date.parse(item.endsAt)) || !/(Z|[+-]\d\d:\d\d)$/.test(item.endsAt) || Date.parse(item.endsAt) <= Date.parse(item.startsAt))) add(`${path}.endsAt`, '结束时间必须包含时区且晚于开始时间')
        }
        if (item.eventState === 'open' && !(item.signupUrl || data.site.signupTargets['Session attendee'] || data.site.signupUrl || data.site.contactEmail)) add(`${path}.signupUrl`, '开放报名需要报名链接或联系邮箱')
      }
      if ('builder' in item && item.builder) { optionalPair(item.builder.role, `${path}.builder.role`); optionalPair(item.builder.bio, `${path}.builder.bio`) }
      if ('stage' in item) optionalPair(item.stage, `${path}.stage`)
      if ('lookingFor' in item) optionalPair(item.lookingFor, `${path}.lookingFor`)
      if ('name' in item && item.cover) required(item.coverAlt, `${path}.coverAlt`)
      if ('howItWorks' in item) item.howItWorks?.forEach((step, index) => { required(step.title, `${path}.howItWorks.${index}.title`); required(step.body, `${path}.howItWorks.${index}.body`) })
      if ('journey' in item) item.journey.forEach((step, index) => { required(step.title, `${path}.journey.${index}.title`); required(step.body, `${path}.journey.${index}.body`) })
    })
  }
  for (const [field, collection] of [['sessionIds', 'sessions'], ['videoIds', 'videos'], ['projectIds', 'projects']] as const) {
    const ids = data.home[field]
    if (new Set(ids).size !== ids.length) add(`home.${field}`, '推荐内容不能重复')
    for (const id of ids) if (!data[collection].some(x => x.id === id && x.published)) add(`home.${field}`, '推荐内容必须存在且勾选发布')
  }
  if (data.home.upcomingSessionId) {
    const upcoming = data.sessions.find(x => x.id === data.home.upcomingSessionId && x.published)
    if (!upcoming || !['announced', 'open'].includes(upcoming.eventState)) add('home.upcomingSessionId', '下一场活动需要选择已发布的预告或开放报名活动')
  }
  return issues
}
export function publicSnapshot(data: Snapshot, releaseId: string): Snapshot {
  const copy = structuredClone(data)
  return { ...copy, releaseId, sessions: copy.sessions.filter(x => x.published), videos: copy.videos.filter(x => x.published), projects: copy.projects.filter(x => x.published) }
}
export function youtubeId(value: string): string | null {
  if (/^[\w-]{11}$/.test(value)) return value
  try {
    const url = new URL(value), host = url.hostname.replace(/^www\./, '')
    const id = host === 'youtu.be' ? url.pathname.slice(1) : ['youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(host) ? url.searchParams.get('v') ?? url.pathname.match(/^\/(?:shorts|embed|live)\/([\w-]{11})/)?.[1] : null
    return id && /^[\w-]{11}$/.test(id) ? id : null
  } catch { return null }
}
export { sessionDate } from './format'
