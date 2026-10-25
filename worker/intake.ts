import { intakeSchema } from '../shared/intake'

export type IntakeEnv = { GOOGLE_INTAKE_URL?: string; GOOGLE_INTAKE_SECRET?: string }
const json = (body: object, status: number) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

export async function handleIntake(request: Request, env: IntakeEnv, send: typeof fetch = fetch) {
  if (request.method !== 'POST') return new Response(null, { status: 405, headers: { Allow: 'POST' } })
  const url = new URL(request.url)
  const origin = request.headers.get('Origin')
  const localPreview = ['127.0.0.1', 'localhost'].includes(url.hostname)
    && ['http://127.0.0.1:5173', 'http://localhost:5173'].includes(origin ?? '')
  if (origin !== url.origin && !localPreview) return json({ error: 'origin' }, 403)
  if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({ error: 'type' }, 415)
  if (Number(request.headers.get('Content-Length')) > 16384) return json({ error: 'size' }, 413)
  const reader = request.body?.getReader()
  if (!reader) return json({ error: 'input' }, 400)
  const chunks: Uint8Array[] = []
  let length = 0
  while (true) {
    const { value, done } = await reader.read()
    if (done) break
    length += value.length
    if (length > 16384) { await reader.cancel(); return json({ error: 'size' }, 413) }
    chunks.push(value)
  }
  let input: unknown
  try { input = JSON.parse(new TextDecoder().decode(Uint8Array.from(chunks.flatMap(chunk => Array.from(chunk))))) }
  catch { return json({ error: 'input' }, 400) }
  const parsed = intakeSchema.safeParse(input)
  if (!parsed.success || parsed.data.website) return json({ error: 'input' }, 400)
  if (!env.GOOGLE_INTAKE_URL || !env.GOOGLE_INTAKE_SECRET) return json({ error: 'unavailable' }, 503)
  try {
    const endpoint = new URL(env.GOOGLE_INTAKE_URL)
    if (endpoint.protocol !== 'https:' || endpoint.hostname !== 'script.google.com' || !/^\/macros\/s\/[\w-]+\/exec$/.test(endpoint.pathname)) return json({ error: 'unavailable' }, 503)
    const response = await send(endpoint.toString(), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...parsed.data, token: env.GOOGLE_INTAKE_SECRET }),
      signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) return json({ error: 'unavailable' }, 502)
    const result = await response.json() as { ok?: boolean; requestId?: string }
    if (result.ok !== true || result.requestId !== parsed.data.requestId) return json({ error: 'unavailable' }, 502)
    return json({ ok: true, requestId: result.requestId }, 200)
  } catch { return json({ error: 'unavailable' }, 503) }
}
