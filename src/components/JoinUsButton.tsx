import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useT } from '../i18n/locale'
import { IntakeForm } from './IntakeForm'

type Props = { defaultInterest?: '' | 'session_speaker' | 'lens_guest' | 'collaboration'; kind?: 'newsletter' | 'speaker'; children: ReactNode; className?: string; onOpen?: () => void; source?: 'general' | 'lab_tester' | 'project_tester' }

// Email signup is separate from event booking in JoinButton.
export function JoinUsButton({ children, className = 'button', onOpen, source = 'general', kind = 'newsletter', defaultInterest = '' }: Props) {
  const { t } = useT()
  const copy = kind === 'speaker' ? t.speaker : t.newsletter
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
          <h2 id={titleId}>{copy.title}</h2>
          <p>{copy.body}</p>
          <IntakeForm kind={kind} source={source} defaultInterest={defaultInterest} />
        </div>
      </dialog>, document.body)}
    </>
  )
}
