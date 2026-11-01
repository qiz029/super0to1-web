import { useParams } from 'react-router'
import { JoinButton } from '../components/JoinButton'
import { LLink } from '../components/LocaleLink'
import { SessionCards } from './Home'
import { useContent } from '../content/context'
import { sessionDate, upcomingSession as findUpcomingSession } from '../content/sessions'
import { EventFeature } from '../components/EventFeature'
import { JoinUsButton } from '../components/JoinUsButton'
import { useT } from '../i18n/locale'
import { IllustratedHero } from '../components/IllustratedHero'
import { NotFound } from './NotFound'

export function Sessions() {
  const { t } = useT()
  const { sessions: events, home } = useContent()
  const sessions = events.filter(item => item.program !== 'lab')
  const next = findUpcomingSession(sessions, home.upcomingSessionId)
  const comingUp = sessions.filter(item => ['announced', 'open'].includes(item.eventState) && item.id !== next?.id)
  const past = sessions.filter(item => item.eventState === 'ended')
  const s = t.sessions
  return (
    <>
      <IllustratedHero className="sessions-hero" image="/media/brand-session-v2.webp" alt={s.artAlt}>
        <h1 className="program-title">Super <strong>Session</strong></h1>
        <p className="lede">{s.lede}</p>
        <div className="actions">
          <JoinUsButton>{s.inviteAction}</JoinUsButton>
          <JoinUsButton kind="speaker" defaultInterest="session_speaker" className="button button-secondary">{t.home.speakerAction}</JoinUsButton>
        </div>
        <p className="session-invite-note">{s.inviteNote}</p>
      </IllustratedHero>

      <EventFeature event={next} />
      {comingUp.length > 0 && <section className="section container">
        <div className="section-head"><h2>{s.upcoming}</h2></div>
        <SessionCards items={comingUp} />
      </section>}
      {past.length > 0 && <section className="section container" id="past-sessions">
        <div className="section-head" data-reveal><h2>{s.past}</h2></div>
        <SessionCards items={past} />
      </section>}
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
    </>
  )
}
