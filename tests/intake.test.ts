import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { handleIntake } from '../worker/intake'

const payload = { type: 'prototype', locale: 'en', requestId: 'c5d9e878-3e4b-4ad4-8f44-c81e88c1b245', website: '', name: 'Example', purpose: 'Try a product', audience: 'Builders seeking feedback', stage: 'testing', contactType: 'wechat', contact: 'example-wechat', link: '' }
const request = (data: object, origin = 'https://super0to1.com') => new Request('https://super0to1.com/api/intake', { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify(data) })
const env = { GOOGLE_INTAKE_URL: 'https://script.google.com/macros/s/test/exec', GOOGLE_INTAKE_SECRET: 'test-only-secret' }

test('intake refuses invalid submissions and cannot claim success without a confirmed receipt', async () => {
  let calls = 0
  const send = (async () => { calls++; return Response.json({ ok: true, requestId: payload.requestId }) }) as typeof fetch
  assert.equal((await handleIntake(request(payload, 'https://foreign.test'), env, send)).status, 403)
  assert.equal((await handleIntake(request({ ...payload, email: 'invalid' }), env, send)).status, 400)
  assert.equal((await handleIntake(request({ ...payload, website: 'bot' }), env, send)).status, 400)
  assert.equal((await handleIntake(request({ ...payload, internal: 'extra' }), env, send)).status, 400)
  assert.equal((await handleIntake(request({ ...payload, email: 'a'.repeat(20000) }), env, send)).status, 413)
  assert.equal((await handleIntake(request(payload), {}, send)).status, 503)
  assert.equal((await handleIntake(request(payload), { ...env, GOOGLE_INTAKE_URL: 'bad' }, send)).status, 503)
  assert.equal(calls, 0)
  const saved = await handleIntake(request(payload), env, send)
  assert.equal(saved.status, 200)
  assert.deepEqual(await saved.json(), { ok: true, requestId: payload.requestId })
  const wrongReceipt = (async () => Response.json({ ok: true, requestId: 'wrong' })) as typeof fetch
  assert.equal((await handleIntake(request(payload), env, wrongReceipt)).status, 502)
  const failed = (async () => { throw new Error('private backend error') }) as typeof fetch
  const response = await handleIntake(request(payload), env, failed)
  assert.equal(response.status, 503)
  assert.equal((await response.text()).includes('private'), false)
})

test('prototype submission accepts a WeChat contact and rejects invalid email or executable links', async () => {
  const prototype = { type: 'prototype', locale: 'zh', requestId: payload.requestId, website: '', name: 'Example', purpose: 'Try a product', audience: 'Builders seeking feedback', stage: 'testing', contactType: 'wechat', contact: 'example-wechat', link: '' }
  const send = (async (_url, init) => {
    const data = JSON.parse(String(init?.body))
    assert.equal(data.contactType, 'wechat')
    assert.equal(data.token, env.GOOGLE_INTAKE_SECRET)
    return Response.json({ ok: true, requestId: data.requestId })
  }) as typeof fetch
  for (const stage of ['building', 'testing', 'paying']) {
    assert.equal((await handleIntake(request({ ...prototype, stage }), env, send)).status, 200)
  }
  for (const stage of ['idea', 'prototype', 'ready', 'unknown']) {
    assert.equal((await handleIntake(request({ ...prototype, stage }), env, send)).status, 400)
  }
  assert.equal((await handleIntake(request({ ...prototype, contactType: 'email' }), env, send)).status, 400)
  assert.equal((await handleIntake(request({ ...prototype, link: 'javascript:alert(1)' }), env, send)).status, 400)
})

