import { published } from './context'
import type { Session } from '../../shared/content'
export type { Session } from '../../shared/content'
export const sessions = published.sessions
export { sessionDate } from '../../shared/format'

export function upcomingSession(items: Session[], id: string | null) {
  return items.find(item => item.id === id && ['announced', 'open'].includes(item.eventState))
}
