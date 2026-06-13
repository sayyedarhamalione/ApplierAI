/**
 * app/(dashboard)/jobs/page.tsx
 * Server component. Fetches initial 50 jobs server-side to avoid
 * empty-state flash on first paint. Passes as initialData to JobFeed.
 */

import { redirect } from 'next/navigation'
import { createServerClient } from '@/lib/supabase/server'
import { sortAndFilterJobs } from '@/lib/scoring'
import { JobFeed } from '@/components/jobs/JobFeed'
import type { JobFeedResponse, ScoredJob } from '@/types/app'
import type { DbJob, DbCompany } from '@/types/db'

export const dynamic = 'force-dynamic'

export default async function JobsPage() {
  const supabase = createServerClient()

  // ── Auth guard (middleware handles redirect, this is belt-and-suspenders)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ── Fetch profile for scoring
  const { data: profile } = await supabase
    .from('profiles')
    .select('target_roles, location_prefs, experience_level')
    .eq('id', user.id)
    .single()

  // ── Fetch initial job pool
  const { data: rawJobs } = await supabase
    .from('jobs')
    .select(
      `
      id, external_id, source, company_id, company_name, title,
      description, apply_url, location, cities, is_remote, job_type,
      experience_level, skills, salary_min, salary_max, salary_currency,
      posted_at, last_seen_at, is_active, created_at,
      companies (
        id, name, slug, website, logo_url, employee_band,
        is_mnc, is_remote_first, hq_city, hq_country
      )
      `
    )
    .eq('is_active', true)
    .order('posted_at', { ascending: false })
    .limit(500)
    .returns<Array<DbJob & { companies: DbCompany | null }>>()

  const pool = rawJobs ?? []

  // ── Score + rank (if profile exists), otherwise return by recency
  let jobs: ScoredJob[]
  let scored = false

  if (profile?.target_roles?.length || profile?.location_prefs?.length) {
    const ranked = sortAndFilterJobs(pool, profile, 50)
    jobs = ranked.map((row) => ({
      ...row,
      company: (row as DbJob & { companies: DbCompany | null }).companies ?? null,
    }))
    scored = true
  } else {
    // No profile → top 50 by recency
    jobs = pool.slice(0, 50).map((row) => ({
      ...row,
      company: row.companies ?? null,
      score: 0,
    }))
  }

  const initialData: JobFeedResponse = {
    jobs,
    total: pool.length,
    page: 1,
    page_size: 50,
    scored,
  }

  return (
    <div className="h-full" style={{ backgroundColor: 'hsl(220,8%,9%)' }}>
      <JobFeed initialData={initialData} />
    </div>
  )
}