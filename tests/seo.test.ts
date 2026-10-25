import test from 'node:test'
import assert from 'node:assert/strict'
import seed from './fixtures/site.json'
import { snapshotSchema } from '../shared/content'
import { getMeta, renderHead, structuredData } from '../src/seo'

test('unknown descendants never inherit an existing page canonical or schema', () => {
  const head = renderHead('/projects/asidefm/missing')
  assert.equal(getMeta('/projects/asidefm/missing').notFound, true)
  assert.match(head, /name="robots" content="noindex"/)
  assert.doesNotMatch(head, /rel="canonical"|hreflang|application\/ld\+json/)
})

test('localized detail breadcrumbs use localized names and canonical URLs', () => {
  const data = snapshotSchema.parse(seed)
  const [breadcrumb] = structuredData('/zh/sessions/find-your-direction/', data)
  assert.deepEqual(breadcrumb.itemListElement, [
    { '@type': 'ListItem', position: 1, name: 'Super 0→1', item: 'https://super0to1.com/zh' },
    { '@type': 'ListItem', position: 2, name: 'Super Session', item: 'https://super0to1.com/zh/sessions' },
    { '@type': 'ListItem', position: 3, name: '找到你的方向', item: 'https://super0to1.com/zh/sessions/find-your-direction' },
  ])
  assert.match(renderHead('/zh/method/'), /rel="canonical" href="https:\/\/super0to1.com\/zh\/method"/)
})

test('video schema requires a real valid publication date and preserves date precision', () => {
  const data = snapshotSchema.parse(seed)
  const video = data.videos[0]
  const path = `/lens/${video.youtubeId}`
  for (const date of ['', '2026-02-30', 'not a date']) {
    video.publishedDate = date
    assert.equal(structuredData(path, data).some(x => x['@type'] === 'VideoObject'), false)
  }
  video.publishedDate = '2026-10-25'
  const result = structuredData(path, data).find(x => x['@type'] === 'VideoObject')
  assert.equal(result?.uploadDate, '2026-10-25')
  assert.equal(result?.embedUrl, `https://www.youtube-nocookie.com/embed/${video.youtubeId}`)
  assert.deepEqual(result?.thumbnailUrl, [`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg`])
})

test('event schema omits incomplete historic events and represents cancellation', () => {
  const data = snapshotSchema.parse(seed)
  const session = data.sessions[0]
  const path = `/sessions/${session.slug}`
  assert.equal(structuredData(path, data).some(x => x['@type'] === 'Event'), false)
  session.datePrecision = 'datetime'
  session.startsAt = '2026-11-01T14:00:00-08:00'
  session.location = { en: '100 Main St, Seattle, WA', zh: '100 Main St, Seattle, WA' }
  session.eventState = 'cancelled'
  session.endsAt = '2026-11-01T13:00:00-08:00'
  const result = structuredData(path, data).find(x => x['@type'] === 'Event')
  assert.equal(result?.startDate, session.startsAt)
  assert.equal(result?.eventStatus, 'https://schema.org/EventCancelled')
  assert.equal(result?.endDate, undefined)
})

test('head serialization escapes editor content and uses preview content', () => {
  const data = snapshotSchema.parse(seed)
  data.site.fullName = 'Preview </script><script>alert(1)</script>'
  const head = renderHead('/', data)
  assert.match(head, /Preview &lt;\/script&gt;/)
  assert.doesNotMatch(head, /<script>alert/)
  const json = head.match(/<script[^>]*>(.*?)<\/script>/)?.[1]
  assert.equal(JSON.parse(json!)[0].name, data.site.fullName)
  const project = data.projects[0]
  project.summary = { en: '', zh: '' }
  project.cover = ''
  assert.equal(getMeta(`/projects/${project.slug}`, data).description, project.tagline?.en)
  assert.equal(getMeta(`/projects/${project.slug}`, data).image, '/og-image.png')
})
