import { LLink } from '../components/LocaleLink'
import { useT } from '../i18n/locale'

export function NotFound() {
  const { t } = useT()
  return (
    <section className="page-hero container">
      <p className="eyebrow">404</p>
      <h1>{t.notFound.title}</h1>
      <div className="actions">
        <LLink className="button" to="/">
          {t.notFound.back}
        </LLink>
      </div>
    </section>
  )
}
