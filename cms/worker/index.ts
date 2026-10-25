import { z } from 'zod'
import seed from '../../content/published/site.json'
import { snapshotSchema, contentIssues, publicSnapshot, type Snapshot } from '../../shared/content'
import { authenticate, requireAdmin, requireSameOrigin } from './auth'
import { commitSnapshot, github } from './github'
import { translateContent } from './translate'
import { HttpError, type Actor, type Env, type StateRow, type ReleaseRow, type MediaRow } from './types'

const now = () => new Date().toISOString()
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } })
const id = () => crypto.randomUUID()
const releaseView = ({ data: _data, ...row }: ReleaseRow) => row
export async function readJson(request: Request) {
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) throw new HttpError(415, '请发送 JSON 数据。')
  const body = await limitedBody(request, 2_000_000)
  try { return JSON.parse(new TextDecoder().decode(body)) } catch { throw new HttpError(400, '内容格式无效。') }
}
export async function limitedBody(request: Request, limit: number): Promise<Uint8Array<ArrayBuffer>> {
  if (Number(request.headers.get('Content-Length')) > limit) throw new HttpError(413, '文件或内容过大。')
  if (!request.body) throw new HttpError(400, '请求内容为空。')
  const reader = request.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    size += value.length
    if (size > limit) { await reader.cancel(); throw new HttpError(413, '文件或内容过大。') }
    chunks.push(value)
  }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  return bytes
}
async function state(env: Env): Promise<StateRow> {
  await env.DB.prepare('INSERT OR IGNORE INTO state VALUES (1, 1, ?, ?, ?)').bind(JSON.stringify(seed), now(), 'initial import').run()
  return (await env.DB.prepare('SELECT * FROM state WHERE id = 1').first<StateRow>())!
}
async function latestPublic(env: Env): Promise<Snapshot> {
  const row = await env.DB.prepare("SELECT data FROM releases WHERE status = 'live' ORDER BY created_at DESC LIMIT 1").first<{ data: string }>()
  return row ? snapshotSchema.parse(JSON.parse(row.data)) : snapshotSchema.parse(seed)
}
async function savedRevision(env: Env, revision: number) {
  const row = await env.DB.prepare('SELECT data FROM revisions WHERE revision = ?').bind(revision).first<{ data: string }>()
  if (!row) throw new HttpError(404, '找不到这个草稿版本。')
  return snapshotSchema.parse(JSON.parse(row.data))
}
function transformMedia(data: Snapshot, preview: boolean) {
  return JSON.parse(JSON.stringify(data).replace(/"media:([a-f0-9]{64})"/g, (_, hash: string) => JSON.stringify(preview ? `/api/media/${hash}` : `/cms-media/${hash}.webp`))) as Snapshot
}
async function promoteMedia(env: Env, data: Snapshot) {
  const hashes = [...new Set([...JSON.stringify(data).matchAll(/"media:([a-f0-9]{64})"/g)].map(match => match[1]))]
  for (const hash of hashes) {
    const object = await env.MEDIA.get(`original/${hash}.webp`)
    if (!object) throw new HttpError(422, '发布内容引用了一张不存在的图片，请重新选择。')
    await env.MEDIA.put(`published/${hash}.webp`, object.body, { httpMetadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' } })
  }
  return transformMedia(data, false)
}
async function locks(env: Env, data: Snapshot) {
  const existing = await env.DB.prepare('SELECT kind, id, path FROM content_paths').all<{ kind: 'sessions' | 'videos' | 'projects'; id: string; path: string }>()
  for (const row of existing.results) {
    const collection = data[row.kind]
    const item = collection.find(x => x.id === row.id)
    if (item && ('slug' in item ? item.slug : item.youtubeId) !== row.path) throw new HttpError(422, '已发布内容的网址不可更改，请新建内容。')
    if (collection.some(x => x.id !== row.id && ('slug' in x ? x.slug : x.youtubeId) === row.path)) throw new HttpError(422, '这个网址已被其他内容使用。')
  }
}
async function rememberPaths(env: Env, data: Snapshot) {
  const statements = (['sessions', 'videos', 'projects'] as const).flatMap(kind => data[kind].map(item => env.DB.prepare('INSERT OR IGNORE INTO content_paths (kind, id, path) VALUES (?, ?, ?)').bind(kind, item.id, 'slug' in item ? item.slug : item.youtubeId)))
  if (statements.length) await env.DB.batch(statements)
}
async function createRelease(env: Env, actor: Actor, input: unknown) {
  requireAdmin(actor)
  const body = z.object({ revision: z.number().int().positive().optional(), fromRelease: z.string().max(80).optional(), requestId: z.uuid() }).strict().parse(input)
  const duplicate = await env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind(body.requestId).first<ReleaseRow>()
  if (duplicate) return releaseView(duplicate)
  let data: Snapshot, revision: number
  if (body.fromRelease) {
    const previous = await env.DB.prepare("SELECT * FROM releases WHERE id = ? AND status IN ('live','failed','verification_failed')").bind(body.fromRelease).first<ReleaseRow>()
    if (!previous) throw new HttpError(404, '找不到可重新发布的版本。')
    data = snapshotSchema.parse(JSON.parse(previous.data)); revision = previous.revision
  } else {
    const current = await state(env)
    if (!body.revision || body.revision !== current.revision) throw new HttpError(409, '草稿已更新，请重新载入并预览后发布。')
    data = snapshotSchema.parse(JSON.parse(current.data)); revision = current.revision
  }
  await locks(env, data)
  const issues = contentIssues(data, await latestPublic(env))
  if (issues.length) throw new HttpError(422, '请先完成发布检查。', issues)
  data = publicSnapshot(data, body.requestId)
  const timestamp = now()
  try {
    await env.DB.prepare("INSERT INTO releases (id, revision, data, status, created_at, updated_at, created_by) VALUES (?, ?, ?, 'preparing', ?, ?, ?)").bind(body.requestId, revision, JSON.stringify(data), timestamp, timestamp, actor.email).run()
  } catch {
    const same = await env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind(body.requestId).first<ReleaseRow>()
    if (same) return releaseView(same)
    const active = await env.DB.prepare("SELECT id FROM releases WHERE status IN ('preparing','deploying')").first()
    if (active) throw new HttpError(409, '已有内容正在发布。你可以继续保存草稿，待本次发布结束后再发布。')
    throw new HttpError(500, '无法创建发布记录，请重试。')
  }
  return releaseView((await env.DB.prepare('SELECT * FROM releases WHERE id = ?').bind(body.requestId).first<ReleaseRow>())!)
}

export async function reconcile(env: Env) {
  const active = await env.DB.prepare("SELECT * FROM releases WHERE status IN ('preparing','deploying') ORDER BY created_at LIMIT 1").first<ReleaseRow>()
  if (!active) return
  const claim = await env.DB.prepare("UPDATE releases SET lease_until = ? WHERE id = ? AND (lease_until IS NULL OR lease_until < ?) AND status IN ('preparing','deploying')").bind(new Date(Date.now() + 90000).toISOString(), active.id, now()).run()
  if (!claim.meta.changes) return
  try {
    if (active.status === 'preparing') {
      const data = await promoteMedia(env, snapshotSchema.parse(JSON.parse(active.data)))
      const commit = await commitSnapshot(env, data)
      await rememberPaths(env, data)
      await env.DB.prepare("UPDATE releases SET data = ?, commit_sha = ?, status = 'deploying', updated_at = ?, error = NULL WHERE id = ?").bind(JSON.stringify(data), commit, now(), active.id).run()
      return
    }
    const result = await github<{ workflow_runs: { id: number; name: string; head_sha: string; status: string; conclusion: string | null; html_url: string }[] }>(env, `/actions/runs?head_sha=${active.commit_sha}&event=push&per_page=20`)
    const run = result.workflow_runs.find(x => x.name === 'Deploy to Cloudflare' && x.head_sha === active.commit_sha)
    if (run) await env.DB.prepare('UPDATE releases SET run_url = ? WHERE id = ?').bind(run.html_url, active.id).run()
    if (!run || run.status !== 'completed') {
      if (Date.now() - Date.parse(active.created_at) > 30 * 60 * 1000) throw new HttpError(504, '发布等待超时，请检查部署记录后重试。')
      return
    }
    const liveResponse = await fetch(`https://super0to1.com/deploy-meta.json?release=${active.id}`, { cache: 'no-store' })
    const live = liveResponse.ok ? await liveResponse.json() as { releaseId?: string; commit?: string } : null
    if (run.conclusion === 'success' && live?.releaseId === active.id && live.commit === active.commit_sha) {
      await env.DB.prepare("UPDATE releases SET status = 'live', updated_at = ?, error = NULL WHERE id = ?").bind(now(), active.id).run()
    } else {
      const status = run.conclusion === 'success' || live?.releaseId === active.id ? 'verification_failed' : 'failed'
      await env.DB.prepare('UPDATE releases SET status = ?, updated_at = ?, error = ? WHERE id = ?').bind(status, now(), status === 'verification_failed' ? '线上版本需要核对。请查看部署记录，可以重新发布此版本或恢复历史版本。' : '部署检查未通过，查看部署记录后重试。', active.id).run()
    }
  } catch (error) {
    const message = error instanceof HttpError ? error.message : '发布连接暂时不可用，正在重试。'
    const result = await env.DB.prepare('UPDATE releases SET attempts = attempts + 1, error = ?, updated_at = ? WHERE id = ? RETURNING attempts').bind(message, now(), active.id).first<{ attempts: number }>()
    if ((result?.attempts ?? 0) >= 3) await env.DB.prepare("UPDATE releases SET status = 'failed' WHERE id = ?").bind(active.id).run()
  } finally { await env.DB.prepare('UPDATE releases SET lease_until = NULL WHERE id = ?').bind(active.id).run() }
}

export async function cmsApi(request: Request, env: Env, actor: Actor, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url), path = url.pathname
  if (path === '/api/translate' && request.method === 'POST') return json(await translateContent(env, actor, await readJson(request)))
  if (path === '/api/state' && request.method === 'GET') {
    const row = await state(env)
    await rememberPaths(env, snapshotSchema.parse(seed))
    const data = snapshotSchema.parse(JSON.parse(row.data))
    return json({ data, revision: row.revision, updatedAt: row.updated_at, actor, issues: contentIssues(data, await latestPublic(env)) })
  }
  if (path === '/api/state' && request.method === 'PUT') {
    const body = z.object({ revision: z.number().int().positive(), data: snapshotSchema }).strict().parse(await readJson(request))
    if (actor.role !== 'admin') {
      const current = await state(env)
      if (JSON.stringify(JSON.parse(current.data).site) !== JSON.stringify(body.data.site)) throw new HttpError(403, '只有管理员可以修改站点设置。')
    }
    await locks(env, body.data)
    const timestamp = now()
    const result = await env.DB.prepare('UPDATE state SET data = ?, revision = revision + 1, updated_at = ?, updated_by = ? WHERE id = 1 AND revision = ? RETURNING revision').bind(JSON.stringify(body.data), timestamp, actor.email, body.revision).first<{ revision: number }>()
    if (!result) throw new HttpError(409, '其他人已更新内容。请先复制你的修改，再重新载入最新草稿。')
    return json({ revision: result.revision, updatedAt: timestamp, issues: contentIssues(body.data, await latestPublic(env)) })
  }
  if (path === '/api/previews' && request.method === 'POST') {
    const { revision } = z.object({ revision: z.number().int().positive() }).strict().parse(await readJson(request))
    const data = await savedRevision(env, revision), previewId = id()
    await env.DB.prepare('INSERT INTO previews VALUES (?, ?, ?)').bind(previewId, JSON.stringify(transformMedia(data, true)), new Date(Date.now() + 86400000).toISOString()).run()
    return json({ id: previewId }, 201)
  }
  const previewId = path.match(/^\/api\/previews\/([a-f0-9-]{36})$/)?.[1]
  if (previewId && request.method === 'GET') {
    const preview = await env.DB.prepare('SELECT data FROM previews WHERE id = ? AND expires_at > ?').bind(previewId, now()).first<{ data: string }>()
    if (!preview) throw new HttpError(404, '预览已过期，请重新生成。')
    return json(JSON.parse(preview.data))
  }
  if (path === '/api/releases' && request.method === 'GET') {
    ctx.waitUntil(reconcile(env))
    const result = await env.DB.prepare('SELECT * FROM releases ORDER BY created_at DESC LIMIT 50').all<ReleaseRow>()
    return json({ releases: result.results.map(releaseView) })
  }
  if (path === '/api/releases' && request.method === 'POST') {
    const release = await createRelease(env, actor, await readJson(request))
    ctx.waitUntil(reconcile(env))
    return json(release, 202)
  }
  if (path === '/api/media' && request.method === 'GET') {
    const result = await env.DB.prepare('SELECT * FROM media ORDER BY created_at DESC LIMIT 500').all<MediaRow>()
    return json({ media: result.results })
  }
  if (path === '/api/media' && request.method === 'POST') {
    if (request.headers.get('Content-Type') !== 'image/webp') throw new HttpError(415, '请通过图片上传器上传 WebP 图片。')
    const bytes = await limitedBody(request, 8 * 1024 * 1024)
    if (new TextDecoder().decode(bytes.slice(0, 4)) !== 'RIFF' || new TextDecoder().decode(bytes.slice(8, 12)) !== 'WEBP') throw new HttpError(415, '图片格式无效。')
    const width = Number(request.headers.get('X-Image-Width')), height = Number(request.headers.get('X-Image-Height'))
    if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || width > 4096 || height > 4096) throw new HttpError(422, '图片尺寸无效。')
    const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(x => x.toString(16).padStart(2, '0')).join('')
    let name = 'image.webp'
    try { name = decodeURIComponent(request.headers.get('X-File-Name') || name).slice(0, 200) } catch { /* use default name */ }
    await env.MEDIA.put(`original/${hash}.webp`, bytes, { httpMetadata: { contentType: 'image/webp' } })
    await env.DB.prepare('INSERT OR IGNORE INTO media VALUES (?, ?, ?, ?, ?, ?, ?)').bind(hash, name, bytes.length, width, height, now(), actor.email).run()
    return json({ id: hash, reference: `media:${hash}`, name, width, height }, 201)
  }
  const mediaId = path.match(/^\/api\/media\/([a-f0-9]{64})$/)?.[1]
  if (mediaId && request.method === 'GET') {
    const object = await env.MEDIA.get(`original/${mediaId}.webp`)
    if (!object) throw new HttpError(404, '找不到图片。')
    return new Response(object.body, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
  }
  if (path === '/api/members' && request.method === 'GET') {
    requireAdmin(actor)
    return json({ members: (await env.DB.prepare('SELECT email, role FROM members ORDER BY email').all()).results })
  }
  if (path === '/api/members' && request.method === 'PUT') {
    requireAdmin(actor)
    const member = z.object({ email: z.email(), role: z.enum(['admin', 'editor']) }).strict().parse(await readJson(request))
    await env.DB.prepare('INSERT INTO members VALUES (?, ?) ON CONFLICT(email) DO UPDATE SET role = excluded.role').bind(member.email.toLowerCase(), member.role).run()
    return json({ ok: true })
  }
  throw new HttpError(404, '找不到这个操作。')
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    try {
      const url = new URL(request.url)
      if (url.hostname === 'mcp.super0to1.com' || url.pathname === '/mcp' || url.pathname.startsWith('/oauth/') || url.pathname.startsWith('/.well-known/') || url.pathname.startsWith('/api/mcp/')) {
        const { handleMcpRequest } = await import('./mcp-auth')
        return await handleMcpRequest(request, env, ctx)
      }
      const actor = await authenticate(request, env)
      requireSameOrigin(request)
      const path = new URL(request.url).pathname
      const response = path.startsWith('/api/') ? await cmsApi(request, env, actor, ctx) : ['GET', 'HEAD'].includes(request.method) ? await env.ASSETS.fetch(request) : json({ error: 'Method not allowed' }, 405)
      const headers = new Headers(response.headers)
      headers.set('Cache-Control', 'private, no-store')
      headers.set('X-Robots-Tag', 'noindex, nofollow')
      headers.set('X-Content-Type-Options', 'nosniff')
      headers.set('Referrer-Policy', 'same-origin')
      headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https:; frame-src 'self' https://www.youtube-nocookie.com; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'; form-action 'self'")
      return new Response(response.body, { status: response.status, headers })
    } catch (error) {
      if (error instanceof z.ZodError) return json({ error: '请检查输入格式。', details: error.issues.map(issue => ({ path: issue.path.join('.'), message: issue.message })) }, 422)
      if (error instanceof HttpError) return json({ error: error.message, details: error.details }, error.status)
      console.error('CMS request failed', error instanceof Error ? error.name : 'UnknownError')
      return json({ error: '操作暂时失败，请稍后重试。' }, 500)
    }
  },
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(reconcile(env))
    ctx.waitUntil(env.DB.prepare('DELETE FROM previews WHERE expires_at < ?').bind(now()).run())
    ctx.waitUntil(env.DB.prepare('DELETE FROM mcp_consents WHERE expires_at < ?').bind(now()).run())
    ctx.waitUntil(env.DB.prepare('DELETE FROM mcp_rate_limits WHERE expires_at < ?').bind(Date.now()).run())
  },
}
