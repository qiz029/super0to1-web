import { useId, useRef, useState, type FormEvent } from 'react'
import { useT } from '../i18n/locale'

export function IntakeForm({ kind, source = 'general' }: { kind: 'newsletter' | 'prototype'; source?: 'general' | 'lab_tester' | 'project_tester' }) {
  const { t, locale } = useT()
  const f = t.forms
  const id = useId()
  const requestId = useRef('')
  const fingerprint = useRef('')
  const [contactType, setContactType] = useState('email')
  const [state, setState] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (state === 'sending') return
    const data = Object.fromEntries(new FormData(event.currentTarget).entries())
    const key = JSON.stringify(data)
    if (key !== fingerprint.current) { requestId.current = crypto.randomUUID(); fingerprint.current = key }
    const payload = { ...data, ...(kind === 'newsletter' ? { source } : {}), type: kind, locale, requestId: requestId.current }
    setState('sending')
    try {
      const response = await fetch('/api/intake', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        signal: AbortSignal.timeout(20000),
      })
      if (response.status === 400) { setError(f.invalid); setState('error'); return }
      if (response.status === 409 && kind === 'newsletter') { setError(f.confirmationRequired); setState('error'); return }
      const result = await response.json() as { ok?: boolean; requestId?: string }
      if (!response.ok || result.ok !== true || result.requestId !== requestId.current) throw new Error('Not saved')
      setState('success')
    } catch { setError(f.failed); setState('error') }
  }

  if (state === 'success') return <p role="status" className="form-success">{kind === 'newsletter' ? f.subscribed : f.received}</p>

  return (
    <form className="intake-form" onSubmit={submit}>
      <fieldset disabled={state === 'sending'}>
        {kind === 'newsletter' ? (
          <label htmlFor={`${id}-email`}>{f.email}
            <input id={`${id}-email`} name="email" type="email" autoComplete="email" maxLength={254} required />
          </label>
        ) : <>
          <label htmlFor={`${id}-name`}>{f.productName}<input id={`${id}-name`} name="name" maxLength={200} required /></label>
          <label htmlFor={`${id}-purpose`}>{f.purpose}<textarea id={`${id}-purpose`} name="purpose" rows={2} maxLength={1000} required /></label>
          <label htmlFor={`${id}-audience`}>{f.audience}<textarea id={`${id}-audience`} name="audience" rows={2} maxLength={1000} required /></label>
          <label htmlFor={`${id}-stage`}>{f.stage}
            <select id={`${id}-stage`} name="stage" aria-label={f.stage} defaultValue="" required>
              <option value="" disabled>{f.chooseStage}</option>
              <option value="building">{f.building}</option><option value="testing">{f.testing}</option><option value="paying">{f.paying}</option>
            </select>
          </label>
          <div className="form-contact-row">
            <label htmlFor={`${id}-contact-type`}>{f.contactMethod}
              <select id={`${id}-contact-type`} name="contactType" aria-label={f.contactMethod} value={contactType} onChange={e => setContactType(e.target.value)}>
                <option value="email">{f.email}</option><option value="wechat">{f.wechat}</option>
              </select>
            </label>
            <label htmlFor={`${id}-contact`}>{contactType === 'email' ? f.email : f.wechat}
              <input id={`${id}-contact`} name="contact" type={contactType === 'email' ? 'email' : 'text'} autoComplete={contactType === 'email' ? 'email' : 'off'} maxLength={200} required />
            </label>
          </div>
          <label htmlFor={`${id}-link`}>{f.link}<input id={`${id}-link`} name="link" type="url" maxLength={2000} placeholder="https://" /></label>
        </>}
        <div className="form-trap" aria-hidden="true"><label>{f.website}<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
        {kind === 'prototype' && <p className="form-note">{f.contactUse}</p>}
        <button className="button" type="submit">{state === 'sending' ? f.sending : kind === 'newsletter' ? f.subscribe : f.submit}</button>
      </fieldset>
      {state === 'error' && <p role="alert" className="form-error">{error}</p>}
    </form>
  )
}
