import { useRef, type PointerEvent } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import { useT } from '../i18n/locale'

// Rows of pearls with one marked "You" — after slide 3 of the brand deck.
// Pearls near the pointer swell, like a crowd turning toward you.
const COLS = 14
const ROWS = 5
const YOU = { row: 2, col: 4 }
const RADIUS = 140

export function YouGrid() {
  const { t } = useT()
  const grid = useRef<HTMLDivElement>(null)
  const frame = useRef(0)

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (prefersReducedMotion()) return
    const { clientX, clientY } = e
    cancelAnimationFrame(frame.current)
    frame.current = requestAnimationFrame(() => {
      grid.current?.querySelectorAll<HTMLElement>('.you-dot').forEach((dot) => {
        const r = dot.getBoundingClientRect()
        const d = Math.hypot(clientX - (r.left + r.width / 2), clientY - (r.top + r.height / 2))
        dot.style.setProperty('--near', String(Math.max(0, 1 - d / RADIUS)))
      })
    })
  }

  const onLeave = () => {
    cancelAnimationFrame(frame.current)
    grid.current?.querySelectorAll<HTMLElement>('.you-dot').forEach((dot) => dot.style.setProperty('--near', '0'))
  }

  return (
    <div
      ref={grid}
      className="you-grid"
      aria-hidden="true"
      style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
    >
      {Array.from({ length: ROWS * COLS }, (_, i) => {
        const row = Math.floor(i / COLS)
        const col = i % COLS
        const isYou = row === YOU.row && col === YOU.col
        return (
          <span key={i} className={isYou ? 'you-dot is-you' : 'you-dot'} style={{ ['--d' as string]: `${(row + col) * 40}ms` }}>
            {isYou && <b>{t.home.you}</b>}
          </span>
        )
      })}
    </div>
  )
}
