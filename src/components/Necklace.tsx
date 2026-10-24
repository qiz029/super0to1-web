import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { prefersReducedMotion } from '../lib/motion'
import { useT } from '../i18n/locale'

export type PearlState = 'closed' | 'current' | 'open'
export type Pearl = { state: PearlState; color?: string; label?: string }

type NecklaceProps = {
  pearls: Pearl[]
  className?: string
  title?: string
  showThread?: boolean
  threadEmphasis?: boolean
}

const SIZE = 600
const CENTER = SIZE / 2
const RING = 205
const R = 62

// Pearls sit on a ring, starting bottom-right and moving clockwise —
// the same arrangement as the brand mark.
function pearlPosition(i: number, count: number) {
  const angle = ((45 + (i * 360) / count) * Math.PI) / 180
  return { x: CENTER + RING * Math.cos(angle), y: CENTER + RING * Math.sin(angle) }
}

export function Necklace({ pearls, className, title, showThread = true, threadEmphasis }: NecklaceProps) {
  const circumference = 2 * Math.PI * R
  return (
    <svg
      className={['necklace', threadEmphasis && 'thread-emphasis', className].filter(Boolean).join(' ')}
      viewBox={`0 0 ${SIZE} ${SIZE}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      {showThread && (
        <circle
          className="necklace-thread"
          cx={CENTER}
          cy={CENTER}
          r={RING}
          pathLength={1}
          transform={`rotate(45 ${CENTER} ${CENTER})`}
        />
      )}
      {pearls.map((p, i) => {
        const { x, y } = pearlPosition(i, pearls.length)
        const style = { '--depth': ((i % 3) + 1) * 0.6, ...(p.color ? { color: p.color } : {}) } as CSSProperties
        return (
          <g key={i} className={`pearl pearl-${p.state}`} style={style}>
            <circle className="pearl-body" cx={x} cy={y} r={R} />
            {p.state === 'current' && (
              <circle
                className="pearl-loop"
                cx={x}
                cy={y}
                r={R}
                strokeDasharray={circumference}
                transform={`rotate(-90 ${x} ${y})`}
              />
            )}
            {p.label && (
              <text className="pearl-label" x={x} y={y} dy="0.35em" textAnchor="middle">
                {p.label}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

const COUNT = 8

// Hero mark: loops close one by one, then the strand starts over.
// Pearls drift slightly with the pointer for depth.
export function AnimatedNecklace({ className }: { className?: string }) {
  const { t } = useT()
  const [step, setStep] = useState(3)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (prefersReducedMotion()) return
    const id = window.setInterval(() => setStep((s) => (s >= COUNT + 1 ? 0 : s + 1)), 1300)

    let frame = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const el = wrap.current
        if (!el) return
        el.style.setProperty('--mx', String((e.clientX / window.innerWidth - 0.5) * 2))
        el.style.setProperty('--my', String((e.clientY / window.innerHeight - 0.5) * 2))
      })
    }
    window.addEventListener('pointermove', onMove)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('pointermove', onMove)
      cancelAnimationFrame(frame)
    }
  }, [])

  const pearls: Pearl[] = Array.from({ length: COUNT }, (_, i) => ({
    state: i < step ? 'closed' : i === step ? 'current' : 'open',
  }))

  return (
    <div ref={wrap} className={['parallax', className].filter(Boolean).join(' ')}>
      <Necklace pearls={pearls} title={t.necklace.hero} />
    </div>
  )
}
