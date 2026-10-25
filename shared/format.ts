import type { Session } from './content'
export function sessionDate(session: Session, locale: 'en' | 'zh'): string {
  if (session.datePrecision === 'month' || !session.startsAt) return session.month[locale]
  try {
    const formatter = new Intl.DateTimeFormat(locale === 'zh' ? 'zh-CN' : 'en-US', { timeZone: session.timezone, dateStyle: 'medium', timeStyle: 'short' })
    const start = new Date(session.startsAt)
    const value = session.endsAt ? formatter.formatRange(start, new Date(session.endsAt)) : formatter.format(start)
    return `${value} (${session.timezone})`
  } catch { return session.month[locale] }
}
