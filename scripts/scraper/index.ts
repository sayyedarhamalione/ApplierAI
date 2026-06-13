/**
 * scripts/scraper/index.ts
 * Orchestrator — runs all sources sequentially, logs each to scrape_runs.
 *
 * Usage:
 *   tsx scripts/scraper/index.ts --workflow=primary
 *   tsx scripts/scraper/index.ts --workflow=secondary
 *
 * Workflow "primary"   → Tier 1 ATS (Greenhouse/Lever/Ashby) + 5 public APIs
 * Workflow "secondary" → Tier 2 (Apify city discovery) + Tier 3 (career crawlers)
 */

import { createServiceClient } from '../../lib/supabase/server';
import { upsertJobs, deactivateStaleJobs } from './upsert';
import { NormalizedJob } from './normalize';

// ── Source adapters ────────────────────────────────────────────────────────────
// Primary (Tier 1)
import { fetchHimalayas }     from './sources/himalayas';
import { fetchRemotive }      from './sources/remotive';
import { fetchArbeitnow }     from './sources/arbeitnow';
import { fetchRemoteOK }      from './sources/remoteok';
import { fetchWeWorkRemotely } from './sources/weworkremotely';
import { fetchGreenhouseCompanies } from './sources/greenhouse';
import { fetchLeverCompanies }      from './sources/lever';
import { fetchAshbyCompanies }      from './sources/ashby';

// Secondary (Tier 2 + Tier 3) — stubs until implemented
import { fetchApifyCity }    from './sources/apify';
import { fetchCareerPages }  from './sources/career-pages';

// ── Types ──────────────────────────────────────────────────────────────────────

type Workflow = 'primary' | 'secondary';

interface SourceResult {
  source:        string;
  jobs:          NormalizedJob[];
  error?:        string;
  durationMs:    number;
}

interface RunStats {
  jobsFetched:     number;
  jobsInserted:    number;
  jobsUpdated:     number;
  jobsDeactivated: number;
}

// ── CLI arg parsing ────────────────────────────────────────────────────────────

function parseWorkflow(): Workflow {
  const arg = process.argv.find(a => a.startsWith('--workflow='));
  const value = arg?.split('=')[1];
  if (value !== 'primary' && value !== 'secondary') {
    throw new Error(`--workflow must be "primary" or "secondary". Got: "${value ?? ''}"`);
  }
  return value;
}

// ── Source runner — per-source try/catch isolation ─────────────────────────────

async function runSource(
  name: string,
  fn: () => Promise<NormalizedJob[]>
): Promise<SourceResult> {
  const start = Date.now();
  try {
    console.log(`[${name}] starting`);
    const jobs = await fn();
    const durationMs = Date.now() - start;
    console.log(`[${name}] done — ${jobs.length} jobs (${durationMs}ms)`);
    return { source: name, jobs, durationMs };
  } catch (err) {
    const durationMs = Date.now() - start;
    const error = err instanceof Error ? err.message : String(err);
    console.error(`[${name}] FAILED — ${error} (${durationMs}ms)`);
    return { source: name, jobs: [], error, durationMs };
  }
}

// ── scrape_runs logger ─────────────────────────────────────────────────────────

async function logScrapeRun(
  supabase: ReturnType<typeof createServiceClient>,
  source: string,
  workflow: Workflow,
  startedAt: Date,
  result: SourceResult,
  stats: Pick<RunStats, 'jobsInserted' | 'jobsUpdated' | 'jobsDeactivated'>
): Promise<void> {
  const { error } = await supabase.from('scrape_runs').insert({
    source,
    workflow,
    started_at:       startedAt.toISOString(),
    completed_at:     new Date().toISOString(),
    status:           result.error ? 'failed' : 'success',
    jobs_fetched:     result.jobs.length,
    jobs_inserted:    stats.jobsInserted,
    jobs_updated:     stats.jobsUpdated,
    jobs_deactivated: stats.jobsDeactivated,
    error_message:    result.error ?? null,
  });

  if (error) {
    // Non-fatal — don't let logging failure kill the run
    console.error(`[scrape_runs] insert failed for source "${source}": ${error.message}`);
  }
}

// ── ATS company loader ─────────────────────────────────────────────────────────
// Queries companies table once at start; passed to ATS adapters so they can
// iterate without additional DB round-trips.

interface AtsCompany {
  id:       string;
  slug:     string;
  ats_type: 'greenhouse' | 'lever' | 'ashby';
  name:     string;
}

async function loadAtsCompanies(
  supabase: ReturnType<typeof createServiceClient>,
  tier?: number
): Promise<AtsCompany[]> {
  const query = supabase
    .from('companies')
    .select('id, slug, ats_type, name')
    .not('ats_type', 'is', null);

  if (tier !== undefined) query.eq('tier', tier);

  const { data, error } = await query;

  if (error) throw new Error(`Failed to load ATS companies: ${error.message}`);
  return (data ?? []) as AtsCompany[];
}

