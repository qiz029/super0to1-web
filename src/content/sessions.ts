import type { Text } from '../i18n/locale'
import vibeCoding from '../assets/images/session-vibe-coding.png'
import direction from '../assets/images/session-direction.png'

export type Session = {
  slug: string
  title: Text
  month: Text
  image: string
  imageAlt: Text
  summary?: Text
}

// Past sessions, newest first.
export const sessions: Session[] = [
  {
    slug: 'find-your-direction',
    title: { en: 'Find your direction', zh: '找到你的方向' },
    month: { en: 'April 2026', zh: '2026 年 4 月' },
    image: direction,
    imageAlt: {
      en: 'Participants learning together at the Find your direction session',
      zh: '“找到你的方向” Session 现场，大家一起学习',
    },
  },
  {
    slug: 'intro-to-vibe-coding',
    title: { en: 'Intro to Vibe Coding', zh: 'Vibe Coding 入门' },
    month: { en: 'March 2026', zh: '2026 年 3 月' },
    image: vibeCoding,
    imageAlt: {
      en: 'Super Session participants together in a room after Intro to Vibe Coding',
      zh: '“Vibe Coding 入门” Session 结束后的合影',
    },
  },
]

// Set to an object to announce the next session; null shows "to be announced".
export const upcomingSession: { title: Text; date: Text; location: Text } | null = null
