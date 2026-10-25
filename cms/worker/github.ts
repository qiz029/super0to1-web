import { importPKCS8, SignJWT } from 'jose'
import type { Snapshot } from '../../shared/content'
import { HttpError, type Env } from './types'

const repository = 'qiz029/super0to1-web'
const contentPath = 'content/published/site.json'
let cached: { id: string; token: string; until: number } | undefined

async function installationToken(env: Env) {
  if (!env.GITHUB_APP_ID || !env.GITHUB_INSTALLATION_ID || !env.GITHUB_APP_PRIVATE_KEY) throw new HttpError(503, '发布连接尚未配置。')
  if (cached?.id === env.GITHUB_INSTALLATION_ID && cached.until > Date.now()) return cached.token
  const key = await importPKCS8(env.GITHUB_APP_PRIVATE_KEY, 'RS256')
  const jwt = await new SignJWT({}).setProtectedHeader({ alg: 'RS256' }).setIssuer(env.GITHUB_APP_ID).setIssuedAt(Math.floor(Date.now() / 1000) - 30).setExpirationTime('8m').sign(key)
  const response = await fetch(`https://api.github.com/app/installations/${env.GITHUB_INSTALLATION_ID}/access_tokens`, { method: 'POST', headers: { Authorization: `Bearer ${jwt}`, Accept: 'application/vnd.github+json', 'User-Agent': 'super0to1-cms', 'Content-Type': 'application/json' }, body: JSON.stringify({ repositories: ['super0to1-web'], permissions: { contents: 'write', actions: 'read' } }) })
  if (!response.ok) throw new HttpError(502, `GitHub 发布身份验证失败 (${response.status})`)
  const data = await response.json() as { token: string; expires_at: string }
  cached = { id: env.GITHUB_INSTALLATION_ID, token: data.token, until: Date.parse(data.expires_at) - 60000 }
  return data.token
}

export async function github<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
  const token = await installationToken(env)
  const response = await fetch(`https://api.github.com/repos/${repository}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'super0to1-cms', 'Content-Type': 'application/json', 'X-GitHub-Api-Version': '2022-11-28' } })
  if (!response.ok) throw new HttpError(response.status === 409 || response.status === 422 ? 409 : 502, `GitHub 操作失败 (${response.status})，请重试。`)
  return response.json() as Promise<T>
}

export async function commitSnapshot(env: Env, snapshot: Snapshot): Promise<string> {
  const current = await github<{ sha: string; content: string }>(env, `/contents/${contentPath}?ref=main`)
  const previous = JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(current.content.replace(/\s/g, '')), c => c.charCodeAt(0)))) as Snapshot
  // Recover a completed GitHub write after a timeout without creating another commit.
  if (previous.releaseId === snapshot.releaseId) {
    const commits = await github<{ sha: string }[]>(env, `/commits?path=${contentPath}&sha=main&per_page=1`)
    if (!commits[0]) throw new HttpError(502, '无法确认已提交的内容版本。')
    return commits[0].sha
  }
  const bytes = new TextEncoder().encode(JSON.stringify(snapshot, null, 2) + '\n')
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  const result = await github<{ commit: { sha: string } }>(env, `/contents/${contentPath}`, { method: 'PUT', body: JSON.stringify({ message: `Publish CMS content ${snapshot.releaseId}`, content: btoa(binary), sha: current.sha, branch: 'main' }) })
  return result.commit.sha
}
