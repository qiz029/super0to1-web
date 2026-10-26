import { JoinUsButton } from '../components/JoinUsButton'
import { LoopDiagram } from '../components/LoopDiagram'
import { useT } from '../i18n/locale'
import { useContent } from '../content/context'
import { ProjectCards } from './Projects'
import { EventFeature } from '../components/EventFeature'
import { upcomingSession } from '../content/sessions'
import { IntakeForm } from '../components/IntakeForm'

export function Lab() {
  const { t } = useT()
  const { projects, sessions, home } = useContent()
  const nextEvent = upcomingSession(sessions, home.upcomingSessionId)
  const l = t.lab
  return (
    <>
      <EventFeature event={nextEvent?.program === 'lab' ? nextEvent : undefined} />
      <section className="page-hero container split">
        <div>
          <p className="eyebrow">{l.eyebrow}</p>
          <h1>Super Lab</h1>
          <p className="lede">{l.lede}</p>
        </div>
        <LoopDiagram />
      </section>

      <section className="section container prototype-section" id="submit-prototype">
        <div>
          <p className="eyebrow">Super Lab</p>
          <h2>{t.forms.prototypeTitle}</h2>
          <p className="lede">{t.forms.prototypeIntro}</p>
        </div>
        <IntakeForm kind="prototype" />
      </section>

      <section className="section container">
        <div className="grid grid-3">
          {l.steps.map((s, i) => (
            <article className="step" key={s.n} data-reveal style={{ ['--i' as string]: i }}>
              <span className="meta">{s.n}</span>
              <h3>{s.title}</h3>
              <p>{s.body}</p>
            </article>
          ))}
        </div>
      </section>

      {projects.length > 0 && <section className="section container">
        <div className="section-head" data-reveal><h2>{t.home.projects}</h2></div>
        <ProjectCards items={projects} includeInvite={false} />
      </section>}

      <section className="section container lab-tester">
        <JoinUsButton source="lab_tester" className="button button-secondary">{l.joinTester}</JoinUsButton>
      </section>
    </>
  )
}
