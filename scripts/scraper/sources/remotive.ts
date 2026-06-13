import { NormalizedJob, normalizeRemotive } from '../normalize';

const API_URL = 'https://remotive.com/api/remote-jobs';

export async function fetchRemotive(): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  try {
    const res = await fetch(API_URL, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'Accept': 'application/json' },
    });

    if (!res.ok) throw new Error(`Remotive HTTP ${res.status}`);

    const data = await res.json() as { jobs: unknown[] };
    const jobs = Array.isArray(data.jobs) ? data.jobs : [];
    all.push(...normalizeRemotive(jobs));
  } catch (err) {
    console.error('[remotive] fetch failed:', err);
  }

  return all;
}