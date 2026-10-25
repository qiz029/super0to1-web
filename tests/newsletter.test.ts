import test from 'node:test'
import assert from 'node:assert/strict'
import { handleIntake } from '../worker/intake'

const email = 'test@example.test'
const payload = { type: 'newsletter', locale: 'en', requestId: 'c5d9e878-3e4b-4ad4-8f44-c81e88c1b245', email, website: '' }
const env = { BREVO_API_KEY: 'test-only-api-key', BREVO_LIST_ID: '7', GOOGLE_INTAKE_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_INTAKE_SECRET: 'test-only-secret' }
const request = () => new Request('https://super0to1.com/api/intake', { method: 'POST', headers: { Origin: 'https://super0to1.com', 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
const contact = { id: 42, email, emailBlacklisted: false, listIds: [7] }

function transport(replies: { status: number; body?: object }[]) {
  const calls: { url: string; method: string; body?: Record<string, unknown> }[] = []
  const send = (async (url, init) => {
    assert.equal(new Headers(init?.headers).get('api-key'), env.BREVO_API_KEY)
    calls.push({ url: String(url), method: init?.method ?? 'GET', body: init?.body ? JSON.parse(String(init.body)) : undefined })
    const next = replies.shift()
    assert(next, 'unexpected provider call')
    return next.status === 204 ? new Response(null, { status: 204 }) : Response.json(next.body ?? {}, { status: next.status })
  }) as typeof fetch
  return { calls, send }
}

test('newsletter creates a contact only in the configured Brevo list and never posts to Google', async () => {
  const { calls, send } = transport([{ status: 404 }, { status: 201, body: { id: 42 } }])
  const result = await handleIntake(request(), env, send)
  assert.equal(result.status, 200)
  assert.deepEqual(await result.json(), { ok: true, requestId: payload.requestId })
  assert(calls.every(call => call.url.startsWith('https://api.brevo.com/v3/contacts')))
  assert.deepEqual(calls[1].body, { email, listIds: [7], updateEnabled: false })
})

test('newsletter retry and a concurrent duplicate are idempotent', async () => {
  const existing = transport([{ status: 200, body: contact }])
  assert.equal((await handleIntake(request(), env, existing.send)).status, 200)
  assert.equal(existing.calls.length, 1)
  const concurrent = transport([{ status: 404 }, { status: 400, body: { code: 'duplicate_parameter' } }, { status: 200, body: contact }])
  assert.equal((await handleIntake(request(), env, concurrent.send)).status, 200)
  assert.equal(concurrent.calls.length, 3)
})

test('adding an existing contact preserves other lists and never resets unsubscribe flags', async () => {
  const active = transport([{ status: 200, body: { ...contact, listIds: [99] } }, { status: 204 }])
  assert.equal((await handleIntake(request(), env, active.send)).status, 200)
  assert.deepEqual(active.calls[1].body, { listIds: [7] })
  for (const blocked of [{ ...contact, emailBlacklisted: true }, { ...contact, listIds: [99], listUnsubscribed: [7] }]) {
    const provider = transport([{ status: 200, body: blocked }])
    const result = await handleIntake(request(), env, provider.send)
    assert.equal(result.status, 409)
    assert.deepEqual(await result.json(), { error: 'confirmation_required' })
    assert.equal(provider.calls.length, 1)
  }
})

test('missing Brevo configuration cannot fall back to Google and provider errors do not claim success', async () => {
  const never = (async () => { throw new Error('should not be called') }) as typeof fetch
  assert.equal((await handleIntake(request(), { GOOGLE_INTAKE_URL: env.GOOGLE_INTAKE_URL, GOOGLE_INTAKE_SECRET: env.GOOGLE_INTAKE_SECRET }, never)).status, 503)
  assert.equal((await handleIntake(request(), { ...env, BREVO_LIST_ID: 'bad' }, never)).status, 503)
  for (const reply of [{ status: 429 }, { status: 401 }, { status: 200, body: { ...contact, email: 'wrong@example.test' } }]) {
    const provider = transport([reply])
    assert.equal((await handleIntake(request(), env, provider.send)).status, reply.status === 429 ? 429 : 503)
  }
  const provider = transport([{ status: 404 }, { status: 400, body: { code: 'invalid_parameter', message: 'private provider detail' } }])
  const failed = await handleIntake(request(), env, provider.send)
  assert.equal(failed.status, 503)
  assert.equal((await failed.text()).includes('private'), false)
})