// ── Primary workflow ───────────────────────────────────────────────────────────

async function runPrimary(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SourceResult[]> {
  // Load Tier 1 companies (MNCs + curated remotes) once
  const tier1Companies = await loadAtsCompanies(supabase, 1);

  const greenhouseCompanies = tier1Companies.filter(c => c.ats_type === 'greenhouse');
  const leverCompanies      = tier1Companies.filter(c => c.ats_type === 'lever');
  const ashbyCompanies      = tier1Companies.filter(c => c.ats_type === 'ashby');

  // Five public API sources + three ATS sources, all sequential
  const sources: Array<[string, () => Promise<NormalizedJob[]>]> = [
    ['himalayas',        () => fetchHimalayas()],
    ['remotive',         () => fetchRemotive()],
    ['arbeitnow',        () => fetchArbeitnow()],
    ['remoteok',         () => fetchRemoteOK()],
    ['weworkremotely',   () => fetchWeWorkRemotely()],
    ['greenhouse',       () => fetchGreenhouseCompanies(greenhouseCompanies)],
    ['lever',            () => fetchLeverCompanies(leverCompanies)],
    ['ashby',            () => fetchAshbyCompanies(ashbyCompanies)],
  ];

  const results: SourceResult[] = [];
  for (const [name, fn] of sources) {
    results.push(await runSource(name, fn));
  }
  return results;
}

// ── Secondary workflow ─────────────────────────────────────────────────────────

async function runSecondary(
  supabase: ReturnType<typeof createServiceClient>
): Promise<SourceResult[]> {
  // Tier 2: Apify city-company discovery
  // Tier 3: career page crawlers for Tier 2 companies
  const tier2Companies = await loadAtsCompanies(supabase, 2);

  const sources: Array<[string, () => Promise<NormalizedJob[]>]> = [
    ['apify',        () => fetchApifyCity(tier2Companies)],
    ['career-pages', () => fetchCareerPages(tier2Companies)],
  ];

  const results: SourceResult[] = [];
  for (const [name, fn] of sources) {
    results.push(await runSource(name, fn));
  }
  return results;
}

// ── Main ───────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const workflow = parseWorkflow();
  const supabase = createServiceClient();

  console.log(`\n=== ApplierAI Scraper [${workflow}] — ${new Date().toISOString()} ===\n`);

  // 1. Run all sources for this workflow
  const sourceResults =
    workflow === 'primary'
      ? await runPrimary(supabase)
      : await runSecondary(supabase);

  // 2. For each source: upsert jobs → log to scrape_runs
  const totals: RunStats = {
    jobsFetched:     0,
    jobsInserted:    0,
    jobsUpdated:     0,
    jobsDeactivated: 0,
  };

  for (const result of sourceResults) {
    const startedAt = new Date(Date.now() - result.durationMs);
    let upsertStats = { jobsInserted: 0, jobsUpdated: 0, jobsDeactivated: 0 };

    if (result.jobs.length > 0) {
      upsertStats = await upsertJobs(supabase, result.jobs);
    }

    await logScrapeRun(supabase, result.source, workflow, startedAt, result, upsertStats);

    totals.jobsFetched     += result.jobs.length;
    totals.jobsInserted    += upsertStats.jobsInserted;
    totals.jobsUpdated     += upsertStats.jobsUpdated;
    totals.jobsDeactivated += upsertStats.jobsDeactivated;
  }

  // 3. Soft-delete jobs not seen in 48h (run once after all sources finish)
  const deactivated = await deactivateStaleJobs(supabase);
  totals.jobsDeactivated += deactivated;

  // 4. Summary
  const failed = sourceResults.filter(r => r.error).map(r => r.source);

  console.log('\n=== Run Summary ===');
  console.log(`Workflow:    ${workflow}`);
  console.log(`Sources:     ${sourceResults.length} (${failed.length} failed)`);
  if (failed.length > 0) console.log(`Failed:      ${failed.join(', ')}`);
  console.log(`Fetched:     ${totals.jobsFetched}`);
  console.log(`Inserted:    ${totals.jobsInserted}`);
  console.log(`Updated:     ${totals.jobsUpdated}`);
  console.log(`Deactivated: ${totals.jobsDeactivated}`);
  console.log('==================\n');

  // Exit non-zero if all sources failed (allows GH Actions to alert)
  if (failed.length === sourceResults.length) {
    console.error('All sources failed — exiting with error');
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Fatal scraper error:', err);
  process.exit(1);
});