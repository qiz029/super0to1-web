import test from 'node:test'
import assert from 'node:assert/strict'
import { DatabaseSync } from 'node:sqlite'
import { readFileSync } from 'node:fs'
import fixture from './fixtures/site.json'
import { snapshotSchema } from '../shared/content'
import { translationFields, applyTranslationChanges } from '../shared/translation'
import { translateContent } from '../cms/worker/translate'
import { HttpError, type Env } from '../cms/worker/types'

function environment() {
  const database = new DatabaseSync(':memory:')
  database.exec(readFileSync(new URL('../cms/migrations/0002_translation.sql', import.meta.url), 'utf8'))
  const env = { OPENAI_API_KEY: 'test-secret-must-stay-server-side', OPENAI_TRANSLATION_MODEL: 'gpt-5.4-mini', DB: { prepare(sql: string) { return { bind(...values: unknown[]) { return { async first() { return database.prepare(sql).get(...values as []) ?? null } } } } } } } as unknown as Env
  return { env, database }
}
const actor = { email: 'editor@example.test', role: 'editor' as const }
const request = { source: 'zh', entries: [{ id: 'title', text: '从想法到行动' }, { id: 'body', text: '第一段。\n\n第二段。' }] }
const completed = (translations: unknown[]) => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'output_text', text: JSON.stringify({ translations }) }] }] })

test('translation selects only localized editorial fields and applies reviewed changes without touching URLs or shared values', () => {
  const project = snapshotSchema.parse(fixture).projects[0]
  project.journey = [{ stage: 'problem', title: { zh: '问题', en: '' }, body: { zh: '需要解决的问题', en: '' } }]
  const fields = translationFields(project)
  assert(fields.some(field => field.key === 'journey.0.title'))
  assert(!fields.some(field => ['name', 'slug', 'url', 'builder.name', 'builder.url'].includes(field.key)))
  const updated = applyTranslationChanges(project, [{ key: 'journey.0.title', before: project.journey[0].title, target: 'en', text: 'The problem' }])
  assert.equal(updated.journey[0].title.en, 'The problem')
  assert.equal(project.journey[0].title.en, '')
  assert.deepEqual(updated.url, project.url)
  assert.deepEqual(updated.builder, project.builder)
  assert.equal(updated.published, project.published)
  assert.throws(() => applyTranslationChanges(project, [{ key: 'url', before: project.url!, target: 'en', text: 'https://wrong.test' }]), /修改/)
  assert.throws(() => applyTranslationChanges(updated, [{ key: 'journey.0.title', before: project.journey[0].title, target: 'en', text: 'stale result' }]), /修改/)
})

test('the server requests strict structured translations without storage and returns only field translations', async () => {
  const { env } = environment(), originalFetch = globalThis.fetch
  globalThis.fetch = async (url, init) => {
    assert.equal(url, 'https://api.openai.com/v1/responses')
    assert.equal(new Headers(init?.headers).get('Authorization'), `Bearer ${env.OPENAI_API_KEY}`)
    const body = JSON.parse(init?.body as string)
    assert.equal(body.store, false)
    assert.equal(body.model, 'gpt-5.4-mini')
    assert.equal(body.text.format.strict, true)
    assert.equal(body.text.format.schema.additionalProperties, false)
    assert.deepEqual(JSON.parse(body.input), { entries: request.entries })
    return completed([{ id: 'body', text: 'First paragraph.\n\nSecond paragraph.' }, { id: 'title', text: 'From idea to action' }])
  }
  try {
    const result = await translateContent(env, actor, request)
    assert.equal(result.target, 'en')
    assert.equal(result.translations.find(x => x.id === 'body')?.text, 'First paragraph.\n\nSecond paragraph.')
    assert(!JSON.stringify(result).includes(env.OPENAI_API_KEY!))
  } finally { globalThis.fetch = originalFetch }
})

test('incomplete, refused, missing, duplicate and unexpected fields never produce applicable translations', async () => {
  const { env } = environment(), originalFetch = globalThis.fetch
  const responses = [
    () => Response.json({ status: 'incomplete', output: [] }),
    () => Response.json({ status: 'completed', output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'No' }] }] }),
    () => completed([{ id: 'title', text: 'Title' }]),
    () => completed([{ id: 'title', text: 'Title' }, { id: 'title', text: 'Again' }]),
    () => completed([{ id: 'title', text: 'Title' }, { id: 'other', text: 'Wrong field' }]),
    () => completed([{ id: 'title', text: '' }, { id: 'body', text: 'Body' }]),
  ]
  try {
    for (const response of responses) {
      globalThis.fetch = async () => response()
      await assert.rejects(() => translateContent(env, actor, request), (error: unknown) => error instanceof HttpError && error.status === 502)
    }
  } finally { globalThis.fetch = originalFetch }
})

test('provider failures are sanitized and invalid or excessive requests never reach OpenAI', async () => {
  const { env, database } = environment(), originalFetch = globalThis.fetch
  let called = 0
  globalThis.fetch = async () => { called++; return Response.json({ error: { message: env.OPENAI_API_KEY } }, { status: 401 }) }
  try {
    await assert.rejects(() => translateContent(env, actor, request), (error: unknown) => error instanceof HttpError && error.status === 503 && !error.message.includes(env.OPENAI_API_KEY!))
    assert.equal(called, 1)
    await assert.rejects(() => translateContent(env, actor, { ...request, entries: [request.entries[0], request.entries[0]] }))
    await assert.rejects(() => translateContent(env, actor, { ...request, entries: [{ id: 'title', text: 'a'.repeat(12000) }, { id: 'body', text: 'b' }] }))
    database.prepare('UPDATE translation_limits SET count = 60').run()
    await assert.rejects(() => translateContent(env, actor, request), (error: unknown) => error instanceof HttpError && error.status === 429)
    assert.equal(called, 1)
    database.prepare('UPDATE translation_limits SET period = period - 1').run()
    globalThis.fetch = async () => { called++; return completed([{ id: 'title', text: 'Title' }, { id: 'body', text: 'Body' }]) }
    await translateContent(env, actor, request)
    assert.equal(called, 2)
    assert.equal((database.prepare('SELECT count FROM translation_limits').get() as { count: number }).count, 1)
  } finally { globalThis.fetch = originalFetch }
})
