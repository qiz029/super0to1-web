import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/locale'
import { IntakeForm } from './IntakeForm'

type Props = { children: ReactNode; className?: string; onOpen?: () => void }

// Email signup is separate from event booking in JoinButton.
export function JoinUsButton({ children, className = 'button', onOpen }: Props) {
  const { t } = useT()
  const dialog = useRef<HTMLDialogElement>(null)
  const titleId = useId()
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
          <IntakeForm kind="newsletter" />
        </div>
      </dialog>, document.body)}
    </>
  )
}
