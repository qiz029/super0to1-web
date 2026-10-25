import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useContent } from '../content/context'
import { useT } from '../i18n/locale'

type Props = { children: ReactNode; className?: string; onOpen?: () => void }

// Community subscription has its own target; event booking stays in JoinButton.
export function JoinUsButton({ children, className = 'button', onOpen }: Props) {
  const { site } = useContent()
  const { t, locale } = useT()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const target = site.signupTargets.Community
  const [open, setOpen] = useState(false)
  useEffect(() => { if (open) dialog.current?.showModal() }, [open])

  return (
    <>
      <button
        type="button"
        className={className}
        aria-haspopup="dialog"
        onClick={() => { onOpen?.(); setOpen(true) }}
      >
        {children}
      </button>
      {open && createPortal(<dialog ref={dialog} className="dialog" aria-labelledby={titleId}
        onClose={() => setOpen(false)}
        onClick={e => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="dialog-body">
          <button type="button" className="dialog-close" aria-label={t.join.close} onClick={() => dialog.current?.close()}>×</button>
          <h2 id={titleId}>{t.newsletter.title}</h2>
          <p>{t.newsletter.body}</p>
          {target ? (
            <div className="actions">
              <a className="button" href={subscriptionUrl(target, locale)} target="_blank" rel="noopener noreferrer">{t.newsletter.subscribe}</a>
            </div>
          ) : <p>{t.newsletter.pending}</p>}
        </div>
      </dialog>, document.body)}
    </>
  )
}

function subscriptionUrl(target: string, locale: string) {
  const url = new URL(target)
  url.searchParams.set('role', 'Community')
  url.searchParams.set('lang', locale)
  return url.toString()
}
