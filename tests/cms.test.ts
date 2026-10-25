import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import worker from '../cms/worker/index'
import fixtureContent from './fixtures/site.json'
import type { Env, StateView } from '../cms/worker/types'

function fixture() {
  const database = new DatabaseSync(':memory:')
  database.exec(readFileSync(new URL('../cms/migrations/0001_initial.sql', import.meta.url), 'utf8'))
  database.prepare('INSERT INTO state VALUES (1, 1, ?, ?, ?)').run(JSON.stringify(fixtureContent), new Date().toISOString(), 'test fixture')
  for (const kind of ['sessions', 'videos', 'projects'] as const) for (const item of fixtureContent[kind]) database.prepare('INSERT INTO content_paths (kind, id, path) VALUES (?, ?, ?)').run(kind, item.id, 'slug' in item ? item.slug : item.youtubeId)
  class Statement {
    constructor(readonly sql: string, readonly values: unknown[] = []) {}
    bind(...values: unknown[]) { return new Statement(this.sql, values) }
    async first(column?: string) { const row = database.prepare(this.sql).get(...this.values as []) as Record<string, unknown> | undefined; return column ? row?.[column] ?? null : row ?? null }
    async all() { return { success: true, results: database.prepare(this.sql).all(...this.values as []), meta: {} } }
    async run() { const result = database.prepare(this.sql).run(...this.values as []); return { success: true, meta: { changes: Number(result.changes) }, results: [] } }
  }
  const DB = { prepare(sql: string) { return new Statement(sql) }, async batch(statements: Statement[]) { database.exec('BEGIN'); try { const result = await Promise.all(statements.map(x => x.run())); database.exec('COMMIT'); return result } catch (error) { database.exec('ROLLBACK'); throw error } } }
  const env = { DB, CMS_DEV: 'true', MEDIA: { async get() { return null } }, ASSETS: { async fetch() { return new Response('private admin UI') } } } as unknown as Env
  async function request(path: string, method = 'GET', body?: unknown, options: { env?: Env; origin?: string; hostname?: string } = {}) {
    const url = `http://${options.hostname ?? 'localhost'}${path}`
    const tasks: Promise<unknown>[] = []
    const ctx = { waitUntil(promise: Promise<unknown>) { tasks.push(promise) } } as ExecutionContext
    const headers = new Headers()
    if (body !== undefined) { headers.set('Content-Type', 'application/json'); headers.set('Origin', options.origin ?? new URL(url).origin) }
    const response = await worker.fetch(new Request(url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }), options.env ?? env, ctx)
    await Promise.all(tasks)
    return response
  }
  return { database, env, request }
}

test('production denies unauthenticated access to UI, API, preview and media; dev mode cannot bypass a public hostname', async () => {
  const { request, env } = fixture()
  for (const path of ['/', '/api/state', '/preview.html', '/api/media/' + 'a'.repeat(64)]) {
    assert.equal((await request(path, 'GET', undefined, { env: { ...env, CMS_DEV: undefined } })).status, 503)
    assert.equal((await request(path, 'GET', undefined, { hostname: 'cms.super0to1.com' })).status, 503)
  }
})
test('saved drafts use compare-and-swap revisions and immutable private previews', async () => {
  const { request } = fixture()
  const first = await (await request('/api/state')).json() as StateView
  const changed = structuredClone(first.data); changed.sessions[0].title.zh = '私有草稿标题'
  const save = await request('/api/state', 'PUT', { revision: first.revision, data: changed })
  assert.equal(save.status, 200)
  const saved = await save.json() as { revision: number }
  assert.equal(saved.revision, 2)
  const conflict = await request('/api/state', 'PUT', { revision: first.revision, data: first.data })
  assert.equal(conflict.status, 409)
  const preview = await (await request('/api/previews', 'POST', { revision: 1 })).json() as { id: string }
  const frozen = await (await request(`/api/previews/${preview.id}`)).json() as StateView['data']
  assert.notEqual(frozen.sessions[0].title.zh, changed.sessions[0].title.zh)
  const current = await (await request('/api/state')).json() as StateView
  assert.equal(current.data.sessions[0].title.zh, '私有草稿标题')
  assert.equal((await request('/api/state')).headers.get('Cache-Control'), 'private, no-store')
})
test('cross-origin writes and malformed input never mutate saved content', async () => {
  const { request } = fixture()
  const before = await (await request('/api/state')).json() as StateView
  assert.equal((await request('/api/state', 'PUT', { revision: 1, data: before.data }, { origin: 'https://evil.test' })).status, 403)
  assert.equal((await request('/api/state', 'PUT', { revision: 1, data: { ...before.data, secret: 'not allowed' } })).status, 422)
  assert.equal((await (await request('/api/state')).json() as StateView).revision, 1)
})
test('publication freezes approved records, preserves private draft edits, locks concurrent publishing and retries idempotently', async () => {
  const { request, database } = fixture()
  const initial = await (await request('/api/state')).json() as StateView
  const draft = structuredClone(initial.data)
  draft.sessions.push({ ...draft.sessions[0], id: 'private-session', slug: 'private-session', published: false, title: { en: 'Unannounced', zh: '未公开活动' } })
  const saved = await (await request('/api/state', 'PUT', { revision: 1, data: draft })).json() as { revision: number }
  const requestId = crypto.randomUUID()
  assert.equal((await request('/api/releases', 'POST', { revision: saved.revision, requestId })).status, 202)
  const row = database.prepare('SELECT * FROM releases WHERE id = ?').get(requestId) as { data: string; status: string }
  assert.equal(row.status, 'preparing') // Missing GitHub setup retries; it must never claim success.
  const frozen = JSON.parse(row.data) as StateView['data']
  assert(!frozen.sessions.some(x => x.id === 'private-session'))
  assert((await (await request('/api/state')).json() as StateView).data.sessions.some(x => x.id === 'private-session'))
  assert.equal((await request('/api/releases', 'POST', { revision: saved.revision, requestId: crypto.randomUUID() })).status, 409)
  assert.equal((await request('/api/releases', 'POST', { revision: saved.revision, requestId })).status, 202)
  assert.equal((database.prepare('SELECT COUNT(*) AS count FROM releases').get() as { count: number }).count, 1)
})
test('published routes remain locked even when content is removed from the current publication', async () => {
  const { request } = fixture()
  const initial = await (await request('/api/state')).json() as StateView
  initial.data.sessions[0].published = false
  initial.data.sessions[0].slug = 'different-address'
  assert.equal((await request('/api/state', 'PUT', { revision: 1, data: initial.data })).status, 422)
})
test('unknown preview identifiers and media IDs return private 404s', async () => {
  const { request } = fixture()
  assert.equal((await request('/api/previews/' + crypto.randomUUID())).status, 404)
  assert.equal((await request('/api/media/' + 'f'.repeat(64))).status, 404)
})

