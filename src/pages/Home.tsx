import { HOME_PREVIEW_LIMITS } from '../../shared/home'
import { ProgramName } from '../components/ProgramName'
import { Fragment } from 'react'
import { VideoCard } from '../components/VideoCard'
import { JoinUsButton } from '../components/JoinUsButton'
import { LLink } from '../components/LocaleLink'
import { useContent } from '../content/context'
import { sessionDate, upcomingSession, type Session } from '../content/sessions'
import { EventFeature } from '../components/EventFeature'
import { useT } from '../i18n/locale'

export function Home() {
  const { t, tx } = useT()
  const { videos, sessions, projects, home } = useContent()
  const featuredVideos = home.videoIds.flatMap(id => videos.filter(v => v.id === id)).slice(0, HOME_PREVIEW_LIMITS.videos)
  const [featuredProject] = home.projectIds.flatMap(id => projects.filter(p => p.id === id)).slice(0, HOME_PREVIEW_LIMITS.projects)
  const featuredSessions = home.sessionIds.flatMap(id => sessions.filter(s => s.id === id && s.eventState === 'ended')).slice(0, HOME_PREVIEW_LIMITS.sessions)
  const projectUrl = featuredProject?.url ? tx(featuredProject.url) : undefined
  const nextSession = upcomingSession(sessions, home.upcomingSessionId)
  const { plain, accent, gap } = t.home.headline
  const words = [...plain.map((w) => ({ w, accent: false })), ...accent.map((w) => ({ w, accent: true }))]

  return (
    <>
      <section className="hero home-hero container" id="join-us">
        <div className="hero-copy">
          <h1 aria-label={words.map((x) => x.w).join(gap)}>
            {words.map(({ w, accent }, i) => (
              <Fragment key={w}>
                <span className={`hero-word${accent ? ' is-accent' : ''}${w.includes('0→1') ? ' hero-zero' : ''}`} style={{ ['--i' as string]: i + 1 }} aria-hidden="true">
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
            <JoinUsButton className="button">{t.home.emailAction}</JoinUsButton>
            <p className="participation-note">{t.home.emailActionNote}</p>
            <JoinUsButton kind="speaker" className="participation-link">{t.home.speakerAction}</JoinUsButton>
            <LLink className="participation-link" to="/lab#submit-prototype">{t.home.bringPrototype}</LLink>
          </div>
        </div>
      </section>

      <EventFeature event={nextSession} registerLabel={t.home.rsvp} />

      {home.showProjects && featuredProject && <div className="home-projects"><section className="section container">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">{t.home.projects}</p>
            <h2><LLink to="/lab"><ProgramName name="Super Lab" /></LLink></h2>
          </div>
          <LLink className="text-link" to="/lab#projects">{t.home.viewProjects}</LLink>
        </div>
        <article className="project-card home-project-feature" data-reveal>
          {featuredProject.cover && (
            <div className="project-art project-art-cover">
              <img src={featuredProject.cover} alt={featuredProject.coverAlt ? tx(featuredProject.coverAlt) : ''} loading="lazy" />
            </div>
          )}
          <div className="home-project-copy">
            <h3><LLink to={`/projects/${featuredProject.slug}`}>{featuredProject.name}</LLink></h3>
            <p>{featuredProject.tagline ? tx(featuredProject.tagline) : t.projects.profileSoon}</p>
            {projectUrl && <a className="button" href={projectUrl} target="_blank" rel="noopener noreferrer">{t.projects.tryIt(featuredProject.name)}</a>}
          </div>
        </article>
      </section></div>}

      {home.showVideos && featuredVideos.length > 0 && <section className="section container home-gallery-section">
        <div className="section-head" data-reveal>
          <h2><LLink to="/lens"><ProgramName name="Super Lens" /></LLink></h2>
          <LLink className="text-link" to="/lens">
            {t.home.allConversations}
          </LLink>
        </div>
        <div className="media-gallery home-lens-preview">
          {featuredVideos.map(video => <div key={video.id} data-reveal><VideoCard video={video} /></div>)}
        </div>
      </section>}

      {home.showSessions && featuredSessions.length > 0 && <section className="section container home-gallery-section">
        <div className="section-head" data-reveal>
          <h2>{t.home.pastEvents}</h2>
          <LLink className="text-link" to="/sessions">{t.home.allSessions}</LLink>
        </div>
        <SessionCards items={featuredSessions} />
      </section>}

    </>
  )
}

export function SessionCards({ items }: { items?: Session[] }) {
  const { tx, locale } = useT()
  const { sessions } = useContent()
  return (
    <div className="grid media-gallery session-gallery">
      {(items ?? sessions).map((s, i) => {
        const content = <>
          <img src={s.image} alt={tx(s.imageAlt)} loading="lazy" />
          <span className="session-caption">
            <span className="meta">{sessionDate(s, locale)}</span>
            <h3>{tx(s.title)}</h3>
          </span>
        </>
        const props = { className: 'session-card', 'data-reveal': true, style: { ['--i' as string]: i } }
        return s.eventState === 'ended'
          ? <article {...props} key={s.slug}>{content}</article>
          : <LLink {...props} to={`/sessions/${s.slug}`} key={s.slug}>{content}</LLink>
      })}
    </div>
  )
}
