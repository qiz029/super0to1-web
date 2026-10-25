import type { Localized, Project, Session, Video } from './content'

export type TranslationLanguage = 'zh' | 'en'
export type TranslationField = { key: string; label: string; value: Localized }
export type TranslationChange = { key: string; before: Localized; target: TranslationLanguage; text: string }
export const MAX_TRANSLATION_CHARACTERS = 12000

export function translationFields(item: Session | Video | Project): TranslationField[] {
  const result: TranslationField[] = []
  const add = (key: string, label: string, value?: Localized) => { if (value) result.push({ key, label, value }) }
  if ('title' in item) add('title', '标题', item.title)
  add('summary', '简介', item.summary)
  if ('image' in item) {
    add('body', '活动正文', item.body)
    add('imageAlt', '图片说明', item.imageAlt)
    add('location', '活动地点', item.location)
    if (item.datePrecision === 'month') add('month', '历史活动月份', item.month)
  }
  if ('name' in item) {
    add('tagline', '一句话介绍', item.tagline)
    add('coverAlt', '封面说明', item.coverAlt)
    add('stage', '当前阶段', item.stage)
    add('lookingFor', '正在寻找的帮助', item.lookingFor)
    add('builder.role', '创造者身份', item.builder?.role)
    add('builder.bio', '创造者介绍', item.builder?.bio)
    item.howItWorks?.forEach((step, i) => { add(`howItWorks.${i}.title`, `步骤 ${i + 1} · 标题`, step.title); add(`howItWorks.${i}.body`, `步骤 ${i + 1} · 说明`, step.body) })
    item.journey.forEach((step, i) => { add(`journey.${i}.title`, `成长记录 ${i + 1} · 标题`, step.title); add(`journey.${i}.body`, `成长记录 ${i + 1} · 说明`, step.body) })
  }
  return result
}

// Check both languages before applying: a response must not overwrite edits made while it was in flight.
export function applyTranslationChanges<T extends Session | Video | Project>(item: T, changes: TranslationChange[]): T {
  const fields = new Map(translationFields(item).map(field => [field.key, field]))
  for (const change of changes) {
    const field = fields.get(change.key)
    if (!field || field.value.en !== change.before.en || field.value.zh !== change.before.zh) throw new Error('内容已在翻译期间修改，请关闭翻译窗口后重新生成。')
  }
  const updates = new Map(changes.map(change => [change.key, change]))
  const visit = (value: unknown, path: string): unknown => {
    const change = updates.get(path)
    if (change) return { ...change.before, [change.target]: change.text }
    if (Array.isArray(value)) return value.map((child, i) => visit(child, path ? `${path}.${i}` : String(i)))
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, child]) => [key, visit(child, path ? `${path}.${key}` : key)]))
    return value
  }
  return visit(item, '') as T
}
