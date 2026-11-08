import { ProgramName } from '../components/ProgramName'
import { LLink } from '../components/LocaleLink'
import { PROGRAMS } from '../content/programs'
import { localePath, useT } from '../i18n/locale'
import { Link } from 'react-router'

export function About() {
  const { t, tx, locale } = useT()
  return (
    <>
      <section className="page-hero container about-hero">
        <h1 className="about-title">{t.about.title}</h1>
        <p className="about-facts">{t.about.facts}</p>
      </section>
      <section className="section container about-body">
        <p>{t.about.intro}</p>
        <p>{t.about.belief}</p>
        <h2 className="about-programs-title">{t.about.programs}</h2>
        <ul className="about-programs">
          {PROGRAMS.map((p) => (
            <li key={p.to}>
              <LLink to={p.to}>
                <strong><ProgramName name={p.name} /></strong>
                <span>{tx(p.body)}</span>
              </LLink>
            </li>
          ))}
        </ul>
        <p>{t.about.participateBody}</p>
        <div className="actions">
          <Link className="button" to={`${localePath(locale, '/')}#join-us`}>{t.about.participate}</Link>
        </div>
      </section>
    </>
  )
}
