import type { Session } from '../content/sessions'
import { sessionDate } from '../content/sessions'
import { useT } from '../i18n/locale'
import { LLink } from './LocaleLink'
import { SessionAction } from './SessionAction'

export function EventFeature({ event, registerLabel }: { event?: Session; registerLabel?: string }) {
  const { t, tx, locale } = useT()
  if (!event) return null
  return <section className="container next-event" aria-label={t.home.nextEvent}>
    <LLink to={`/sessions/${event.slug}`} className="next-event-image"><img src={event.image} alt={tx(event.imageAlt)} /></LLink>
    <div><p className="eyebrow">{t.home.nextEvent} · {event.program === 'lab' ? 'Super Lab' : 'Super Session'}</p>
      <h2><LLink to={`/sessions/${event.slug}`}>{tx(event.title)}</LLink></h2>
      <p>{[sessionDate(event, locale), tx(event.location)].filter(Boolean).join(' · ')}</p>
    </div>
    <div className="actions"><SessionAction session={event} registerLabel={registerLabel} /></div>
  </section>
}