test('Google receiver accepts products and proposals, serializes writes, deduplicates retries, and stores formula-like input as text', () => {
  const rows: Record<string, unknown[][]> = {
    'Email subscribers': [['Submitted at', 'Email', 'Language', 'Request ID']],
    'Speaker proposals': [['Submitted at', 'Name', 'Interest', 'Topic or collaboration', 'About', 'Contact method', 'Contact', 'Profile link', 'Language', 'Request ID']],
    'Prototype submissions': [['Submitted at', 'Product name', 'What it does', 'Audience and problem', 'Stage', 'Contact method', 'Contact', 'Product link', 'Language', 'Request ID']],
  }
  let locked = false
  const context = vm.createContext({
    ContentService: { MimeType: { JSON: 'json' }, createTextOutput: (text: string) => ({ setMimeType: () => JSON.parse(text) }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: (key: string) => key === 'INTAKE_SECRET' ? env.GOOGLE_INTAKE_SECRET : 'test-sheet' }) },
    LockService: { getScriptLock: () => ({ tryLock: () => { locked = true; return true }, hasLock: () => locked, releaseLock: () => { locked = false } }) },
    SpreadsheetApp: { openById: () => ({ getSheetByName: (name: string) => ({
      getLastRow: () => rows[name].length,
      getRange: (start: number, _column: number, count: number) => ({ getValues: () => rows[name].slice(start - 1, start - 1 + count) }),
      appendRow: (row: unknown[]) => { assert.equal(locked, true); rows[name].push(row) },
    }) }), flush: () => {} },
  })
  vm.runInContext(readFileSync('scripts/google-intake.gs', 'utf8'), context)
  const post = (value: object) => context.doPost({ postData: { contents: JSON.stringify(value) } })
  assert.equal(post({ ...payload, token: 'bad' }).ok, false)
  assert.equal(post({ type: 'newsletter', email: 'test@example.test', locale: 'en', requestId: payload.requestId, token: env.GOOGLE_INTAKE_SECRET }).ok, false)
  assert.equal(rows['Email subscribers'].length, 1)
  const prototype = { ...payload, name: '=HYPERLINK("x")', token: env.GOOGLE_INTAKE_SECRET }
  assert.equal(post(prototype).ok, true)
  assert.equal(post(prototype).ok, true)
  assert.equal(rows['Prototype submissions'].length, 2)
  assert.equal(rows['Prototype submissions'][1][1], "'=HYPERLINK(\"x\")")
  const speaker = { ...payload, type: 'speaker', interest: 'lens_guest', topic: '=1+1', bio: 'A maker', token: env.GOOGLE_INTAKE_SECRET }
  assert.equal(post(speaker).ok, true)
  assert.equal(post(speaker).ok, true)
  assert.equal(rows['Speaker proposals'].length, 2)
  assert.equal(rows['Speaker proposals'][1][3], "'=1+1")
  assert.equal(locked, false)
})


test('speaker proposals validate all participation choices and route only to Sheets', async () => {
  const speaker = { type: 'speaker', locale: 'en', requestId: payload.requestId, website: '', name: 'A maker', interest: 'session_speaker', topic: 'Lessons from building a product', bio: '', contactType: 'wechat', contact: 'example-maker', link: '' }
  let calls = 0
  const send = (async (url, init) => {
    calls++
    assert.equal(String(url), env.GOOGLE_INTAKE_URL)
    const body = JSON.parse(String(init?.body))
    assert.equal(body.type, 'speaker')
    return Response.json({ ok: true, requestId: body.requestId })
  }) as typeof fetch
  for (const interest of ['session_speaker', 'lens_guest', 'collaboration']) assert.equal((await handleIntake(request({ ...speaker, interest }), env, send)).status, 200)
  assert.equal(calls, 3)
  for (const change of [{ interest: 'invalid' }, { topic: ' ' }, { contactType: 'email' }, { link: 'javascript:alert(1)' }]) assert.equal((await handleIntake(request({ ...speaker, ...change }), env, send)).status, 400)
  assert.equal(calls, 3)
  assert.equal((await handleIntake(request(speaker), {}, send)).status, 503)
})
