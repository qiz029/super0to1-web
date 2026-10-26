import { useParams } from 'react-router'
import { JoinButton } from '../components/JoinButton'
import { LLink } from '../components/LocaleLink'
import { SessionCards } from './Home'
import { useContent } from '../content/context'
import { sessionDate, upcomingSession as findUpcomingSession } from '../content/sessions'
import { SessionAction } from '../components/SessionAction'
import { useT } from '../i18n/locale'
import { NotFound } from './NotFound'

export function Sessions() {
  const { t, tx, locale } = useT()
  const { sessions: events, home } = useContent()
  const sessions = events.filter(item => item.program !== 'lab')
  const upcomingSession = findUpcomingSession(sessions, home.upcomingSessionId)
  const s = t.sessions
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{s.eyebrow}</p>
        <h1>Super Session</h1>
        <p className="lede">{s.lede}</p>
      </section>

      {upcomingSession && <section className="band band-cream" id="upcoming">
        <div className="container cta-row">
          <div>
            <p className="eyebrow">{s.upcoming}</p>
            <h2>{tx(upcomingSession.title)}</h2>
            <p>{[sessionDate(upcomingSession, locale), tx(upcomingSession.location)].filter(Boolean).join(' · ')}</p>
          </div>
          <div className="actions"><SessionAction session={upcomingSession} /></div>
        </div>
      </section>}

      {sessions.some(item => ['announced', 'open'].includes(item.eventState)) && <section className="section container">
        <div className="section-head"><h2>{locale === 'zh' ? '即将举行' : 'Coming up'}</h2></div>
        <SessionCards items={sessions.filter(item => ['announced', 'open'].includes(item.eventState))} />
      </section>}
      <section className="section container">
        <div className="section-head" data-reveal>
          <h2>{s.past}</h2>
        </div>
        <SessionCards items={sessions.filter(item => item.eventState === 'ended')} />
      </section>
    </>
  )
}

export function SessionDetail() {
  const { t, tx, locale } = useT()
  const { sessions } = useContent()
  const { slug } = useParams()
  const session = sessions.find((s) => s.slug === slug)
  if (!session) return <NotFound />

  return (
    <>
      <section className="page-hero container">
        <LLink className="back-link" to={session.program === 'lab' ? '/lab' : '/sessions'}>
          {session.program === 'lab' ? 'Super Lab' : t.sessions.back}
        </LLink>
        <p className="eyebrow">{session.program === 'lab' ? 'Super Lab' : 'Super Session'} / {sessionDate(session, locale)}</p>
        <h1>{tx(session.title)}</h1>
        {session.summary && <p className="lede">{tx(session.summary)}</p>}
      </section>
      <section className="section container">
        <img className="feature-photo" src={session.image} alt={tx(session.imageAlt)} />
      </section>
      {(session.body.en || session.body.zh || session.location.en || session.eventState === 'open' || session.eventState === 'cancelled') && <section className="section container session-body">
        {tx(session.location) && <p className="meta">{tx(session.location)}</p>}
        {tx(session.body).split('\n\n').filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}
        {session.eventState === 'open' && <JoinButton role="Session attendee" signupUrl={session.signupUrl}>{t.sessions.saveSeat}</JoinButton>}
        {session.eventState === 'cancelled' && <p>{locale === 'zh' ? '本场活动已取消。' : 'This session has been cancelled.'}</p>}
      </section>}
      <section className="section container">
        <div className="section-head">
          <h2>{t.sessions.more}</h2>
        </div>
        <div className="actions">
          <LLink className="button" to={session.program === 'lab' ? '/lab' : '/sessions'}>
            {session.program === 'lab' ? 'Super Lab' : t.sessions.all}
          </LLink>
          <LLink className="button button-secondary" to="/lens">
            {t.sessions.watchLens}
          </LLink>
        </div>
      </section>
    </>
  )
}
