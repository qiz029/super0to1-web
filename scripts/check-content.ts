import { readFileSync } from 'node:fs'
import { contentIssues, snapshotSchema } from '../shared/content'
const content = snapshotSchema.parse(JSON.parse(readFileSync(new URL('../content/published/site.json', import.meta.url), 'utf8')))
const issues = contentIssues(content)
if (issues.length) throw new Error(issues.map(x => `${x.path}: ${x.message}`).join('\n'))
if ([...content.sessions,...content.videos,...content.projects].some(x => !x.published)) throw new Error('Public snapshot contains unpublished content')
if (JSON.stringify(content).includes('"media:')) throw new Error('Public snapshot contains private media references')
console.log(`Content validated: ${content.releaseId}`)
