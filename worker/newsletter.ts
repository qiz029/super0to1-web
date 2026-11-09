import type { Intake } from '../shared/intake'

export type NewsletterEnv = { BREVO_API_KEY?: string; BREVO_LIST_ID?: string; BREVO_TESTER_LIST_ID?: string }
type Result = { ok: true } | { ok: false; status: number; error: string }
type Contact = { id?: number; email?: string; emailBlacklisted?: boolean; listIds?: number[]; listUnsubscribed?: number[] }
const unavailable = (): Result => ({ ok: false, status: 503, error: 'unavailable' })

export async function subscribeToNewsletter(data: Extract<Intake, { type: 'newsletter' }>, env: NewsletterEnv, send: typeof fetch): Promise<Result> {
  const listId = Number(env.BREVO_LIST_ID)
  if (!env.BREVO_API_KEY || !Number.isSafeInteger(listId) || listId <= 0) return unavailable()
  const testerListId = Number(env.BREVO_TESTER_LIST_ID)
  const tester = data.source !== 'general'
  if (tester && (!Number.isSafeInteger(testerListId) || testerListId <= 0 || testerListId === listId)) return unavailable()
  const listIds = tester ? [listId, testerListId] : [listId]
  const signal = AbortSignal.timeout(15000)
  const contactPath = `/contacts/${encodeURIComponent(data.email)}?identifierType=email_id`
  const call = (path: string, method: string, body?: object) => send(`https://api.brevo.com/v3${path}`, {
    method, headers: { 'api-key': env.BREVO_API_KEY!, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: body ? JSON.stringify(body) : undefined, signal,
  })
  const rejected = (response: Response): Result => response.status === 429
    ? { ok: false, status: 429, error: 'busy' } : unavailable()

  try {
    let lookup = await call(contactPath, 'GET')
    if (lookup.status === 404) {
      const created = await call('/contacts', 'POST', { email: data.email, listIds, updateEnabled: false })
      if (created.status === 201) {
        const receipt = await created.json() as { id?: number }
        return typeof receipt.id === 'number' && Number.isSafeInteger(receipt.id) && receipt.id > 0 ? { ok: true } : unavailable()
      }
      // Another request may have created this address while the lookup was in flight.
      if (created.status !== 400) return rejected(created)
      const failure = await created.json() as { code?: string }
      if (failure.code !== 'duplicate_parameter') return unavailable()
      lookup = await call(contactPath, 'GET')
    }
    if (!lookup.ok) return rejected(lookup)
    const contact = await lookup.json() as Contact
    if (contact.email?.toLowerCase() !== data.email || typeof contact.emailBlacklisted !== 'boolean'
      || !Array.isArray(contact.listIds)) return unavailable()
    // A public signup cannot silently reverse a previous unsubscribe or block.
    if (contact.emailBlacklisted || listIds.some(id => contact.listUnsubscribed?.includes(id))) {
      return { ok: false, status: 409, error: 'confirmation_required' }
    }
    if (listIds.every(id => contact.listIds!.includes(id))) return { ok: true }
    const added = await call(contactPath, 'PUT', { listIds })
    return added.status === 204 ? { ok: true } : rejected(added)
  } catch { return unavailable() }
}
