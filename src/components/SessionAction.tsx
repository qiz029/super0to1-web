import type { Session } from '../content/sessions'
import { useT } from '../i18n/locale'
import { JoinButton } from './JoinButton'
import { LLink } from './LocaleLink'

// Homepage and program page follow the same CMS-controlled booking state.
export function SessionAction({ session, registerLabel }: { session?: Session; registerLabel?: string }) {
  const { t } = useT()
  if (session?.eventState === 'open') {
    return <JoinButton role="Session attendee" signupUrl={session.signupUrl}>{registerLabel ?? t.sessions.register}</JoinButton>
  }
  if (session?.eventState === 'announced') {
    return <LLink className="button" to={`/sessions/${session.slug}`}>{t.sessions.viewNext}</LLink>
  }
  return null
}
