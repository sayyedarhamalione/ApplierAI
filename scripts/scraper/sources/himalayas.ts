/**
 * scripts/scraper/sources/himalayas.ts
 * Fetches jobs from the Himalayas public API and returns NormalizedJob[].
 * https://himalayas.app/api
 */

import { NormalizedJob, normalizeHimalayas, RawHimalayasJob } from '../normalize';

const BASE_URL  = 'https://himalayas.app/jobs/api';
const PAGE_SIZE = 100;

interface HimalayasResponse {
  jobs:       RawHimalayasJob[];
  total:      number;
  page:       number;
  pageSize:   number;
}

async function fetchPage(page: number): Promise<HimalayasResponse> {
  const url = `${BASE_URL}?limit=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}`;
  const res = await fetch(url, {
    headers: { 'Accept': 'application/json' },
    signal:  AbortSignal.timeout(30_000),
  });

  if (!res.ok) throw new Error(`Himalayas HTTP ${res.status}: ${res.statusText}`);
  return res.json() as Promise<HimalayasResponse>;
}

export async function fetchHimalayas(): Promise<NormalizedJob[]> {
  const first = await fetchPage(1);
  const totalPages = Math.ceil(first.total / PAGE_SIZE);

  const raw: RawHimalayasJob[] = [...first.jobs];

  for (let page = 2; page <= totalPages; page++) {
    const data = await fetchPage(page);
    raw.push(...data.jobs);
  }

  return normalizeHimalayas(raw);
}