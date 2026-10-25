import { useLayoutEffect, useRef, type ReactNode } from 'react'

/** Native modal behavior keeps Tab inside and restores focus to the opener. */
export function Dialog({ label, onClose, className = '', children }: {
  label: string
  onClose: () => void
  className?: string
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useLayoutEffect(() => {
    const dialog = ref.current!
    const opener = document.activeElement
    dialog.showModal()
    return () => {
      dialog.close()
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [])

  return <dialog ref={ref} className={`modal-backdrop ${className}`} aria-label={label}
    onCancel={event => { event.preventDefault(); onClose() }}>
    {children}
  </dialog>
}
