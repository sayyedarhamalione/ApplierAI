// types/app.ts
// App-layer types: derived, composed, UI state, API contracts.
// Imports DB primitives — never duplicates them.

import type {
  DbJob,
  DbCompany,
  DbProfile,
  DbUserJob,
  ApplicationStatus,
  ExperienceLevel,
  InterviewQuestions,
  ResumeDiff,
} from './db'

// ── Scoring ──────────────────────────────────────────────────────────────────

export interface ScoredJob extends DbJob {
  score: number                               // 0–10, one decimal
  company: DbCompany | null                   // joined if in directory
}

export interface ScoreBreakdown {
  role: number                                // 0–4
  location: number                            // 0–3
  experience: number                          // 0–2
  recency: number                             // 0–1
  total: number                               // 0–10
}

// ── Job Feed ─────────────────────────────────────────────────────────────────

export interface JobFeedFilters {
  query?: string                              // fuzzy title search (pg_trgm)
  locations?: string[]                        // subset of location_prefs values
  roles?: string[]
  experience_levels?: ExperienceLevel[]
  job_types?: Array<'full-time' | 'part-time' | 'contract'>
  is_remote?: boolean
  show_all?: boolean                          // bypass top-50 soft cap
}

export interface JobFeedResponse {
  jobs: ScoredJob[]
  total: number                               // pre-cap count (for "show all" label)
  show_all: boolean
}

// ── Tracker (Kanban) ─────────────────────────────────────────────────────────

// Full card = user_jobs row + joined job data
export interface TrackerCard extends DbUserJob {
  job: DbJob
  company: DbCompany | null
  is_stale: boolean                           // job.is_active = false → show "position closed"
}

export interface KanbanColumn {
  status: ApplicationStatus
  label: string
  cards: TrackerCard[]
}

export type KanbanBoard = KanbanColumn[]

// Status move payload — sent to PATCH /api/jobs/tracker/[id]
export interface StatusMovePayload {
  user_job_id: string
  new_status: ApplicationStatus
}

// ── Onboarding ───────────────────────────────────────────────────────────────

// Stage 1 form — collected at signup
export interface OnboardingStage1 {
  experience_level: ExperienceLevel
  target_roles: string[]
  location_prefs: LocationPref[]
}

// Stage 2 form — post-login prompt
export interface OnboardingStage2 {
  resume_file: File                           // PDF, processed client-side via pdfjs
  resume_text: string                         // extracted by client before upload
  skills: string[]
}

// Stage 3 form — on apply click modal
export interface OnboardingStage3 {
  full_name: string
  phone?: string
  linkedin_url?: string
  github_url?: string
  portfolio_url?: string
}

export type LocationPref =
  | 'remote'
  | 'bangalore'
  | 'mumbai'
  | 'hyderabad'
  | 'pune'
  | 'delhi'
  | 'relocation'

export type TargetRole =
  | 'SWE'
  | 'Data Science'
  | 'ML Engineer'
  | 'DevOps'
  | 'Product'
  | 'Design'
  | 'QA'
  | 'Mobile'
  | 'Backend'
  | 'Frontend'
  | 'Full Stack'

// ── AI — Resume Optimizer ────────────────────────────────────────────────────

export interface ResumeSection {
  company: string
  title: string
  bullets: string[]
}

// Sent to POST /api/ai/resume
export interface ResumeRewriteRequest {
  job_id: string
  section: ResumeSection
}

export interface BulletRewrite {
  original: string
  rewritten: string
}

export interface ResumeRewriteResponse {
  rewrites: BulletRewrite[]
}

// Per-bullet UI state — user accepts/rejects individually
export type BulletDecision = 'pending' | 'accepted' | 'rejected'

export interface BulletRewriteWithState extends BulletRewrite {
  decision: BulletDecision
}

// Accepted rewrites → serialized to user_jobs.resume_diff
export function toResumeDiff(
  section: ResumeSection,
  rewrites: BulletRewriteWithState[]
): ResumeDiff {
  return {
    section: section.company,
    company: section.company,
    edits: rewrites
      .filter((r) => r.decision === 'accepted')
      .map((r) => ({ original: r.original, accepted: r.rewritten })),
  }
}

// ── AI — Interview Prep ──────────────────────────────────────────────────────

// Sent to POST /api/ai/interview
export interface InterviewPrepRequest {
  job_id: string
}

export interface InterviewPrepResponse {
  questions: InterviewQuestions
  cached: boolean                             // true = served from interview_prep table
  expires_at: string                          // ISO timestamptz
}

// ── User Context (auth + profile composite) ──────────────────────────────────

// What lives in React context / server component props after auth
export interface UserContext {
  id: string
  email: string
  profile: DbProfile
}

// ── API Error ────────────────────────────────────────────────────────────────

export interface ApiError {
  error: string
  code?: string                               // e.g. 'RATE_LIMITED', 'NOT_FOUND'
  status: number
}

// ── Weekly Digest ────────────────────────────────────────────────────────────

export interface DigestJobEntry {
  title: string
  company: string
  location: string
  score: number
  apply_url: string
}

export interface WeeklyDigestPayload {
  user_id: string
  email: string
  full_name: string | null
  onboarding_complete: boolean                // false → send nudge email instead
  top_jobs: DigestJobEntry[]                  // max 5
  tracker_summary: {
    saved: number
    applied: number
    interview: number
  }
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface ScrapeRunSummary {
  source: string
  workflow: 'primary' | 'secondary'
  status: 'running' | 'success' | 'failed'
  started_at: string
  duration_ms: number | null
  jobs_fetched: number
  jobs_inserted: number
  jobs_updated: number
  jobs_deactivated: number
  error_message: string | null
}