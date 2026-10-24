import type { Text } from '../i18n/locale'

export const PROGRAMS: {
  to: string
  numeral: string
  name: string
  tagline: Text
  body: Text
  cta: Text
  tone: 'lime' | 'cream' | 'rose'
}[] = [
  {
    to: '/lab',
    numeral: '01',
    name: 'Super Lab',
    tagline: { en: 'Build & try', zh: '动手做，上手试' },
    body: {
      en: 'Bring a prototype. Get hands-on feedback. Help shape what comes next.',
      zh: '带来原型，拿到真实的上手反馈，一起决定下一步。',
    },
    cta: { en: 'Explore the Lab', zh: '了解 Lab' },
    tone: 'lime',
  },
  {
    to: '/sessions',
    numeral: '02',
    name: 'Super Session',
    tagline: { en: 'Learn together', zh: '一起学' },
    body: {
      en: 'Go deeper on a topic with people who have something to teach.',
      zh: '和真正有东西可教的人一起，把一个主题钻深。',
    },
    cta: { en: 'Find a session', zh: '找一期 Session' },
    tone: 'cream',
  },
  {
    to: '/lens',
    numeral: '03',
    name: 'Super Lens',
    tagline: { en: 'Meet the people', zh: '认识这些人' },
    body: {
      en: 'Conversations with people finding their own path from zero to one.',
      zh: '和正在走自己的 0 到 1 之路的人聊聊。',
    },
    cta: { en: 'Watch the series', zh: '看访谈' },
    tone: 'rose',
  },
]
