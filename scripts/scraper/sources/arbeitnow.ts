import { NormalizedJob, normalizeArbeitnow } from '../normalize';

const API_URL = 'https://www.arbeitnow.com/api/job-board-api';
const MAX_PAGES = 20;

export async function fetchArbeitnow(): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];
  let page = 1;

  while (page <= MAX_PAGES) {
    try {
      const res = await fetch(`${API_URL}?page=${page}`, {
        signal: AbortSignal.timeout(30_000),
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) throw new Error(`Arbeitnow HTTP ${res.status} on page ${page}`);

      const data = await res.json() as { data: unknown[] };
      const jobs = Array.isArray(data.data) ? data.data : [];

      if (jobs.length === 0) break;

      all.push(...normalizeArbeitnow(jobs));
      page++;
    } catch (err) {
      console.error(`[arbeitnow] page ${page} failed:`, err);
      break;
    }
  }

  return all;
}