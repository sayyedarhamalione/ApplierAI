/**
 * app/api/jobs/route.ts
 * GET /api/jobs
 *
 * Query params:
 *   page        number   default 1
 *   roles       string   comma-separated target roles (e.g. "SWE,DevOps")
 *   locations   string   comma-separated cities/remote
 *   experience  string   fresher|1-3|3-7|7+
 *   job_type    string   full-time|part-time|contract
 *   query       string   free text search on title
 *   show_all    boolean  skip scoring, return everything paginated
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { sortAndFilterJobs } from '@/lib/scoring'
import type { JobFeedResponse, ScoredJob } from '@/types/app'
import type { DbJob, DbCompany } from '@/types/db'

const PAGE_SIZE = 50

export async function GET(req: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = req.nextUrl
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
    const rolesParam = searchParams.get('roles')
    const locationsParam = searchParams.get('locations')
    const experience = searchParams.get('experience')
    const jobType = searchParams.get('job_type')
    const query = searchParams.get('query')?.trim()
    const showAll = searchParams.get('show_all') === 'true'

    const supabase = createServerClient()

    // ----------------------------------------------------------------
    // Auth: get current user (optional — unauthed users get unscored feed)
    // ----------------------------------------------------------------
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let profile: {
      target_roles: string[] | null
      location_prefs: string[] | null
      experience_level: string | null
    } | null = null

    if (user) {
      const { data } = await supabase
        .from('profiles')
        .select('target_roles, location_prefs, experience_level')
        .eq('id', user.id)
        .single()
      profile = data
    }

    // ----------------------------------------------------------------
    // Build query — always join company for logo + metadata
    // ----------------------------------------------------------------
    let dbQuery = supabase
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

    // ── Filter: free-text title search (pg_trgm powers this later; for now ilike)
    if (query) {
      dbQuery = dbQuery.ilike('title', `%${query}%`)
    }

    // ── Filter: experience level
    if (experience) {
      dbQuery = dbQuery.eq('experience_level', experience)
    }

    // ── Filter: job type
    if (jobType) {
      dbQuery = dbQuery.eq('job_type', jobType)
    }

    // ── Filter: locations (GIN index on cities[])
    const locationList = locationsParam
      ? locationsParam.split(',').map((l) => l.trim().toLowerCase()).filter(Boolean)
      : []

    if (locationList.length > 0 && !locationList.includes('remote')) {
      // @ts-expect-error — Supabase JS type for array overlap
      dbQuery = dbQuery.overlaps('cities', locationList)
    } else if (locationList.includes('remote')) {
      dbQuery = dbQuery.eq('is_remote', true)
    }

    // ── Filter: roles (applied post-fetch via scoring, but we can pre-filter
    //    if show_all=false to reduce data transferred)
    // (Role filtering is fuzzy and happens in scoring layer for accuracy)

    // ── show_all: paginate at DB level, skip scoring
    if (showAll) {
      const offset = (page - 1) * PAGE_SIZE

      const { data, error, count } = await dbQuery
        .order('posted_at', { ascending: false })
        .range(offset, offset + PAGE_SIZE - 1)
        .returns<Array<DbJob & { companies: DbCompany | null }>>()

      if (error) throw error

      const jobs: ScoredJob[] = (data ?? []).map((row) => ({
        ...row,
        company: row.companies ?? null,
        score: 0,
      }))

      const response: JobFeedResponse = {
        jobs,
        total: count ?? 0,
        page,
        page_size: PAGE_SIZE,
        scored: false,
      }

      return NextResponse.json(response)
    }

    // ── scored feed: fetch a larger pool, score in app layer, return top 50
    const { data, error } = await dbQuery
      .order('posted_at', { ascending: false })
      .limit(500) // reasonable pool; scoring narrows to top 50
      .returns<Array<DbJob & { companies: DbCompany | null }>>()

    if (error) throw error

    const pool = data ?? []

    // Derive scoring profile: combine DB profile with URL overrides
    const scoringProfile = {
      target_roles:
        rolesParam
          ? rolesParam.split(',').map((r) => r.trim())
          : (profile?.target_roles ?? null),
      location_prefs:
        locationsParam
          ? locationsParam.split(',').map((l) => l.trim())
          : (profile?.location_prefs ?? null),
      experience_level: experience ?? profile?.experience_level ?? null,
    }

    const scored = sortAndFilterJobs(pool, scoringProfile, PAGE_SIZE)

    const jobs: ScoredJob[] = scored.map((row) => ({
      ...row,
      company: (row as DbJob & { companies: DbCompany | null }).companies ?? null,
    }))

    const response: JobFeedResponse = {
      jobs,
      total: pool.length,
      page: 1, // scoring collapses to a single "best" page
      page_size: PAGE_SIZE,
      scored: !!user,
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[GET /api/jobs]', err)
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}