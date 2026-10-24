import { useState } from 'react'
import { Necklace, type Pearl } from './Necklace'
import { LoopDiagram } from './LoopDiagram'
import { LLink } from './LocaleLink'
import { useT } from '../i18n/locale'

const STAGE_COLORS = ['var(--rose)', 'var(--sky)', 'var(--cream)']
const PEARL_STAGE = [0, 0, 0, 1, 1, 1, 2, 2]

// Tabs advance on their own (driven by the progress bar's CSS animation)
// and pause while hovered or focused.
export function MethodStepper() {
  const { t } = useT()
  const [active, setActive] = useState(0)
  const steps = t.stepper.steps

  const pearls: Pearl[] = PEARL_STAGE.map((stage) =>
    active === 0 ? { state: 'open' } : { state: 'closed', color: STAGE_COLORS[stage] },
  )

  return (
    <div className="stepper">
      <div className="stepper-copy">
        <p className="eyebrow">{t.stepper.eyebrow}</p>
        <h2 className="stepper-title">{t.stepper.title}</h2>
        <p className="lede">{t.stepper.lede}</p>

        <div className="stepper-tabs" role="tablist" aria-label={t.stepper.label}>
          {steps.map((s, i) => (
            <button
              key={s.term}
              type="button"
              role="tab"
              aria-selected={active === i}
              className={active === i ? 'stepper-tab is-active' : 'stepper-tab'}
              onClick={() => setActive(i)}
            >
              <span className="stepper-tab-term">{s.term}</span>
              <span className="stepper-tab-meaning">{s.meaning}</span>
              {active === i && (
                <span className="stepper-progress" onAnimationEnd={() => setActive((a) => (a + 1) % steps.length)} />
              )}
            </button>
          ))}
        </div>

        <p className="stepper-body" key={active} role="tabpanel">
          {steps[active].body}
        </p>
        <LLink className="text-link" to="/method">
          {t.stepper.readMore}
        </LLink>
      </div>

      <div className="stepper-visual" data-step={active}>
        <div className="stepper-necklace">
          <Necklace pearls={pearls} threadEmphasis={active === 0} />
        </div>
        <div className="stepper-loop">
          <LoopDiagram />
        </div>
        <ul className="stepper-legend" aria-hidden={active !== 1}>
          {t.stages.map((s, i) => (
            <li key={s.name} style={{ ['--c' as string]: STAGE_COLORS[i] }}>
              {s.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
