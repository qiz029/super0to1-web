import test from 'node:test'
import assert from 'node:assert/strict'
import seed from './fixtures/site.json'
import { snapshotSchema, contentIssues, publicSnapshot, youtubeId, sessionDate } from '../shared/content'
import { getMeta } from '../src/seo'

test('existing bilingual content validates without inventing historic dates', () => {
  const data = snapshotSchema.parse(seed)
  assert.deepEqual(contentIssues(data), [])
  assert.equal(sessionDate(data.sessions[0], 'zh'), '2026 年 4 月')
  assert.equal(data.sessions[0].startsAt, '')
})
test('drafts never enter public snapshots and featured draft references block publishing', () => {
  const data = snapshotSchema.parse(seed)
  data.sessions[0].published = false
  assert(contentIssues(data).some(x => x.path === 'home.sessionIds'))
  data.home.sessionIds = data.home.sessionIds.filter(x => x !== data.sessions[0].id)
  assert.deepEqual(contentIssues(data), [])
  const released = publicSnapshot(data, 'release-test')
  assert.equal(released.sessions.length, data.sessions.length - 1)
  assert.equal(data.releaseId, 'initial-20261024')
})
test('empty collections render SEO safely and can be published', () => {
  const data = snapshotSchema.parse(seed)
  data.sessions = []; data.videos = []; data.projects = []
  data.home.sessionIds = []; data.home.videoIds = []; data.home.projectIds = []
  assert.deepEqual(contentIssues(data), [])
  assert(getMeta('/lens', data).image)
  assert(getMeta('/zh/lens', data).title.includes('Super Lens'))
  assert.equal(getMeta('/lens/missing', data).notFound, true)
})
test('publish checks translation, booking, featured state, dates and existing URLs', () => {
  const old = snapshotSchema.parse(seed), data = structuredClone(old)
  data.sessions[0].title.zh = ''
  data.sessions[0].eventState = 'open'
  data.sessions[0].datePrecision = 'datetime'
  data.sessions[0].startsAt = 'not-a-date'
  data.projects[0].slug = 'changed'
  const paths = contentIssues(data, old).map(x => x.path)
  assert(paths.includes('sessions.0.title.zh'))
  assert(paths.includes('sessions.0.signupUrl'))
  assert(paths.includes('sessions.0.startsAt'))
  assert(paths.includes('projects.0'))
})
test('schema rejects executable URLs and internal fields', () => {
  const data = structuredClone(seed)
  data.site.signupUrl = 'javascript:alert(1)'
  assert.equal(snapshotSchema.safeParse(data).success, false)
  assert.equal(snapshotSchema.safeParse({ ...seed, internalNotes: 'private' }).success, false)
})
test('YouTube parsing only accepts supported domains and IDs', () => {
  assert.equal(youtubeId('https://youtu.be/tJLBy5aQPDI?si=abc'), 'tJLBy5aQPDI')
  assert.equal(youtubeId('https://www.youtube.com/watch?v=tJLBy5aQPDI'), 'tJLBy5aQPDI')
  assert.equal(youtubeId('https://youtube.com/shorts/tJLBy5aQPDI'), 'tJLBy5aQPDI')
  assert.equal(youtubeId('https://evil.test/watch?v=tJLBy5aQPDI'), null)
  assert.equal(youtubeId('invalid'), null)
})
