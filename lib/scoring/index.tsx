/**
 * lib/scoring/index.ts
 * Job relevance scoring — pure functions, zero side effects.
 * Each sub-function returns 0–1. Final scoreJob returns 0–10 (one decimal).
 */

import type { DbJob, DbProfile } from '@/types/db'
import type { ScoreBreakdown } from '@/types/app'

// ---------------------------------------------------------------------------
// Role taxonomy — canonical target roles mapped to title keywords
// ---------------------------------------------------------------------------

const ROLE_KEYWORDS: Record<string, string[]> = {
  SWE: ['software engineer', 'software developer', 'swe', 'full stack', 'fullstack', 'backend', 'frontend', 'web developer', 'web engineer'],
  'Data Science': ['data scientist', 'data analyst', 'data engineer', 'analytics engineer', 'machine learning engineer', 'ml engineer', 'ai engineer'],
  'ML Engineer': ['machine learning', 'ml engineer', 'deep learning', 'nlp engineer', 'computer vision', 'ai engineer', 'research engineer'],
  DevOps: ['devops', 'platform engineer', 'site reliability', 'sre', 'infrastructure engineer', 'cloud engineer', 'devsecops'],
  Product: ['product manager', 'pm', 'product lead', 'head of product', 'director of product', 'vp product'],
  Design: ['product designer', 'ux designer', 'ui designer', 'ux/ui', 'ui/ux', 'interaction designer', 'visual designer'],
  QA: ['qa engineer', 'quality assurance', 'test engineer', 'sdet', 'automation engineer'],
  Security: ['security engineer', 'application security', 'appsec', 'penetration tester', 'security analyst'],
  Mobile: ['ios engineer', 'android engineer', 'mobile engineer', 'react native', 'flutter developer', 'swift developer', 'kotlin developer'],
}

// ---------------------------------------------------------------------------
// Location constants
// ---------------------------------------------------------------------------

const LOCATION_ALIASES: Record<string, string> = {
  remote: 'remote',
  'work from home': 'remote',
  wfh: 'remote',
  worldwide: 'remote',
  bengaluru: 'bangalore',
  bombay: 'mumbai',
  ncr: 'delhi',
  gurugram: 'delhi',
  gurgaon: 'delhi',
  noida: 'delhi',
}

const TRACKED_CITIES = new Set(['remote', 'bangalore', 'mumbai', 'hyderabad', 'pune', 'delhi'])

// ---------------------------------------------------------------------------
// Experience level ordering for proximity scoring
// ---------------------------------------------------------------------------

const EXP_ORDER: Record<string, number> = {
  fresher: 0,
  '1-3': 1,
  '3-7': 2,
  '7+': 3,
}

// ---------------------------------------------------------------------------
// Sub-functions — each returns 0–1
// ---------------------------------------------------------------------------

/**
 * roleMatch: 1.0 if job title matches any target role keyword,
 * 0.5 if partial (word boundary match), 0 if no match.
 */
export function roleMatch(jobTitle: string, targetRoles: string[]): number {
  if (!jobTitle || !targetRoles?.length) return 0

  const titleLower = jobTitle.toLowerCase()

  for (const role of targetRoles) {
    const keywords = ROLE_KEYWORDS[role] ?? [role.toLowerCase()]
    for (const kw of keywords) {
      if (titleLower.includes(kw)) return 1.0
    }
  }

  // Partial: any single word from target role names in title
  for (const role of targetRoles) {
    const words = role.toLowerCase().split(/\s+/)
    if (words.some((w) => w.length > 3 && titleLower.includes(w))) return 0.5
  }

  return 0
}

/**
 * locationMatch: 1.0 if job is remote or matches a user preference city.
 * 0.5 if job has no location restriction (fully remote-unlabelled).
 * 0 if explicit mismatch.
 */
export function locationMatch(
  jobCities: string[] | null,
  locationPrefs: string[],
  jobIsRemote: boolean
): number {
  if (!locationPrefs?.length) return 0.5 // no preference = neutral

  // Normalize job cities
  const normalized = (jobCities ?? []).map((c) => {
    const lower = c.toLowerCase().trim()
    return LOCATION_ALIASES[lower] ?? (TRACKED_CITIES.has(lower) ? lower : null)
  }).filter(Boolean) as string[]

  const jobIsRemoteEffective = jobIsRemote || normalized.includes('remote')

  // User wants remote → job is remote = perfect
  if (locationPrefs.includes('remote') && jobIsRemoteEffective) return 1.0

  // Match on city
  if (normalized.some((city) => locationPrefs.map((p) => p.toLowerCase()).includes(city))) {
    return 1.0
  }

  // Job is remote but user didn't list remote — still useful
  if (jobIsRemoteEffective) return 0.7

  // No cities on job = could be anywhere
  if (!normalized.length) return 0.5

  return 0
}

