import { z } from 'zod'

const common = {
  requestId: z.uuid(),
  locale: z.enum(['en', 'zh']),
  website: z.string().max(100).default(''),
}
const short = z.string().trim().min(1).max(200)
export const intakeSchema = z.discriminatedUnion('type', [
  z.object({ ...common, type: z.literal('newsletter'), source: z.enum(['general', 'lab_tester', 'project_tester']).default('general'), email: z.string().trim().toLowerCase().pipe(z.email().max(254)) }).strict(),
  z.object({
    ...common, type: z.literal('prototype'), name: short,
    purpose: z.string().trim().min(1).max(1000), audience: z.string().trim().min(1).max(1000),
    stage: z.enum(['building', 'testing', 'paying']),
    contactType: z.enum(['email', 'wechat']), contact: short,
    link: z.union([z.literal(''), z.url().max(2000).refine(value => ['http:', 'https:'].includes(new URL(value).protocol))]),
  }).strict().refine(value => value.contactType !== 'email' || z.email().safeParse(value.contact).success),
])
export type Intake = z.infer<typeof intakeSchema>
