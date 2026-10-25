import { test, expect, type Page, type APIRequestContext } from '@playwright/test'
import { createHash, randomBytes } from 'node:crypto'
import { Client, StreamableHTTPClientTransport } from '@modelcontextprotocol/client'

const origin = 'http://127.0.0.1:8788'
const resource = `${origin}/mcp`
const redirect = 'https://mcp-client.example.test/callback'
type Tokens = { access_token: string; refresh_token: string; scope: string; expires_in: number }
async function registration(request: APIRequestContext) {
  const response = await request.post('/oauth/register', { data: { client_name: 'CMS MCP test client', redirect_uris: [redirect], grant_types: ['authorization_code', 'refresh_token'], response_types: ['code'], token_endpoint_auth_method: 'none' } })
  expect(response.status()).toBe(201)
  return (await response.json()).client_id as string
}
async function authorization(page: Page, request: APIRequestContext, scopes = 'cms:read cms:write offline_access') {
  const clientId = await registration(request)
  const verifier = randomBytes(32).toString('base64url')
  const challenge = createHash('sha256').update(verifier).digest('base64url')
  const state = randomBytes(16).toString('hex')
  const query = new URLSearchParams({ client_id: clientId, redirect_uri: redirect, response_type: 'code', code_challenge: challenge, code_challenge_method: 'S256', state, resource, scope: scopes })
  await page.route(`${redirect}**`, route => route.fulfill({ contentType: 'text/html', body: '<p>Returned to MCP client</p>' }))
  await page.goto(`/oauth/authorize?${query}`)
  await expect(page.getByRole('heading', { name: '授权 MCP 连接' })).toBeVisible()
  await expect(page.getByRole('button', { name: '授权连接', exact: true })).toBeVisible()
  return { clientId, verifier, state, query }
}
async function approve(page: Page, request: APIRequestContext, auth: Awaited<ReturnType<typeof authorization>>) {
  await page.getByRole('button', { name: '授权连接', exact: true }).click()
  await page.waitForURL(`${redirect}**`)
  const callback = new URL(page.url())
  expect(callback.searchParams.get('state')).toBe(auth.state)
  const code = callback.searchParams.get('code')!
  expect(!!code).toBe(true)
  const wrongAudience = await request.post('/oauth/token', { form: { grant_type: 'authorization_code', client_id: auth.clientId, code, redirect_uri: redirect, code_verifier: auth.verifier, resource: 'https://different-resource.example.test/mcp' } })
  expect(wrongAudience.status()).toBe(400)
  const response = await request.post('/oauth/token', { form: { grant_type: 'authorization_code', client_id: auth.clientId, code, redirect_uri: redirect, code_verifier: auth.verifier, resource } })
  expect(response.status()).toBe(200)
  return { tokens: await response.json() as Tokens, code }
}
async function connect(token: string) {
  const client = new Client({ name: 'cms-verification', version: '1.0.0' })
  await client.connect(new StreamableHTTPClientTransport(new URL(resource), { requestInit: { headers: { Authorization: `Bearer ${token}` } } }))
  return client
}
function data(result: { content?: unknown }) {
  const content = result.content as { type: string; text: string }[]
  return JSON.parse(content.find(item => item.type === 'text')!.text)
}