/**
 * experienceMatch: 1.0 for exact match, 0.75 for one level off,
 * 0.5 for two levels off, 0 for three or more.
 */
export function experienceMatch(
  jobExpLevel: string | null,
  userExpLevel: string | null
): number {
  if (!jobExpLevel || !userExpLevel) return 0.5 // unknown = neutral

  const jobIdx = EXP_ORDER[jobExpLevel] ?? -1
  const userIdx = EXP_ORDER[userExpLevel] ?? -1

  if (jobIdx === -1 || userIdx === -1) return 0.5

  const diff = Math.abs(jobIdx - userIdx)
  if (diff === 0) return 1.0
  if (diff === 1) return 0.75
  if (diff === 2) return 0.5
  return 0
}

/**
 * recencyScore: 1.0 if posted <24h, 0.5 if <72h, 0.25 if <7d, 0 otherwise.
 */
export function recencyScore(postedAt: string | null): number {
  if (!postedAt) return 0

  const posted = new Date(postedAt).getTime()
  if (isNaN(posted)) return 0

  const ageMs = Date.now() - posted
  const ageHours = ageMs / (1000 * 60 * 60)

  if (ageHours < 24) return 1.0
  if (ageHours < 72) return 0.5
  if (ageHours < 168) return 0.25
  return 0
}

// ---------------------------------------------------------------------------
// Main scorer
// ---------------------------------------------------------------------------

export interface ScoringProfile {
  target_roles: string[] | null
  location_prefs: string[] | null
  experience_level: string | null
}

/**
 * scoreJob: Returns 0–10 (one decimal place).
 * Weights: role×4, location×3, experience×2, recency×1.
 */
export function scoreJob(
  job: Pick<DbJob, 'title' | 'cities' | 'is_remote' | 'experience_level' | 'posted_at'>,
  profile: ScoringProfile
): number {
  const role = roleMatch(job.title, profile.target_roles ?? [])
  const location = locationMatch(job.cities, profile.location_prefs ?? [], job.is_remote ?? false)
  const experience = experienceMatch(job.experience_level, profile.experience_level)
  const recency = recencyScore(job.posted_at)

  const raw = role * 4 + location * 3 + experience * 2 + recency * 1
  return Math.round(raw * 10) / 10
}

/**
 * scoreJobWithBreakdown: Returns score + per-dimension breakdown for UI.
 */
export function scoreJobWithBreakdown(
  job: Pick<DbJob, 'title' | 'cities' | 'is_remote' | 'experience_level' | 'posted_at'>,
  profile: ScoringProfile
): { score: number; breakdown: ScoreBreakdown } {
  const role = roleMatch(job.title, profile.target_roles ?? [])
  const location = locationMatch(job.cities, profile.location_prefs ?? [], job.is_remote ?? false)
  const experience = experienceMatch(job.experience_level, profile.experience_level)
  const recency = recencyScore(job.posted_at)

  const score = Math.round((role * 4 + location * 3 + experience * 2 + recency * 1) * 10) / 10

  return {
    score,
    breakdown: {
      role: Math.round(role * 40) / 10,        // 0–4
      location: Math.round(location * 30) / 10, // 0–3
      experience: Math.round(experience * 20) / 10, // 0–2
      recency: Math.round(recency * 10) / 10,   // 0–1
    },
  }
}

/**
 * sortAndFilterJobs: Score all jobs, sort desc, optionally limit.
 * Jobs with score 0 are still included (user may have no profile yet).
 */
export function sortAndFilterJobs<T extends Pick<DbJob, 'title' | 'cities' | 'is_remote' | 'experience_level' | 'posted_at'>>(
  jobs: T[],
  profile: ScoringProfile,
  limit = 50
): Array<T & { score: number }> {
  const scored = jobs.map((job) => ({
    ...job,
    score: scoreJob(job, profile),
  }))

  scored.sort((a, b) => b.score - a.score)

  return scored.slice(0, limit)
}