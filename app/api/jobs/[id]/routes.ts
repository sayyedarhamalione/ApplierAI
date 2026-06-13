/**
 * app/api/jobs/[id]/route.ts
 * GET /api/jobs/:id — single job detail
 *
 * Returns the job row + company + user's tracker status (if authed).
 * Used by JobDetail drawer to hydrate full description + user_jobs status.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { scoreJobWithBreakdown } from '@/lib/scoring'
import type { DbJob, DbCompany, DbUserJob } from '@/types/db'

interface RouteContext {
  params: { id: string }
}

export async function GET(
  _req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = params
    if (!id) {
      return NextResponse.json({ error: 'missing id' }, { status: 400 })
    }

    const supabase = createServerClient()

    // ── Fetch job + company
    const { data: job, error } = await supabase
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
      .eq('id', id)
      .single<DbJob & { companies: DbCompany | null }>()

    if (error || !job) {
      return NextResponse.json({ error: 'not found' }, { status: 404 })
    }

    // ── Auth: enrich with user tracker status + score breakdown
    const {
      data: { user },
    } = await supabase.auth.getUser()

    let userJob: DbUserJob | null = null
    let scoreBreakdown: ReturnType<typeof scoreJobWithBreakdown> | null = null

    if (user) {
      const [profileRes, userJobRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('target_roles, location_prefs, experience_level')
          .eq('id', user.id)
          .single(),
        supabase
          .from('user_jobs')
          .select('*')
          .eq('user_id', user.id)
          .eq('job_id', id)
          .maybeSingle<DbUserJob>(),
      ])

      userJob = userJobRes.data ?? null

      if (profileRes.data) {
        scoreBreakdown = scoreJobWithBreakdown(job, profileRes.data)
      }
    }

    return NextResponse.json({
      job: {
        ...job,
        company: job.companies,
      },
      user_job: userJob,
      score_breakdown: scoreBreakdown,
    })
  } catch (err) {
    console.error('[GET /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}

// ── PATCH /api/jobs/:id — save/update user_jobs status
export async function PATCH(
  req: NextRequest,
  { params }: RouteContext
): Promise<NextResponse> {
  try {
    const { id } = params
    const body = await req.json()
    const { status, notes, follow_up_date } = body

    const supabase = createServerClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    // Upsert into user_jobs
    const { data, error } = await supabase
      .from('user_jobs')
      .upsert(
        {
          user_id: user.id,
          job_id: id,
          status: status ?? 'saved',
          ...(notes !== undefined && { notes }),
          ...(follow_up_date !== undefined && { follow_up_date }),
        },
        { onConflict: 'user_id,job_id' }
      )
      .select()
      .single()

    if (error) {
      console.error('[PATCH /api/jobs/[id]]', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ user_job: data })
  } catch (err) {
    console.error('[PATCH /api/jobs/[id]]', err)
    return NextResponse.json({ error: 'internal server error' }, { status: 500 })
  }
}