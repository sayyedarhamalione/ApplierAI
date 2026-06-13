// types/db.ts
// Auto-mirrors Supabase schema. No app logic here.
// Update when migrations change.

// ── Enums ────────────────────────────────────────────────────────────────────

export type EmployeeBand = '11-50' | '50-500' | '1k-10k' | '10k-1L'
export type AtsType = 'greenhouse' | 'lever' | 'ashby'
export type CompanyTier = 1 | 2 | 3          // 1=MNC, 2=Apify, 3=crawled
export type JobType = 'full-time' | 'part-time' | 'contract'
export type ExperienceLevel = 'fresher' | '1-3' | '3-7' | '7+'
export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected'
export type ScrapeStatus = 'running' | 'success' | 'failed'
export type ScrapeWorkflow = 'primary' | 'secondary'
export type OnboardingStep = 1 | 2            // 1=stage1 done, 2=fully complete

// ── Table Row Types ──────────────────────────────────────────────────────────

export interface DbCompany {
  id: string                                  // uuid
  name: string
  slug: string                                // ATS identifier
  ats_type: AtsType | null
  website: string | null
  logo_url: string | null
  employee_band: EmployeeBand
  is_mnc: boolean
  tier: CompanyTier
  hq_city: string | null
  hq_country: string | null
  is_remote_first: boolean
  cities: string[]                            // GIN indexed
  created_at: string                          // timestamptz as ISO string
}

export interface DbJob {
  id: string                                  // uuid
  external_id: string                         // SHA-256 hash: source+company+title+url
  source: string                              // himalayas | remotive | arbeitnow | remoteok | weworkremotely | greenhouse | lever | ashby
  company_id: string | null                   // fk → companies (null if not in directory)
  company_name: string                        // denormalized
  title: string
  description: string | null
  apply_url: string
  location: string | null                     // raw string from source
  cities: string[]                            // normalized, GIN indexed
  is_remote: boolean
  job_type: JobType | null
  experience_level: ExperienceLevel | null    // regex-extracted
  skills: string[]                            // taxonomy-matched
  salary_min: number | null
  salary_max: number | null
  salary_currency: string | null
  posted_at: string | null                    // timestamptz
  last_seen_at: string                        // timestamptz — updated each sync
  is_active: boolean                          // false after 48h not seen
  created_at: string
}

export interface DbProfile {
  id: string                                  // uuid — matches auth.users.id
  full_name: string | null
  phone: string | null
  linkedin_url: string | null
  github_url: string | null
  portfolio_url: string | null
  experience_level: ExperienceLevel | null
  target_roles: string[]
  skills: string[]
  location_prefs: string[]                    // remote | bangalore | mumbai | hyderabad | pune | delhi | relocation
  resume_text: string | null                  // extracted plain text
  resume_filename: string | null              // R2 URL
  onboarding_step: OnboardingStep
  ai_daily_count: number                      // resets daily
  ai_count_reset_at: string                   // timestamptz
  created_at: string
  updated_at: string
}

export interface DbUserJob {
  id: string                                  // uuid
  user_id: string                             // fk → profiles (cascade delete)
  job_id: string                              // fk → jobs (cascade delete)
  status: ApplicationStatus
  notes: string | null
  applied_at: string | null                   // timestamptz — set by trigger on status→applied
  follow_up_date: string | null               // date only
  resume_diff: ResumeDiff | null              // JSONB
  created_at: string
  updated_at: string
}

export interface DbScrapeRun {
  id: string                                  // uuid
  source: string
  workflow: ScrapeWorkflow
  started_at: string
  completed_at: string | null
  status: ScrapeStatus
  jobs_fetched: number
  jobs_inserted: number
  jobs_updated: number
  jobs_deactivated: number
  error_message: string | null
  created_at: string
}

export interface DbInterviewPrep {
  id: string                                  // uuid
  job_id: string                              // fk → jobs (cascade delete)
  company_name: string                        // denormalized
  job_title: string                           // denormalized
  questions: InterviewQuestions               // JSONB
  created_at: string
  expires_at: string                          // timestamptz — created_at + 24h (trigger-enforced)
}

// ── JSONB Sub-types ──────────────────────────────────────────────────────────

export interface ResumeDiff {
  section: string                             // e.g. "Indore Municipal Corporation"
  company: string
  edits: ResumeBulletEdit[]
}

export interface ResumeBulletEdit {
  original: string
  accepted: string
}

export interface InterviewQuestions {
  technical: InterviewQuestion[]              // 5 questions
  behavioral: InterviewQuestion[]             // 3 questions
  company_specific: InterviewQuestion[]       // 2 questions
}

export interface InterviewQuestion {
  question: string
  hint: string
}

// ── Insert Types (id/created_at optional — DB generates) ────────────────────

export type InsertCompany = Omit<DbCompany, 'id' | 'created_at'>
export type InsertJob = Omit<DbJob, 'id' | 'created_at'>
export type InsertUserJob = Omit<DbUserJob, 'id' | 'created_at' | 'updated_at' | 'applied_at'>
export type InsertScrapeRun = Omit<DbScrapeRun, 'id' | 'created_at' | 'completed_at'>
export type InsertInterviewPrep = Omit<DbInterviewPrep, 'id' | 'created_at' | 'expires_at'>

// ── Update Types ─────────────────────────────────────────────────────────────

export type UpdateProfile = Partial<Omit<DbProfile, 'id' | 'created_at'>>
export type UpdateUserJob = Partial<Omit<DbUserJob, 'id' | 'user_id' | 'job_id' | 'created_at'>>
export type UpdateJob = Partial<Omit<DbJob, 'id' | 'external_id' | 'source' | 'created_at'>>