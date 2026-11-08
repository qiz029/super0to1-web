import { ProgramName } from '../components/ProgramName'
import { Fragment } from 'react'
import { VideoCard } from '../components/VideoCard'
import { JoinUsButton } from '../components/JoinUsButton'
import { LLink } from '../components/LocaleLink'
import { ProjectCards } from './Projects'
import { useContent } from '../content/context'
import { sessionDate, upcomingSession, type Session } from '../content/sessions'
import { EventFeature } from '../components/EventFeature'
import { useT } from '../i18n/locale'

export function Home() {
  const { t } = useT()
  const { videos, sessions, projects, home } = useContent()
  const [featured, ...rest] = home.videoIds.flatMap(id => videos.filter(v => v.id === id))
  const featuredProjects = home.projectIds.flatMap(id => projects.filter(p => p.id === id))
  const featuredSessions = home.sessionIds.flatMap(id => sessions.filter(s => s.id === id && s.program !== 'lab'))
  const nextSession = upcomingSession(sessions, home.upcomingSessionId)
  const { plain, accent, gap } = t.home.headline
  const words = [...plain.map((w) => ({ w, accent: false })), ...accent.map((w) => ({ w, accent: true }))]

  return (
    <>
      <EventFeature event={nextSession} />
      <section className="hero home-hero container">
        <div className="hero-copy">
          <p className="eyebrow hero-in" style={{ ['--i' as string]: 0 }}>
            {t.home.eyebrow}
          </p>
          <h1 aria-label={words.map((x) => x.w).join(gap)}>
            {words.map(({ w, accent }, i) => (
              <Fragment key={w}>
                <span className={accent ? 'hero-word is-accent' : 'hero-word'} style={{ ['--i' as string]: i + 1 }} aria-hidden="true">
                  {w}
                </span>
                {gap}
              </Fragment>
            ))}
          </h1>
          <p className="lede hero-in" style={{ ['--i' as string]: 5 }}>
            {t.home.lede}
          </p>
        </div>
        <div className="participation hero-in" style={{ ['--i' as string]: 6 }}>
          <div className="home-brand-art" aria-hidden="true"><img src="/media/brand-home-v3.webp" alt="" width="1536" height="1024" /></div>
          <div className="actions participation-actions">
            <JoinUsButton className="button">{t.home.emailAction}<span aria-hidden="true">↗</span></JoinUsButton>
            <JoinUsButton kind="speaker" className="participation-link">{t.home.speakerAction}<span aria-hidden="true">↗</span></JoinUsButton>
            <LLink className="participation-link" to="/lab#submit-prototype">{t.home.bringPrototype}<span aria-hidden="true">↗</span></LLink>
          </div>
        </div>
      </section>

      {home.showProjects && featuredProjects.length > 0 && <div className="home-projects"><section className="section container">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">{t.home.projects}</p>
            <h2><LLink to="/lab"><ProgramName name="Super Lab" /> ↗</LLink></h2>
            <p className="section-intro">{t.home.labBody}</p>
          </div>
        </div>
        <ProjectCards items={featuredProjects} includeInvite={false} />
      </section></div>}

      {home.showSessions && featuredSessions.length > 0 && <section className="section container">
        <div className="section-head" data-reveal>
          <div>
            <h2><LLink to="/sessions"><ProgramName name="Super Session" /> ↗</LLink></h2>
            <p className="section-intro">{t.home.sessionsBody}</p>
          </div>
        </div>
        <SessionCards items={featuredSessions} />
      </section>}

      {home.showVideos && featured && <section className="section container">
        <div className="section-head" data-reveal>
          <h2><LLink to="/lens"><ProgramName name="Super Lens" /> ↗</LLink></h2>
          <LLink className="text-link" to="/lens">
            {t.home.allConversations}
          </LLink>
        </div>
        <div className="lens-feature">
          <div data-reveal>
            <VideoCard video={featured} featured />
          </div>
          <div className="lens-side">
            {rest.slice(0, 2).map((v, i) => (
              <div data-reveal style={{ ['--i' as string]: i + 1 }} key={v.id}>
                <VideoCard video={v} />
              </div>
            ))}
          </div>
        </div>
      </section>}

    </>
  )
}

export function SessionCards({ items }: { items?: Session[] }) {
  const { tx, locale } = useT()
  const { sessions } = useContent()
  return (
    <div className="grid grid-2">
      {(items ?? sessions).map((s, i) => (
        <LLink className="session-card" to={`/sessions/${s.slug}`} key={s.slug} data-reveal style={{ ['--i' as string]: i }}>
          <img src={s.image} alt={tx(s.imageAlt)} loading="lazy" />
          <span className="session-caption">
            <span className="meta">{sessionDate(s, locale)}</span>
            <h3>{tx(s.title)}</h3>
          </span>
          <span className="arrow-pill" aria-hidden="true">
            →
          </span>
        </LLink>
      ))}
    </div>
  )
}
