import { LLink } from '../components/LocaleLink'
import { useContent } from '../content/context'
import { PROGRAMS } from '../content/programs'
import { useT } from '../i18n/locale'
import globe from '../assets/images/brand-globe.png'

export function About() {
  const { site } = useContent()
  const { t, tx } = useT()
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{t.about.eyebrow}</p>
        <h1 className="about-mission">{t.mission}</h1>
      </section>
      <section className="section container about-body">
        <p>{t.about.intro}</p>
        <ul className="about-programs">
          {PROGRAMS.map((p) => (
            <li key={p.to}>
              <LLink to={p.to}>
                <strong>{p.name}</strong>
                <span>{tx(p.body)}</span>
              </LLink>
            </li>
          ))}
        </ul>
        <p>{t.about.projects}</p>
        <div className="actions">
          <LLink className="button" to="/method">
            {t.about.method}
          </LLink>
          <a className="button button-secondary" href={site.youtube} target="_blank" rel="noopener noreferrer">
            YouTube ↗
          </a>
        </div>
      </section>
      <div className="about-globe" aria-hidden="true">
        <img src={globe} alt="" />
      </div>
    </>
  )
}
