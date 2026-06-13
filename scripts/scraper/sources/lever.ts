import { NormalizedJob, normalizeLever } from '../normalize';

const BASE_URL = 'https://api.lever.co/v0/postings';

interface CompanyRef {
  id: string;
  slug: string;
}

export async function fetchLever(companies: CompanyRef[]): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  for (const company of companies) {
    try {
      const res = await fetch(`${BASE_URL}/${company.slug}?mode=json`, {
        signal: AbortSignal.timeout(30_000),
        headers: { 'Accept': 'application/json' },
      });

      if (!res.ok) throw new Error(`Lever HTTP ${res.status} for ${company.slug}`);

      const postings = await res.json() as unknown[];
      const data = Array.isArray(postings) ? postings : [];

      all.push(...normalizeLever(company.slug, company.id, data));
    } catch (err) {
      console.error(`[lever] ${company.slug} failed:`, err);
      // continue to next company
    }
  }

  return all;
}