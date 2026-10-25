import { useRef, type ReactNode } from 'react'
import type { JoinRole } from '../content/site'
import { useContent } from '../content/context'
import { useT } from '../i18n/locale'

type Props = {
  signupUrl?: string
  role: JoinRole
  children: ReactNode
  variant?: 'primary' | 'secondary'
}

export function JoinButton({ role, children, signupUrl, variant = 'primary' }: Props) {
  const { t, locale } = useT()
  const { site } = useContent()
  const target = signupUrl || site.signupTargets[role] || site.signupUrl
  const dialog = useRef<HTMLDialogElement>(null)
  const className = `button ${variant === 'secondary' ? 'button-secondary' : ''}`

  if (target) {
    const url = new URL(target)
    url.searchParams.set('role', role)
    url.searchParams.set('lang', locale)
    return (
      <a className={className} href={url.toString()} target="_blank" rel="noopener noreferrer">
        {children}
      </a>
    )
  }

  if (site.contactEmail) {
    const subject = encodeURIComponent(`Super 0→1 — joining as ${role}`)
    return (
      <a className={className} href={`mailto:${site.contactEmail}?subject=${subject}`}>
        {children}
      </a>
    )
  }

  return (
    <>
      <button type="button" className={className} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="dialog"
        onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}
      >
        <div className="dialog-body">
          <button type="button" className="dialog-close" aria-label={t.join.close} onClick={() => dialog.current?.close()}>
            ×
          </button>
          <p className="eyebrow">{t.join.roles[role]}</p>
          <h2>{t.join.title}</h2>
          <p>{t.join.body}</p>
          <div className="actions">
            <a className="button" href={site.youtube} target="_blank" rel="noopener noreferrer">
              {t.join.follow}
            </a>
          </div>
        </div>
      </dialog>
    </>
  )
}
