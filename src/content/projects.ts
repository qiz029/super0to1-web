import type { Text } from '../i18n/locale'
import asideCover from '../assets/images/aside-cover.png'

// Projects belong to their builders; Super curates and features them.
// Optional fields stay hidden on the page until they are filled in.
export type Milestone = {
  stage: 'problem' | 'action' | 'outcome'
  title: Text
  body: Text
}

export type Project = {
  slug: string
  name: string
  domain?: string
  tagline?: Text
  summary?: Text
  cover?: string
  coverAlt?: Text
  builder?: { name: string; role?: Text; bio?: Text; url?: string }
  stage?: Text
  lookingFor?: Text
  url?: Text
  howItWorks?: { title: Text; body: Text }[]
  journey: Milestone[]
}

export const projects: Project[] = [
  {
    slug: 'asidefm',
    name: 'AsideFM',
    domain: 'asidefm.com',
    // Wording from asidefm.com and asidefm.com/zh.
    tagline: {
      en: 'Interrupt a podcast, ask out loud, keep listening.',
      zh: '用语音打断播客，随口提问接着听。',
    },
    summary: {
      en: 'AsideFM is a podcast player you can talk back to: interrupt an episode to ask by voice, keep the conversation going, and resume from a complete sentence.',
      zh: 'AsideFM 是一个可以插话的播客播放器：听到好奇的地方开口提问，AI 结合前文回答，聊完从完整的一句话接着听。',
    },
    cover: asideCover,
    coverAlt: { en: 'Aside — Follow your curiosity, ask anytime.', zh: 'Aside——跟着好奇心，随时提问。' },
    builder: {
      name: 'Todd Zheng',
      role: { en: 'Engineer · Builder · Writer', zh: '工程师 · 产品创造者 · 写作者' },
      // From toddzheng.net.
      bio: {
        en: 'Builds systems that help people and teams do complex work with less friction — from release platforms used by thousands of engineers to AI tools and independent products.',
        zh: '打造让个人和团队更顺畅地完成复杂工作的系统——从数千名工程师使用的发布平台，到 AI 工具和独立产品。',
      },
      url: 'https://toddzheng.net',
    },
    stage: { en: 'Live', zh: '已上线' },
    url: { en: 'https://asidefm.com', zh: 'https://asidefm.com/zh' },
    howItWorks: [
      {
        title: { en: 'Pick something that interests you', zh: '挑一段感兴趣的' },
        body: {
          en: 'Start with a few minutes of audio — historical interviews and presidential addresses are ready to try.',
          zh: '先留几分钟——历史访谈、总统演讲、鲁迅的小说，都可以直接试听。',
        },
      },
      {
        title: { en: 'Ask out loud', zh: '开口提问' },
        body: {
          en: 'When a thought comes to mind, interrupt the episode and jump into the conversation by voice.',
          zh: '听到有想法的地方，直接用语音打断，加入对话。',
        },
      },
      {
        title: { en: 'Keep listening', zh: '接着听' },
        body: {
          en: 'Keep the conversation going as long as you like, then resume from a complete sentence.',
          zh: '想聊多久都行，聊完从完整的一句话接着往下听。',
        },
      },
    ],
    journey: [],
  },
]
