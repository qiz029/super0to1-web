// Site-wide settings. Update these before launch.
export const site = {
  name: 'Super 0→1',
  fullName: 'Super 0→1 Initiative',
  url: 'https://super0to1.com',
  // English mission, used where no locale applies; translated copy lives in i18n/messages.ts.
  mission:
    'We empower super individuals to move from 0 to 1 — by helping them close the loops that matter.',
  youtube: 'https://www.youtube.com/@Super0to1',

  // Registration. Set `signupUrl` to a form (Tally, Google Forms, Typeform…)
  // or `contactEmail` to fall back to a pre-filled email. When both are empty,
  // join buttons show an "opening soon" note instead.
  signupUrl: '',
  contactEmail: '',
}

export type JoinRole = 'Builder' | 'Tester' | 'Session attendee' | 'Community'
