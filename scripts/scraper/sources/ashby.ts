import { NormalizedJob, normalizeAshby } from '../normalize';

const BASE_URL = 'https://api.ashbyhq.com/posting-api/job-board';

interface CompanyRef {
  id: string;
  slug: string;
}

export async function fetchAshby(companies: CompanyRef[]): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  for (const company of companies) {
    try {
      const res = await fetch(`${BASE_URL}/${company.slug}`, {
        method: 'POST',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      });

      if (!res.ok) throw new Error(`Ashby HTTP ${res.status} for ${company.slug}`);

      const data = await res.json() as { jobPostings: unknown[] };
      const postings = Array.isArray(data.jobPostings) ? data.jobPostings : [];

      all.push(...normalizeAshby(company.slug, company.id, postings));
    } catch (err) {
      console.error(`[ashby] ${company.slug} failed:`, err);
      // continue to next company
    }
  }

  return all;
}