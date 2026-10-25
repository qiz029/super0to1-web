import { AuthorizationError, CimdFetchError, OAuthAuthorizationServer, OAuthError, OAuthResourceServer } from '@cloudflare/workers-oauth-provider'
import { z } from 'zod'
import { mcpScopes } from '../../shared/mcp'
import { authenticate, memberActor, requireSameOrigin } from './auth'
import { limitedBody, readJson } from './index'
import { mcpHandler } from './mcp-tools'
import { HttpError, type Actor, type Env } from './types'

const IDLE_SECONDS = 90 * 86400
const iso = () => new Date().toISOString()
const hash = async (value: string) => [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value)))].map(x => x.toString(16).padStart(2, '0')).join('')
type Connection = { id: string; email: string; client_id: string; client_name: string; grant_id: string | null; scopes: string; created_at: string; last_used_at: string | null; expires_at: string; revoked_at: string | null }
type TokenProps = { connectionId: string }

function origins(request: Request, env: Env) {
  const url = new URL(request.url)
  const local = (env.CMS_DEV === true || env.CMS_DEV === 'true') && ['localhost', '127.0.0.1'].includes(url.hostname)
  return { local, cms: local ? url.origin : 'https://cms.super0to1.com', mcp: local ? url.origin : 'https://mcp.super0to1.com' }
}
async function connection(env: Env, id: string): Promise<Connection> {
  if (!z.uuid().safeParse(id).success) throw new HttpError(401, 'MCP 授权无效，请重新连接。')
  const row = await env.DB.prepare('SELECT * FROM mcp_connections WHERE id = ? AND revoked_at IS NULL AND expires_at > ?').bind(id, iso()).first<Connection>()
  if (!row) throw new HttpError(401, 'MCP 授权已撤销或过期，请重新连接。')
  return row
}
async function connectionActor(env: Env, row: Connection, local: boolean): Promise<Actor> {
  if (local && row.email === 'local@example.test') return { email: row.email, role: 'admin' }
  return memberActor(row.email, env)
}
async function rateLimit(request: Request, env: Env, category: string, maximum: number, subject?: string) {
  const period = Math.floor(Date.now() / 3600000)
  const key = `${category}:${period}:${await hash(subject ?? request.headers.get('CF-Connecting-IP') ?? 'local')}`
  const row = await env.DB.prepare('INSERT INTO mcp_rate_limits (key, count, expires_at) VALUES (?, 1, ?) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count').bind(key, (period + 1) * 3600000).first<{ count: number }>()
  if (!row || row.count > maximum) throw new HttpError(429, '请求过于频繁，请稍后重试。')
}
function authorizationServer(request: Request, env: Env) {
  const { local, cms, mcp } = origins(request, env)
  return new OAuthAuthorizationServer<Env>({
    issuer: mcp, resources: [`${mcp}/mcp`], authorizeEndpoint: `${cms}/oauth/authorize`,
    clientRegistrationEndpoint: `${mcp}/oauth/register`, scopesSupported: [...mcpScopes],
    accessTokenTTL: 3600, refreshTokenTTL: IDLE_SECONDS, refreshTokenIdleTTL: IDLE_SECONDS,
    clientRegistrationTTL: IDLE_SECONDS, clientIdMetadataDocumentEnabled: !local,
    tokenExchangeCallback: async options => {
      try {
        const props = z.object({ connectionId: z.uuid() }).parse(options.props)
        const row = await connection(options.env, props.connectionId)
        if (row.email !== options.userId || row.client_id !== options.clientId) throw new Error('Grant identity mismatch')
        const actor = await connectionActor(options.env, row, local)
        const scopes = options.requestedScope.filter(scope => actor.role === 'admin' || !['cms:publish', 'cms:settings'].includes(scope))
        await options.env.DB.prepare('UPDATE mcp_connections SET grant_id = ?, expires_at = ?, last_used_at = ? WHERE id = ? AND revoked_at IS NULL').bind(options.grantId, new Date(Date.now() + (options.scope.includes('offline_access') ? IDLE_SECONDS : 3600) * 1000).toISOString(), iso(), row.id).run()
        return { accessTokenScope: scopes }
      } catch (error) {
        if (error instanceof HttpError || error instanceof z.ZodError || error instanceof Error && error.message === 'Grant identity mismatch') throw new OAuthError('invalid_grant', { description: 'This CMS connection is no longer authorized.' })
        throw error
      }
    },
  })
}
function secure(response: Response, publicEndpoint = false, origin?: string | null) {
  const headers = new Headers(response.headers)
  headers.set('Cache-Control', 'private, no-store')
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('X-Robots-Tag', 'noindex, nofollow')
  headers.set('Referrer-Policy', 'no-referrer')
  headers.set('X-Frame-Options', 'DENY')
  headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'")
  if (publicEndpoint) {
    headers.set('Access-Control-Allow-Origin', origin || '*')
    headers.set('Access-Control-Allow-Headers', 'Authorization, Content-Type, MCP-Protocol-Version, MCP-Session-Id, Last-Event-ID')
    headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS')
    headers.set('Access-Control-Expose-Headers', 'WWW-Authenticate, MCP-Session-Id')
    headers.append('Vary', 'Origin')
  }
  return new Response(response.body, { status: response.status, headers })
}

