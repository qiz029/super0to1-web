import { useT } from '../i18n/locale'

export function About() {
  const { t } = useT()
  return (
    <section className="container about-page">
      <article className="about-note">
        <p className="about-label">{t.nav.about}</p>
        <h1>{t.about.title}</h1>
        <p className="about-intro">{t.about.intro}</p>
        <p className="about-note-facts">{t.about.facts}</p>
      </article>
    </section>
  )
}
