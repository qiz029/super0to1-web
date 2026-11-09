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
  const featuredProjects = home.projectIds.flatMap(id => projects.filter(p => p.id === id)).slice(0, HOME_PREVIEW_LIMITS.projects)
  const featuredSessions = home.sessionIds.flatMap(id => sessions.filter(s => s.id === id && s.eventState === 'ended')).slice(0, HOME_PREVIEW_LIMITS.sessions)
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
          <div className="actions participation-actions hero-in" style={{ ['--i' as string]: 6 }}>
            <JoinUsButton className="button">{t.home.emailAction}</JoinUsButton>
            <p className="participation-note">{t.home.emailActionNote}</p>
            <JoinUsButton kind="speaker" className="participation-link">{t.home.speakerAction}</JoinUsButton>
            <LLink className="participation-link" to="/lab#submit-prototype">{t.home.bringPrototype}</LLink>
          </div>
        </div>
        <div className="home-brand-art hero-in" style={{ ['--i' as string]: 3 }} aria-hidden="true">
          <img src="/media/brand-home-v3.webp" alt="" width="1536" height="1024" />
        </div>
      </section>

      <EventFeature event={nextSession} registerLabel={t.home.rsvp} />

      {home.showProjects && featuredProjects.length > 0 && <div className="home-projects"><section className="section container">
        <div className="section-head" data-reveal>
          <div>
            <p className="eyebrow">{t.home.projects}</p>
            <h2><LLink to="/lab"><ProgramName name="Super Lab" /></LLink></h2>
          </div>
          <LLink className="button home-projects-link" to="/lab#projects">{t.home.viewProjects}</LLink>
        </div>
        <div className="home-project-grid">
          {featuredProjects.map(project => {
            const url = project.url ? tx(project.url) : undefined
            const tryLabel = t.projects.tryIt(project.name)
            const detail = `/projects/${project.slug}`
            const cover = project.cover && <img src={project.cover} alt={project.coverAlt ? tx(project.coverAlt) : ''} loading="lazy" />
            return (
              <article key={project.id} className="project-card home-project-feature" data-reveal>
                {cover && (url
                  ? <a className="project-art project-art-cover" href={url} target="_blank" rel="noopener noreferrer" aria-label={tryLabel}>{cover}</a>
                  : <LLink className="project-art project-art-cover" to={detail} aria-label={project.name}>{cover}</LLink>)}
                <div className="home-project-copy">
                  <h3><LLink to={detail}>{project.name}</LLink></h3>
                  <p>{project.tagline ? tx(project.tagline) : t.projects.profileSoon}</p>
                  {url && <a className="text-link" href={url} target="_blank" rel="noopener noreferrer">{tryLabel}</a>}
                </div>
              </article>
            )
          })}
        </div>
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