test('CMS OAuth approval, MCP editing, renewal and immediate revocation work together', async ({ page, request }) => {
  const original = await (await request.get('/api/state')).json()
  let client: Client | undefined
  try {
    const challenge = await request.post('/mcp', { data: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
    expect(challenge.status()).toBe(401)
    expect(challenge.headers()['www-authenticate']).toContain('oauth-protected-resource')
    const metadata = await (await request.get('/.well-known/oauth-authorization-server')).json()
    expect(metadata.authorization_endpoint).toBe(`${origin}/oauth/authorize`)
    const auth = await authorization(page, request)
    await page.screenshot({ path: '/tmp/super0to1-mcp-consent.png', fullPage: true })
    await page.setViewportSize({ width: 390, height: 844 })
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
    const { tokens, code } = await approve(page, request, auth)
    expect(typeof tokens.refresh_token).toBe('string')
    expect(tokens.expires_in).toBe(3600)
    client = await connect(tokens.access_token)
    const tools = (await client.listTools()).tools.map(tool => tool.name)
    expect(tools).toContain('cms_save_session')
    expect(tools).not.toContain('cms_publish')
    expect(tools).not.toContain('cms_save_settings')
    const current = data(await client.callTool({ name: 'cms_get_state', arguments: {} }))
    const updated = { ...current.data.sessions[0], title: { ...current.data.sessions[0].title, zh: 'MCP 本地测试草稿' } }
    const saved = data(await client.callTool({ name: 'cms_save_session', arguments: { revision: current.revision, session: updated } }))
    expect(saved.revision).toBe(current.revision + 1)
    const conflict = await client.callTool({ name: 'cms_save_session', arguments: { revision: current.revision, session: updated } })
    expect(conflict.isError).toBe(true)
    expect(data(conflict).status).toBe(409)
    const deniedSettings = await client.callTool({ name: 'cms_save_draft', arguments: { revision: saved.revision, data: { ...current.data, site: { ...current.data.site, name: 'not permitted' } } } })
    expect(deniedSettings.isError).toBe(true)
    expect(data(deniedSettings).status).toBe(403)
    const preview = data(await client.callTool({ name: 'cms_create_preview', arguments: { revision: saved.revision } }))
    expect(preview.requiresCmsLogin).toBe(true)
    expect(preview.url).toContain('/preview.html?')
    const refresh = await request.post('/oauth/token', { form: { grant_type: 'refresh_token', client_id: auth.clientId, refresh_token: tokens.refresh_token, resource } })
    expect(refresh.status()).toBe(200)
    const renewed = await refresh.json() as Tokens
    expect(renewed.refresh_token !== tokens.refresh_token).toBe(true)
    await client.close()
    client = await connect(renewed.access_token)
    expect(data(await client.callTool({ name: 'cms_get_state', arguments: {} })).data.sessions[0].title.zh).toBe(updated.title.zh)
    await page.goto('/')
    await page.getByRole('button', { name: 'MCP 连接' }).click()
    await expect(page.getByRole('heading', { name: '把内容工作室接入 AI 助手' })).toBeVisible()
    await expect(page.getByLabel('Codex 安装命令')).toContainText('codex mcp add')
    const cards = page.locator('.mcp-connection').filter({ hasText: 'CMS MCP test client' })
    const activeCard = cards.filter({ has: page.getByRole('button', { name: '撤销授权', exact: true }) }).first()
    await page.setViewportSize({ width: 1440, height: 1000 })
    await page.screenshot({ path: '/tmp/super0to1-mcp-settings.png', fullPage: true })
    page.once('dialog', dialog => dialog.accept())
    await activeCard.getByRole('button', { name: '撤销授权', exact: true }).click()
    await expect(page.getByRole('status')).toContainText('授权已撤销')
    const revoked = await request.post('/mcp', { headers: { Authorization: `Bearer ${renewed.access_token}` }, data: { jsonrpc: '2.0', id: 1, method: 'tools/list' } })
    expect(revoked.status()).toBe(401)
    const deniedRefresh = await request.post('/oauth/token', { form: { grant_type: 'refresh_token', client_id: auth.clientId, refresh_token: renewed.refresh_token, resource } })
    expect(deniedRefresh.ok()).toBe(false)
    const reusedCode = await request.post('/oauth/token', { form: { grant_type: 'authorization_code', client_id: auth.clientId, code, redirect_uri: redirect, code_verifier: auth.verifier, resource } })
    expect(reusedCode.ok()).toBe(false)
  } finally {
    await client?.close()
    const latest = await (await request.get('/api/state')).json()
    const restored = await request.put('/api/state', { headers: { Origin: origin }, data: { revision: latest.revision, data: original.data } })
    expect(restored.ok()).toBe(true)
  }
})

test('OAuth rejects forged consent, invalid redirects, non-PKCE clients and declined access', async ({ page, request }) => {
  const auth = await authorization(page, request, 'cms:read offline_access')
  const fake = await request.post('/api/mcp/consent', { headers: { Origin: origin }, data: { handle: 'forged', decision: 'approve', scopes: ['cms:read'] } })
  expect(fake.status()).toBe(400)
  const csrf = await request.post('/api/mcp/consent', { headers: { Origin: 'https://evil.example.test' }, data: { handle: 'forged', decision: 'approve', scopes: ['cms:read'] } })
  expect(csrf.status()).toBe(403)
  const badRedirect = new URLSearchParams(auth.query); badRedirect.set('redirect_uri', 'https://evil.example.test/callback')
  expect((await request.get(`/api/mcp/consent?${badRedirect}`)).status()).toBe(400)
  const noPkce = new URLSearchParams(auth.query); noPkce.delete('code_challenge'); noPkce.delete('code_challenge_method')
  expect((await request.get(`/api/mcp/consent?${noPkce}`)).status()).toBe(400)
  await page.getByRole('button', { name: '拒绝', exact: true }).click()
  await page.waitForURL(`${redirect}**`)
  expect(new URL(page.url()).searchParams.get('error')).toBe('access_denied')
  expect(new URL(page.url()).searchParams.has('code')).toBe(false)
  const publicApi = await request.get('/api/state', { headers: { Host: 'mcp.super0to1.com' } })
  expect(publicApi.ok()).toBe(false)
})


test('a code needs its PKCE verifier and a consent handle cannot be used by another browser', async ({ page, request }) => {
  const auth = await authorization(page, request)
  await page.getByRole('button', { name: '授权连接', exact: true }).click()
  await page.waitForURL(`${redirect}**`)
  const code = new URL(page.url()).searchParams.get('code')!
  const wrongVerifier = await request.post('/oauth/token', { form: { grant_type: 'authorization_code', client_id: auth.clientId, code, redirect_uri: redirect, code_verifier: randomBytes(32).toString('base64url'), resource } })
  expect(wrongVerifier.ok()).toBe(false)
  const second = await authorization(page, request)
  // Only the page's request context holds this browser-bound consent cookie.
  const consent = await (await page.request.get(`/api/mcp/consent?${second.query}`)).json()
  const stolen = await request.post('/api/mcp/consent', { headers: { Origin: origin }, data: { handle: consent.handle, decision: 'approve', scopes: ['cms:read'] } })
  expect(stolen.status()).toBe(400)
})
