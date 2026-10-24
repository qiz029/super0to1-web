import { useT } from '../i18n/locale'

// A single pearl as a closed loop: Problem → Action → Outcome.
const STAGES = [
  { key: 'problem', color: 'var(--cream)' },
  { key: 'action', color: 'var(--rose)' },
  { key: 'outcome', color: 'var(--lime)' },
] as const

const C = 150
const R = 96

function arc(startDeg: number, endDeg: number) {
  const rad = (d: number) => ((d - 90) * Math.PI) / 180
  const x1 = C + R * Math.cos(rad(startDeg))
  const y1 = C + R * Math.sin(rad(startDeg))
  const x2 = C + R * Math.cos(rad(endDeg))
  const y2 = C + R * Math.sin(rad(endDeg))
  return `M ${x1} ${y1} A ${R} ${R} 0 0 1 ${x2} ${y2}`
}

function labelPos(deg: number, r: number) {
  const rad = ((deg - 90) * Math.PI) / 180
  return { x: C + r * Math.cos(rad), y: C + r * Math.sin(rad) }
}

export function LoopDiagram() {
  const { t } = useT()
  return (
    <svg className="loop-diagram" viewBox="0 0 300 300" role="img" aria-label={t.loop.label}>
      <defs>
        {STAGES.map((s, i) => (
          <marker key={s.key} id={`loop-arrow-${i}`} viewBox="0 0 10 10" refX="4" refY="5" markerUnits="userSpaceOnUse" markerWidth="22" markerHeight="22" orient="auto-start-reverse">
            <path d="M0,0 L10,5 L0,10 z" fill={s.color} />
          </marker>
        ))}
      </defs>
      {STAGES.map((s, i) => {
        const start = i * 120 + 8
        const end = start + 104
        const mid = labelPos(start + 52, R + 34)
        return (
          <g key={s.key}>
            <path d={arc(start, end)} fill="none" stroke={s.color} strokeWidth="10" strokeLinecap="round" markerEnd={`url(#loop-arrow-${i})`} />
            <text x={mid.x} y={mid.y} dy="0.35em" textAnchor="middle" className="loop-label">
              {t.loop[s.key]}
            </text>
          </g>
        )
      })}
      <circle cx={C} cy={C} r="34" className="loop-core" />
    </svg>
  )
}
