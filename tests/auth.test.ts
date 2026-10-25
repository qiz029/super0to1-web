import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { generateKeyPair, exportJWK, SignJWT } from 'jose'
import { authenticate, requireAdmin } from '../cms/worker/auth'
import type { Env } from '../cms/worker/types'

test('Access validates signatures, audience and membership instead of trusting email headers', async () => {
  const { privateKey, publicKey } = await generateKeyPair('RS256')
  const key = { ...await exportJWK(publicKey), kid: 'test-key', alg: 'RS256', use: 'sig' }
  const server = createServer((_request, response) => { response.setHeader('Content-Type', 'application/json'); response.end(JSON.stringify({ keys: [key] })) })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  try {
    const address = server.address()
    assert(address && typeof address !== 'string')
    const issuer = `http://127.0.0.1:${address.port}`
    const env = { ACCESS_TEAM_URL: issuer, ACCESS_AUD: 'cms-only', CMS_OWNER_EMAIL: 'owner@example.test', DB: { prepare() { return { bind(email: string) { return { async first() { return email === 'editor@example.test' ? { role: 'editor' } : null } } } } } } } as unknown as Env
    async function token(email: string, audience = 'cms-only') { return new SignJWT({ email }).setProtectedHeader({ alg: 'RS256', kid: 'test-key' }).setIssuer(issuer).setAudience(audience).setIssuedAt().setExpirationTime('5m').sign(privateKey) }
    const request = (jwt: string) => new Request('https://cms.super0to1.com/api/state', { headers: { 'Cf-Access-Jwt-Assertion': jwt, 'Cf-Access-Authenticated-User-Email': 'owner@example.test' } })
    await assert.rejects(authenticate(request('forged'), env), { status: 401 })
    await assert.rejects(authenticate(request(await token('owner@example.test', 'another-app')), env), { status: 401 })
    await assert.rejects(authenticate(request(await token('outsider@example.test')), env), { status: 403 })
    assert.deepEqual(await authenticate(request(await token('owner@example.test')), env), { email: 'owner@example.test', role: 'admin' })
    const editor = await authenticate(request(await token('editor@example.test')), env)
    assert.equal(editor.role, 'editor')
    assert.throws(() => requireAdmin(editor), { status: 403 })
  } finally { await new Promise<void>(resolve => server.close(() => resolve())) }
})
