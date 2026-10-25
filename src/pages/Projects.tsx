import { useParams } from 'react-router'
import { JoinButton } from '../components/JoinButton'
import { LLink } from '../components/LocaleLink'
import { Necklace, type Pearl } from '../components/Necklace'
import { useContent } from '../content/context'
import type { Project } from '../content/projects'
import { useT } from '../i18n/locale'
import { NotFound } from './NotFound'

export function ProjectCards({ items }: { items?: Project[] }) {
  const { projects } = useContent()
  const { t, tx } = useT()
  return (
    <div className="grid grid-2">
      {(items ?? projects).map((p) => (
        <LLink className="project-card" to={`/projects/${p.slug}`} key={p.slug} data-reveal>
          {p.cover ? (
            <span className="project-art project-art-cover">
              <img src={p.cover} alt={p.coverAlt ? tx(p.coverAlt) : ''} loading="lazy" />
            </span>
          ) : (
            <span className="project-art project-art-dark">{p.name}</span>
          )}
          <span className="meta">{[p.stage ? tx(p.stage) : t.projects.featured, p.domain].filter(Boolean).join(' · ')}</span>
          <h3>{p.name} →</h3>
          <p>{p.tagline ? tx(p.tagline) : t.projects.profileSoon}</p>
        </LLink>
      ))}
      <LLink className="project-card" to="/lab" data-reveal style={{ ['--i' as string]: 1 }}>
        <span className="project-art">{t.projects.yourProjectArt}</span>
        <span className="meta">Super Lab</span>
        <h3>{t.projects.yourProjectTitle}</h3>
        <p>{t.projects.yourProjectBody}</p>
      </LLink>
    </div>
  )
}

export function Projects() {
  const { t } = useT()
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{t.projects.eyebrow}</p>
        <h1>{t.projects.title}</h1>
        <p className="lede">{t.projects.lede}</p>
      </section>
      <section className="section container">
        <ProjectCards />
      </section>
    </>
  )
}

export function ProjectDetail() {
  const { projects } = useContent()
  const { t, tx } = useT()
  const { slug } = useParams()
  const project = projects.find((p) => p.slug === slug)
  if (!project) return <NotFound />

  const url = project.url ? tx(project.url) : undefined
  const pearls: Pearl[] = Array.from({ length: 8 }, (_, i) => ({
    state: i < project.journey.length ? 'closed' : i === project.journey.length ? 'current' : 'open',
  }))
  const { builder } = project

  return (
    <>
      <section className="page-hero container">
        <LLink className="back-link" to="/projects">
          {t.projects.back}
        </LLink>
        <p className="eyebrow">
          {t.projects.featured}
          {project.domain && ` · ${project.domain}`}
        </p>
        <h1>{project.name}</h1>
        <p className="lede">{project.tagline ? tx(project.tagline) : t.projects.profileOnItsWay}</p>
        {project.summary && <p className="project-summary">{tx(project.summary)}</p>}
        <div className="actions">
          {url && (
            <a className="button" href={url} target="_blank" rel="noopener noreferrer">
              {t.projects.tryIt(project.name)}
            </a>
          )}
          <JoinButton role="Tester" variant={url ? 'secondary' : 'primary'}>
            {t.projects.tryAtLab}
          </JoinButton>
        </div>
      </section>

      {project.cover && (
        <section className="container" data-reveal>
          <a className="project-cover" href={url} target="_blank" rel="noopener noreferrer">
            <img src={project.cover} alt={project.coverAlt ? tx(project.coverAlt) : ''} />
          </a>
        </section>
      )}

      {project.howItWorks && (
        <section className="section container">
          <div className="section-head" data-reveal>
            <h2>{t.projects.howItWorks}</h2>
          </div>
          <div className="grid grid-3">
            {project.howItWorks.map((s, i) => (
              <article className="step" key={i} data-reveal style={{ ['--i' as string]: i }}>
                <span className="meta">{String(i + 1).padStart(2, '0')}</span>
                <h3>{tx(s.title)}</h3>
                <p>{tx(s.body)}</p>
              </article>
            ))}
          </div>
        </section>
      )}

      {(builder || project.stage || project.lookingFor) && (
        <section className="section container">
          <dl className="facts">
            {builder && (
              <div className="facts-builder">
                <dt>{t.projects.meetBuilder}</dt>
                <dd>
                  {builder.url ? (
                    <a className="builder-name" href={builder.url} target="_blank" rel="noopener noreferrer">
                      {builder.name} ↗
                    </a>
                  ) : (
                    <span className="builder-name">{builder.name}</span>
                  )}
                  {builder.role && <span className="builder-role">{tx(builder.role)}</span>}
                  {builder.bio && <p className="builder-bio">{tx(builder.bio)}</p>}
                </dd>
              </div>
            )}
            {project.stage && (
              <div>
                <dt>{t.projects.stage}</dt>
                <dd>{tx(project.stage)}</dd>
              </div>
            )}
            {project.lookingFor && (
              <div>
                <dt>{t.projects.lookingFor}</dt>
                <dd>{tx(project.lookingFor)}</dd>
              </div>
            )}
          </dl>
        </section>
      )}

      <section className="section container layer">
        <div className="layer-label">
          <span className="meta">{t.projects.journeyMeta}</span>
          <h2>{t.projects.journeyTitle}</h2>
          {project.journey.length === 0 ? (
            <p>{t.projects.journeyEmpty}</p>
          ) : (
            <ol className="journey">
              {project.journey.map((m, i) => (
                <li key={i}>
                  <span className="meta">{t.loop[m.stage]}</span>
                  <h3>{tx(m.title)}</h3>
                  <p>{tx(m.body)}</p>
                </li>
              ))}
            </ol>
          )}
        </div>
        <Necklace className="layer-art" pearls={pearls} title={t.projects.loopsClosed(project.journey.length)} />
      </section>
    </>
  )
}
