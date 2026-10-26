import { JoinUsButton } from '../components/JoinUsButton'
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
      <section className="page-hero container split lab-hero">
        <div>
          <p className="eyebrow">{l.eyebrow}</p>
          <h1>Super Lab</h1>
          <p className="lede">{l.lede}</p>
          <div className="lab-entry-actions actions">
            <a className="button" href="#submit-prototype">{l.bringPrototype}</a>
            <JoinUsButton source="lab_tester" className="button button-secondary">{l.joinTester}</JoinUsButton>
          </div>
          <p className="lab-entry-note">{l.testerNote}</p>
        </div>
        <img className="lab-illustration" src="/media/lab-community-v1.webp" alt={l.illustrationAlt} width="1536" height="1024" />
      </section>

      <section className="section container prototype-section" id="submit-prototype">
        <div>
          <p className="eyebrow">Super Lab</p>
          <h2>{t.forms.prototypeTitle}</h2>
          <p className="lede">{t.forms.prototypeIntro}</p>
          <ol className="lab-flow" aria-label={l.howItWorks}>
            {l.steps.map((step, index) => <li key={step.n}>
              <span className="lab-flow-number" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
              <div><h3>{step.title}</h3><p>{step.body}</p></div>
              {index < l.steps.length - 1 && <span className="lab-flow-arrow" aria-hidden="true">↓</span>}
            </li>)}
          </ol>
        </div>
        <IntakeForm kind="prototype" />
      </section>

      {projects.length > 0 && <section className="section container">
        <div className="section-head" data-reveal><h2>{t.home.projects}</h2></div>
        <ProjectCards items={projects} includeInvite={false} />
      </section>}

    </>
  )
}