export async function handleMcpRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url), { local, cms, mcp } = origins(request, env)
  const path = url.pathname
  const protocol = url.origin === mcp && (path === '/mcp' || path.startsWith('/.well-known/') || path === '/oauth/token' || path === '/oauth/register')
  try {
    if (protocol) {
      const origin = request.headers.get('Origin')
      if (origin && ![mcp, cms, 'https://claude.ai', 'https://chatgpt.com', 'https://vscode.dev'].includes(origin)) return secure(Response.json({ error: 'Origin not allowed' }, { status: 403 }))
      if (request.method === 'OPTIONS') return secure(new Response(null, { status: 204 }), true, origin)
      if (request.method === 'POST') {
        await rateLimit(request, env, path, path === '/oauth/register' ? 30 : 1200)
        // Bound memory before handing requests to the protocol libraries.
        const body = await limitedBody(request, path === '/mcp' ? 12 * 1024 * 1024 : 32 * 1024)
        request = new Request(request, { body })
      }
      const server = authorizationServer(request, env)
      if (path === '/mcp' || path.startsWith('/.well-known/oauth-protected-resource')) {
        const resource = new OAuthResourceServer<Env, TokenProps>({
          resourceMetadata: { resource: `${mcp}/mcp`, authorization_servers: [mcp], resource_name: 'Super 0→1 CMS' },
          requiredScopes: ['cms:read'],
          validateToken: currentEnv => async (audience, token) => {
            const validated = await server.validateToken<TokenProps>(audience, token, currentEnv)
            if (!validated) return null
            if (!validated.scope.includes('cms:read')) throw new OAuthError('insufficient_scope', { description: 'CMS read permission is required.', requiredScopes: ['cms:read'] })
            try {
              const row = await connection(currentEnv, validated.props.connectionId)
              if (row.email !== validated.userId || row.client_id !== validated.clientId) return null
              await connectionActor(currentEnv, row, local)
              return validated
            } catch (error) { if (error instanceof HttpError) return null; throw error }
          },
          handler: { async fetch(req, currentEnv, resourceCtx) {
            if (!resourceCtx.auth.scope.includes('cms:read')) throw new HttpError(403, '当前连接没有读取内容的授权。')
            const row = await connection(currentEnv, resourceCtx.props.connectionId)
            const actor = await connectionActor(currentEnv, row, local)
            await rateLimit(req, currentEnv, 'connection', 1200, row.id)
            await currentEnv.DB.prepare('UPDATE mcp_connections SET last_used_at = ? WHERE id = ? AND (last_used_at IS NULL OR last_used_at < ?)').bind(iso(), row.id, new Date(Date.now() - 15 * 60000).toISOString()).run()
            return mcpHandler(currentEnv, actor, resourceCtx.auth.scope, cms, ctx).fetch(req)
          } },
        })
        return secure(await resource.fetch(request, env, ctx), true, origin)
      }
      return secure(await server.fetch(request, env, ctx), true, origin)
    }
    // The public MCP hostname can never serve CMS assets, consent UI or browser APIs.
    if (url.origin !== cms || !['/oauth/authorize', '/api/mcp/info', '/api/mcp/consent', '/api/mcp/connections'].includes(path)) return secure(Response.json({ error: 'Not found' }, { status: 404 }))
    const actor = await authenticate(request, env)
    requireSameOrigin(request)
    if (path === '/oauth/authorize' && request.method === 'GET') return secure(await env.ASSETS.fetch(new Request(`${cms}/`, request)))
    if (path === '/api/mcp/info' && request.method === 'GET') return secure(Response.json({ endpoint: `${mcp}/mcp`, actor, idleDays: 90, serverTime: iso() }))
    const server = authorizationServer(request, env), oauth = server.getOAuthApi(env)
    if (path === '/api/mcp/connections' && request.method === 'GET') {
      const rows = await env.DB.prepare('SELECT id, client_id, client_name, scopes, created_at, last_used_at, expires_at, revoked_at FROM mcp_connections WHERE email = ? ORDER BY created_at DESC LIMIT 100').bind(actor.email).all<Omit<Connection, 'email' | 'grant_id'>>()
      return secure(Response.json({ connections: rows.results.map(row => ({ ...row, scopes: JSON.parse(row.scopes) })) }))
    }
    if (path === '/api/mcp/connections' && request.method === 'DELETE') {
      const { id } = z.object({ id: z.uuid() }).strict().parse(await readJson(request))
      const row = await env.DB.prepare('SELECT * FROM mcp_connections WHERE id = ? AND email = ?').bind(id, actor.email).first<Connection>()
      if (!row) throw new HttpError(404, '找不到这个授权。')
      // D1 takes effect before KV cleanup, including across KV propagation delays.
      await env.DB.prepare('UPDATE mcp_connections SET revoked_at = ? WHERE id = ? AND email = ?').bind(iso(), id, actor.email).run()
      if (row.grant_id) ctx.waitUntil(oauth.revokeGrant(row.grant_id, actor.email))
      return secure(Response.json({ ok: true }))
    }
    if (path === '/api/mcp/consent' && request.method === 'GET') {
      await rateLimit(request, env, 'consent', 60, actor.email)
      const auth = await oauth.parseAuthRequest(new Request(`${cms}/oauth/authorize${url.search}`))
      if (!auth.codeChallenge || auth.codeChallengeMethod !== 'S256') throw new HttpError(400, '客户端必须支持 PKCE S256，请使用支持 OAuth 的 MCP 客户端。')
      const details = await oauth.describeConsent(auth)
      const consent = await oauth.beginConsent(auth)
      await env.DB.prepare('INSERT INTO mcp_consents (handle_hash, email, expires_at) VALUES (?, ?, ?)').bind(await hash(consent.handle), actor.email, new Date(Date.now() + 10 * 60000).toISOString()).run()
      return secure(Response.json({ details, handle: consent.handle, actor }, { headers: consent.headers }))
    }
    if (path === '/api/mcp/consent' && request.method === 'POST') {
      const input = z.object({ handle: z.string().min(1).max(512), decision: z.enum(['approve', 'deny']), scopes: z.array(z.enum(mcpScopes)).max(mcpScopes.length) }).strict().parse(await readJson(request))
      const consumed = await env.DB.prepare('DELETE FROM mcp_consents WHERE handle_hash = ? AND email = ? AND expires_at > ? RETURNING email').bind(await hash(input.handle), actor.email, iso()).first()
      if (!consumed) throw new HttpError(400, '授权页面已过期或账号已变化，请从客户端重新连接。')
      if (input.decision === 'deny') {
        const denied = await oauth.denyConsent(request, input.handle)
        const redirectTo = denied.headers.get('Location')
        denied.headers.delete('Location')
        return secure(Response.json({ redirectTo }, { headers: denied.headers }))
      }
      const scopes = [...new Set(input.scopes)]
      if (!scopes.includes('cms:read')) throw new HttpError(400, '连接至少需要读取内容的权限。')
      if (actor.role !== 'admin' && scopes.some(scope => ['cms:publish', 'cms:settings'].includes(scope))) throw new HttpError(403, '只有管理员可以授予发布或站点设置权限。')
      const approved = await oauth.approveConsent(request, input.handle, { scope: scopes })
      const client = await oauth.lookupClient(approved.request.clientId)
      const connectionId = crypto.randomUUID()
      await env.DB.prepare('INSERT INTO mcp_connections (id, email, client_id, client_name, scopes, created_at, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(connectionId, actor.email, approved.request.clientId, (client?.clientName || 'MCP 客户端').slice(0, 200), JSON.stringify(scopes), iso(), new Date(Date.now() + (scopes.includes('offline_access') ? IDLE_SECONDS : 3600) * 1000).toISOString()).run()
      try {
        const result = await oauth.completeAuthorization({ request: approved.request, userId: actor.email, metadata: { connectionId }, scope: scopes, props: { connectionId } })
        await env.DB.prepare('UPDATE mcp_connections SET revoked_at = ? WHERE email = ? AND client_id = ? AND id <> ? AND revoked_at IS NULL').bind(iso(), actor.email, approved.request.clientId, connectionId).run()
        return secure(Response.json(result, { headers: approved.headers }))
      } catch (error) {
        await env.DB.prepare('UPDATE mcp_connections SET revoked_at = ? WHERE id = ?').bind(iso(), connectionId).run()
        throw error
      }
    }
    return secure(Response.json({ error: 'Method not allowed' }, { status: 405 }))
  } catch (error) {
    if (error instanceof AuthorizationError || error instanceof CimdFetchError) return secure(Response.json({ error: error instanceof AuthorizationError ? error.description : '无法验证客户端信息，请重新连接。' }, { status: 400 }))
    if (error instanceof z.ZodError) return secure(Response.json({ error: '请求格式无效。' }, { status: 400 }))
    if (error instanceof HttpError) return secure(Response.json({ error: error.message }, { status: error.status }), protocol, request.headers.get('Origin'))
    throw error
  }
}
