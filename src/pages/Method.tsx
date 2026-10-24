import { useState } from 'react'
import { Necklace, type Pearl } from '../components/Necklace'
import { LoopDiagram } from '../components/LoopDiagram'
import { LLink } from '../components/LocaleLink'
import { useT } from '../i18n/locale'

const STAGES = [
  { color: 'var(--rose)', pearls: 3 },
  { color: 'var(--sky)', pearls: 3 },
  { color: 'var(--cream)', pearls: 2 },
]

function StrandExplorer() {
  const { t } = useT()
  const [active, setActive] = useState<number | null>(null)
  const pearls: Pearl[] = STAGES.flatMap((s, si) =>
    Array.from({ length: s.pearls }, () => ({
      state: active === null || active === si ? 'closed' : 'open',
      color: s.color,
    }) satisfies Pearl),
  )

  return (
    <div className="strand-explorer">
      <Necklace className="strand-necklace" pearls={pearls} title={t.necklace.strand} />
      <ul className="stage-list">
        {STAGES.map((s, i) => (
          <li key={i}>
            <button
              type="button"
              className={active === i ? 'stage is-active' : 'stage'}
              style={{ ['--stage' as string]: s.color }}
              aria-pressed={active === i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
              onClick={() => setActive(active === i ? null : i)}
            >
              <span className="stage-dot" />
              <span>
                <strong>{t.stages[i].name}</strong>
                <small>{t.stages[i].body}</small>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Method() {
  const { t } = useT()
  const m = t.method
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{m.eyebrow}</p>
        <h1>{m.title}</h1>
        <p className="lede">{m.lede}</p>
      </section>

      <section className="section container layer">
        <div className="layer-label">
          <span className="meta">{m.thread.meta}</span>
          <h2>{m.thread.title}</h2>
          <p>{m.thread.body}</p>
        </div>
        <Necklace
          className="layer-art"
          pearls={Array.from({ length: 8 }, () => ({ state: 'open' }))}
          title={t.necklace.thread}
        />
      </section>

      <section className="section container layer">
        <div className="layer-label">
          <span className="meta">{m.strand.meta}</span>
          <h2>{m.strand.title}</h2>
          <p>{m.strand.body}</p>
        </div>
        <StrandExplorer />
      </section>

      <section className="section container layer">
        <div className="layer-label">
          <span className="meta">{m.pearl.meta}</span>
          <h2>{m.pearl.title}</h2>
          <p>{m.pearl.body}</p>
        </div>
        <LoopDiagram />
      </section>

      <section className="band band-cream">
        <div className="container cta-row">
          <h2>{m.ctaTitle}</h2>
          <div className="actions">
            <LLink className="button" to="/lab">
              {m.ctaLab}
            </LLink>
            <LLink className="button button-secondary" to="/sessions">
              {m.ctaSession}
            </LLink>
          </div>
        </div>
      </section>
    </>
  )
}
