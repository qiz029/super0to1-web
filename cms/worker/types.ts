import type { Snapshot } from '../../shared/content'

export interface Env {
  DB: D1Database
  MEDIA: R2Bucket
  ASSETS: Fetcher
  ACCESS_TEAM_URL: string
  ACCESS_AUD: string
  CMS_OWNER_EMAIL: string
  GITHUB_APP_ID: string
  GITHUB_INSTALLATION_ID: string
  GITHUB_APP_PRIVATE_KEY: string
  OPENAI_API_KEY?: string
  OPENAI_TRANSLATION_MODEL?: string
  CMS_DEV?: string | boolean
}
export type Actor = { email: string; role: 'admin' | 'editor' }
export type StateRow = { revision: number; data: string; updated_at: string; updated_by: string }
export type ReleaseStatus = 'preparing' | 'deploying' | 'live' | 'failed' | 'verification_failed'
export type ReleaseRow = { id: string; revision: number; data: string; status: ReleaseStatus; commit_sha: string | null; run_url: string | null; error: string | null; created_at: string; updated_at: string; created_by: string }
export type MediaRow = { id: string; name: string; bytes: number; width: number; height: number; created_at: string; created_by: string }
export type ReleaseView = Omit<ReleaseRow, 'data'>
export type StateView = { data: Snapshot; revision: number; updatedAt: string; actor: Actor; issues: { path: string; message: string }[] }

export class HttpError extends Error {
  status: number
  details?: unknown
  constructor(status: number, message: string, details?: unknown) { super(message); this.status = status; this.details = details }
}
