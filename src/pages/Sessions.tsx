import { useParams } from 'react-router'
import { JoinButton } from '../components/JoinButton'
import { LLink } from '../components/LocaleLink'
import { SessionCards } from './Home'
import { sessions, upcomingSession } from '../content/sessions'
import { useT } from '../i18n/locale'
import { NotFound } from './NotFound'

export function Sessions() {
  const { t, tx } = useT()
  const s = t.sessions
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>Super Session</h1>
        <p className="lede">{s.lede}</p>
      </section>

      <section className="band band-cream">
        <div className="container cta-row">
          <div>
            <p className="eyebrow">{s.upcoming}</p>
            {upcomingSession ? (
              <>
                <h2>{tx(upcomingSession.title)}</h2>
                <p>
                  {tx(upcomingSession.date)} · {tx(upcomingSession.location)}
                </p>
              </>
            ) : (
              <>
                <h2>{s.nextTitle}</h2>
                <p>{s.nextBody}</p>
              </>
            )}
          </div>
          <div className="actions">
            <JoinButton role="Session attendee">{s.saveSeat}</JoinButton>
          </div>
        </div>
      </section>

      <section className="section container">
        <div className="section-head" data-reveal>
          <h2>{s.past}</h2>
        </div>
        <SessionCards />
      </section>
    </>
  )
}

export function SessionDetail() {
  const { t, tx } = useT()
  const { slug } = useParams()
  const session = sessions.find((s) => s.slug === slug)
  if (!session) return <NotFound />

  return (
    <>
      <section className="page-hero container">
        <LLink className="back-link" to="/sessions">
          {t.sessions.back}
        </LLink>
        <p className="eyebrow">Super Session / {tx(session.month)}</p>
        <h1>{tx(session.title)}</h1>
        {session.summary && <p className="lede">{tx(session.summary)}</p>}
      </section>
      <section className="section container">
        <img className="feature-photo" src={session.image} alt={tx(session.imageAlt)} />
      </section>
      <section className="section container">
        <div className="section-head">
          <h2>{t.sessions.more}</h2>
        </div>
        <div className="actions">
          <LLink className="button" to="/sessions">
            {t.sessions.all}
          </LLink>
          <LLink className="button button-secondary" to="/lens">
            {t.sessions.watchLens}
          </LLink>
        </div>
      </section>
    </>
  )
}
