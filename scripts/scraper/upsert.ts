/**
 * scripts/scraper/upsert.ts
 * DB write layer — company resolution, batch upsert, stale deactivation.
 *
 * Called by index.ts after each source returns NormalizedJob[].
 * Never imports source adapters or normalize.ts — pure DB concerns only.
 */

import { createServiceClient } from '../../lib/supabase/server';
import { NormalizedJob } from './normalize';

// ── Types ──────────────────────────────────────────────────────────────────────

export interface UpsertStats {
  jobsInserted:    number;
  jobsUpdated:     number;
  jobsDeactivated: number;
}

// Supabase client type — avoids importing the full client package in type position
type SupabaseServiceClient = ReturnType<typeof createServiceClient>;

// ── Constants ──────────────────────────────────────────────────────────────────

const BATCH_SIZE        = 100;   // rows per upsert call — stays within Supabase payload limits
const STALE_HOURS       = 48;    // hours before unseen job is deactivated
const COMPANY_CACHE_TTL = 1000 * 60 * 5; // 5 min — refresh slug→id map mid-run if needed

// ── Company slug cache ─────────────────────────────────────────────────────────
// Avoids per-job DB lookup. Built once per upsertJobs call, shared across batches.
// Key: normalized company name slug. Value: companies.id UUID.

interface CompanyCache {
  slugToId: Map<string, string>;
  builtAt:  number;
}

let _companyCache: CompanyCache | null = null;

async function getCompanyCache(
  supabase: SupabaseServiceClient
): Promise<Map<string, string>> {
  const now = Date.now();
  if (_companyCache && now - _companyCache.builtAt < COMPANY_CACHE_TTL) {
    return _companyCache.slugToId;
  }

  const { data, error } = await supabase
    .from('companies')
    .select('id, slug, name');

  if (error) throw new Error(`Company cache build failed: ${error.message}`);

  const slugToId = new Map<string, string>();
  for (const row of data ?? []) {
    // Index by slug (canonical ATS identifier)
    slugToId.set(row.slug.toLowerCase(), row.id);
    // Also index by normalized name for public API jobs that lack a slug
    slugToId.set(normalizeCompanyName(row.name), row.id);
  }

  _companyCache = { slugToId, builtAt: now };
  return slugToId;
}

// Normalize company name → lookup key
// "Stripe, Inc." → "stripe" | "WeWork Remotely" → "wework remotely"
function normalizeCompanyName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[,.]?\s*(inc|ltd|llc|corp|co|gmbh|pvt|limited)\.?$/i, '')
    .trim();
}

// ── Company resolution ─────────────────────────────────────────────────────────
// Attempts to match NormalizedJob.company_name against companies table.
// Sets company_id if matched; leaves null otherwise (public API job, no ATS entry).

function resolveCompanyId(
  job: NormalizedJob,
  slugToId: Map<string, string>
): string | null {
  // ATS jobs already have company_id set by index.ts (passed from loadAtsCompanies)
  if (job.company_id) return job.company_id;

  // For public API jobs, try name-based lookup
  const key = normalizeCompanyName(job.company_name);
  return slugToId.get(key) ?? null;
}

// ── Batch helper ───────────────────────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    batches.push(arr.slice(i, i + size));
  }
  return batches;
}

// ── Row builder ────────────────────────────────────────────────────────────────
// Maps NormalizedJob → DB insert shape.
// Strips fields the DB generates (id, created_at).
// Sets last_seen_at = now() on every run — used by deactivateStaleJobs.

function toDbRow(job: NormalizedJob, companyId: string | null): Record<string, unknown> {
  return {
    external_id:      job.external_id,
    source:           job.source,
    company_id:       companyId,
    company_name:     job.company_name,
    title:            job.title,
    description:      job.description,
    apply_url:        job.apply_url,
    location:         job.location,
    cities:           job.cities,
    is_remote:        job.is_remote,
    job_type:         job.job_type,
    experience_level: job.experience_level,
    skills:           job.skills,
    salary_min:       job.salary_min,
    salary_max:       job.salary_max,
    salary_currency:  job.salary_currency,
    posted_at:        job.posted_at,
    is_active:        true,
    last_seen_at:     new Date().toISOString(),
  };
}

