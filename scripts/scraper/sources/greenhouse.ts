import { NormalizedJob, normalizeGreenhouse } from '../normalize';

const BASE_URL = 'https://boards-api.greenhouse.io/v1/boards';

interface CompanyRef {
  id: string;
  slug: string;
}

export async function fetchGreenhouse(companies: CompanyRef[]): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  for (const company of companies) {
    try {
      const res = await fetch(`${BASE_URL}/${company.slug}/jobs?content=true`, {
        signal: AbortSignal.timeout(30_000),
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) throw new Error(`Greenhouse HTTP ${res.status} for ${company.slug}`);

      const data = await res.json() as { jobs: unknown[] };
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];

      all.push(...normalizeGreenhouse(company.slug, company.id, jobs));
    } catch (err) {
      console.error(`[greenhouse] ${company.slug} failed:`, err);
      // continue to next company
    }
  }

  return all;
}