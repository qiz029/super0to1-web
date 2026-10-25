import { createRemoteJWKSet, jwtVerify } from 'jose'
import { HttpError, type Actor, type Env } from './types'

const keysets = new Map<string, ReturnType<typeof createRemoteJWKSet>>()
export async function authenticate(request: Request, env: Env): Promise<Actor> {
  const url = new URL(request.url)
  if ((env.CMS_DEV === 'true' || env.CMS_DEV === true) && ['localhost', '127.0.0.1'].includes(url.hostname)) return { email: 'local@example.test', role: 'admin' }
  if (!env.ACCESS_TEAM_URL || !env.ACCESS_AUD) throw new HttpError(503, '管理后台登录正在配置中。')
  const token = request.headers.get('Cf-Access-Jwt-Assertion')
  if (!token) throw new HttpError(401, '请先登录管理后台。')
  let email: string
  try {
    const issuer = new URL(env.ACCESS_TEAM_URL).origin
    let keys = keysets.get(issuer)
    if (!keys) { keys = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)); keysets.set(issuer, keys) }
    const { payload } = await jwtVerify(token, keys, { issuer, audience: env.ACCESS_AUD, algorithms: ['RS256'] })
    if (typeof payload.email !== 'string') throw new Error('Identity missing')
    email = payload.email.toLowerCase()
  } catch { throw new HttpError(401, '登录已过期，请重新登录。') }
  if (env.CMS_OWNER_EMAIL && email === env.CMS_OWNER_EMAIL.toLowerCase()) return { email, role: 'admin' }
  const member = await env.DB.prepare('SELECT role FROM members WHERE email = ?').bind(email).first<{ role: 'admin' | 'editor' }>()
  if (!member) throw new HttpError(403, '这个账号尚未获得网站编辑权限。')
  return { email, role: member.role }
}

export function requireAdmin(actor: Actor) {
  if (actor.role !== 'admin') throw new HttpError(403, '只有管理员可以发布内容或管理成员。')
}
export function requireSameOrigin(request: Request) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(request.method) && request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, '请求来源无效，请从管理后台操作。')
}