// ── Upsert a single batch ──────────────────────────────────────────────────────
// ON CONFLICT (external_id, source):
//   new job   → INSERT (all fields)
//   seen again → UPDATE last_seen_at + is_active only (preserve user-visible data)
//
// Supabase does not expose affected-row counts split by insert vs update,
// so we track inserted vs updated via a pre-check on existing external_ids.

async function upsertBatch(
  supabase: SupabaseServiceClient,
  rows: Record<string, unknown>[],
  existingIds: Set<string>
): Promise<{ inserted: number; updated: number }> {
  const { error } = await supabase
    .from('jobs')
    .upsert(rows, {
      onConflict:        'external_id,source',
      ignoreDuplicates:  false,   // always update last_seen_at
    });

  if (error) throw new Error(`Upsert batch failed: ${error.message}`);

  let inserted = 0;
  let updated  = 0;
  for (const row of rows) {
    if (existingIds.has(row.external_id as string)) updated++;
    else inserted++;
  }
  return { inserted, updated };
}

// ── Pre-fetch existing external_ids ───────────────────────────────────────────
// Lets us classify each row as insert vs update without a per-row query.

async function fetchExistingIds(
  supabase: SupabaseServiceClient,
  externalIds: string[]
): Promise<Set<string>> {
  if (externalIds.length === 0) return new Set();

  const { data, error } = await supabase
    .from('jobs')
    .select('external_id')
    .in('external_id', externalIds);

  if (error) throw new Error(`Existing ID fetch failed: ${error.message}`);
  return new Set((data ?? []).map(r => r.external_id));
}

// ── Main export: upsertJobs ───────────────────────────────────────────────────
// Called by index.ts after each source returns its NormalizedJob[].
// Returns stats for scrape_runs logging.

export async function upsertJobs(
  supabase: SupabaseServiceClient,
  jobs: NormalizedJob[]
): Promise<UpsertStats> {
  if (jobs.length === 0) {
    return { jobsInserted: 0, jobsUpdated: 0, jobsDeactivated: 0 };
  }

  const slugToId = await getCompanyCache(supabase);

  // Resolve company_id for all jobs
  const rows = jobs.map(job =>
    toDbRow(job, resolveCompanyId(job, slugToId))
  );

  // Pre-fetch which external_ids already exist (one query per batch)
  const batches   = chunk(rows, BATCH_SIZE);
  let   inserted  = 0;
  let   updated   = 0;

  for (const batch of batches) {
    const externalIds = batch.map(r => r.external_id as string);
    const existingIds = await fetchExistingIds(supabase, externalIds);
    const result      = await upsertBatch(supabase, batch, existingIds);
    inserted += result.inserted;
    updated  += result.updated;
  }

  return { jobsInserted: inserted, jobsUpdated: updated, jobsDeactivated: 0 };
}

// ── Stale job deactivation ────────────────────────────────────────────────────
// Called ONCE by index.ts after all sources finish for the run.
// Jobs where last_seen_at < (now - 48h) → is_active = false.
// Soft delete only — job rows persist for tracker history.
//
// Returns count of deactivated jobs for scrape_runs logging.

export async function deactivateStaleJobs(
  supabase: SupabaseServiceClient
): Promise<number> {
  const cutoff = new Date(Date.now() - STALE_HOURS * 60 * 60 * 1000).toISOString();

  // Count first (Supabase update doesn't return affected row count reliably)
  const { count, error: countError } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)
    .lt('last_seen_at', cutoff);

  if (countError) {
    console.error(`Stale job count failed: ${countError.message}`);
    return 0;
  }

  if (!count || count === 0) return 0;

  const { error: updateError } = await supabase
    .from('jobs')
    .update({ is_active: false })
    .eq('is_active', true)
    .lt('last_seen_at', cutoff);

  if (updateError) {
    console.error(`Stale job deactivation failed: ${updateError.message}`);
    return 0;
  }

  console.log(`Deactivated ${count} stale jobs (last_seen_at < ${cutoff})`);
  return count;
}

// ── Cache invalidation (testing / manual use) ─────────────────────────────────
export function clearCompanyCache(): void {
  _companyCache = null;
}