test('a release is live only after its exact commit passes CI and is served by production; rollback preserves drafts', async () => {
  const { generateKeyPair, exportPKCS8 } = await import('jose')
  const { reconcile } = await import('../cms/worker/index')
  const { request, database, env } = fixture()
  const { privateKey } = await generateKeyPair('RS256', { extractable: true })
  Object.assign(env, { GITHUB_APP_ID: 'test-app', GITHUB_INSTALLATION_ID: crypto.randomUUID(), GITHUB_APP_PRIVATE_KEY: await exportPKCS8(privateKey) })
  const originalFetch = globalThis.fetch
  let remote = (await (await request('/api/state')).json() as StateView).data
  let head = 'initial', writes = 0, conclusion = 'success', servedCommit = '', servedRelease = ''
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.includes('/access_tokens')) return Response.json({ token: 'test-only', expires_at: new Date(Date.now() + 3600000).toISOString() })
    if (url.includes('/contents/')) {
      if (init?.method === 'PUT') {
        remote = JSON.parse(Buffer.from(JSON.parse(init.body as string).content, 'base64').toString('utf8'))
        head = `commit-${++writes}`
        return Response.json({ commit: { sha: head } })
      }
      return Response.json({ sha: head, content: Buffer.from(JSON.stringify(remote)).toString('base64') })
    }
    if (url.includes('/actions/runs')) return Response.json({ workflow_runs: [{ id: 1, name: 'Deploy to Cloudflare', head_sha: head, status: 'completed', conclusion, html_url: 'https://github.com/qiz029/super0to1-web/actions/runs/1' }] })
    if (url.includes('/deploy-meta.json')) return Response.json({ releaseId: servedRelease, commit: servedCommit })
    throw new Error('Unexpected network call in publication test')
  }
  try {
    const id = crypto.randomUUID()
    assert.equal((await request('/api/releases', 'POST', { revision: 1, requestId: id })).status, 202)
    const status = (releaseId: string) => (database.prepare('SELECT status FROM releases WHERE id = ?').get(releaseId) as { status: string }).status
    assert.equal(status(id), 'deploying')
    servedRelease = id; servedCommit = 'different-commit'
    await reconcile(env)
    assert.equal(status(id), 'verification_failed')
    const retry = crypto.randomUUID()
    await request('/api/releases', 'POST', { fromRelease: id, requestId: retry })
    servedRelease = retry; servedCommit = head
    await reconcile(env)
    assert.equal(status(retry), 'live')
    const draft = (await (await request('/api/state')).json() as StateView).data
    draft.sessions[0].title.zh = '这份草稿不应被恢复操作覆盖'
    await request('/api/state', 'PUT', { revision: 1, data: draft })
    const rollback = crypto.randomUUID()
    await request('/api/releases', 'POST', { fromRelease: retry, requestId: rollback })
    assert.notEqual(remote.sessions[0].title.zh, draft.sessions[0].title.zh)
    assert.equal((await (await request('/api/state')).json() as StateView).data.sessions[0].title.zh, draft.sessions[0].title.zh)
    conclusion = 'failure'; servedRelease = rollback; servedCommit = head
    await reconcile(env)
    assert.equal(status(rollback), 'verification_failed')
    assert.equal(writes, 3)
  } finally { globalThis.fetch = originalFetch }
})
