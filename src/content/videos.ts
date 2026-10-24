// Super Lens episodes from https://www.youtube.com/@Super0to1/videos (newest first).
export type Video = {
  id: string
  title: string
}

export const videos: Video[] = [
  {
    id: 'tJLBy5aQPDI',
    title:
      "Compound Yourself: Start by Being Radically Honest | A Big Tech Design Director's Growth Playbook",
  },
  {
    id: 'bnqAROVwhc4',
    title: 'Built to 200 Photographers in Half a Year | Asian Photography Association 0→1 (Part 2)',
  },
  {
    id: '8MXhzjdRCk8',
    title:
      'Behind the Lens at MLS, MLB & WNBA | A Pro Photographer Reads the Game (Part 1) 体育摄影会长：拍球赛别带"粉丝心态"',
  },
  {
    id: 'hyng_gR8juE',
    title: 'Does AI Have a Soul? | When One Person Is a Whole Team (Part 4)',
  },
  {
    id: 'v2uk0wZd-Vk',
    title: 'In the AI Age, Questions Beat Answers | When One Person Is a Whole Team (Part 3)',
  },
  {
    id: 'Pih8iuJeYwY',
    title: 'AI Anxiety vs. 100× Productivity | One Person, a Whole Team (Part 2)',
  },
]

export const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
