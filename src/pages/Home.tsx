import { Fragment } from 'react'
import { AnimatedNecklace } from '../components/Necklace'
import { VideoCard } from '../components/VideoCard'
import { YouGrid } from '../components/YouGrid'
import { JoinButton } from '../components/JoinButton'
import { Marquee } from '../components/Marquee'
import { MethodStepper } from '../components/MethodStepper'
import { LLink } from '../components/LocaleLink'
import { ProjectCards } from './Projects'
import { useContent } from '../content/context'
import { sessionDate, type Session } from '../content/sessions'
import { PROGRAMS } from '../content/programs'
import { useT } from '../i18n/locale'

export function Home() {
  const { t, tx, locale } = useT()
  const { videos, sessions, projects, home } = useContent()
  const [featured, ...rest] = home.videoIds.flatMap(id => videos.filter(v => v.id === id))
  const { plain, accent, gap } = t.home.headline
  const words = [...plain.map((w) => ({ w, accent: false })), ...accent.map((w) => ({ w, accent: true }))]

  return (
    <>
      <section className="hero container">
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
          <div className="actions hero-in" style={{ ['--i' as string]: 6 }}>
            <a className="button" href="#programs">
              {t.home.explore}
            </a>
            <LLink className="button button-secondary" to="/method">
              {t.home.method}
            </LLink>
          </div>
        </div>
        <AnimatedNecklace className="hero-necklace" />
      </section>

      <Marquee />

      <section className="band band-cream">
        <div className="container">
          <MethodStepper />
        </div>
      </section>

      <section className="section container" id="programs">
        <div className="section-head" data-reveal>
          <h2>{t.home.programs}</h2>
        </div>
        <div className="program-grid">
          {PROGRAMS.map((p, i) => (
            <LLink className={`program-card tone-${p.tone}`} to={p.to} key={p.to} data-reveal style={{ ['--i' as string]: i }}>
              <span className="program-numeral" aria-hidden="true">
                {p.numeral}
              </span>
              <span className="meta">{tx(p.tagline)}</span>
              <h3>{p.name}</h3>
              <p>{tx(p.body)}</p>
              <span className="program-cta">
                {tx(p.cta)}
                <span className="arrow-pill" aria-hidden="true">
                  →
                </span>
              </span>
            </LLink>
          ))}
        </div>
      </section>

      {home.showSessions && <section className="section container">
        <div className="section-head" data-reveal>
          <h2>{home.sessionIds.some(id => sessions.some(s => s.id === id && s.eventState !== 'ended')) ? (locale === 'zh' ? '活动与相遇' : 'Sessions & gatherings') : t.home.pastSessions}</h2>
          <LLink className="text-link" to="/sessions">
            {t.home.allSessions}
          </LLink>
        </div>
        <SessionCards items={home.sessionIds.flatMap(id => sessions.filter(s => s.id === id))} />
      </section>}

      {home.showVideos && featured && <section className="section container">
        <div className="section-head" data-reveal>
          <h2>{t.home.lens}</h2>
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

      {home.showProjects && <section className="section container">
        <div className="section-head" data-reveal>
          <h2>{t.home.projects}</h2>
          <LLink className="text-link" to="/projects">
            {t.home.viewProjects}
          </LLink>
        </div>
        <ProjectCards items={home.projectIds.flatMap(id => projects.filter(p => p.id === id))} />
      </section>}

      <section className="band band-deep">
        <div className="container join">
          <YouGrid />
          <div className="join-copy" data-reveal>
            <h2>{t.home.joinTitle}</h2>
            <p className="lede">{t.home.joinBody}</p>
            <div className="actions">
              <JoinButton role="Community">{t.home.joinCta}</JoinButton>
            </div>
          </div>
        </div>
      </section>
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
