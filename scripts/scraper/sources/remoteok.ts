import { NormalizedJob, normalizeRemoteOK } from '../normalize';

const API_URL = 'https://remoteok.com/api';

export async function fetchRemoteOK(): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  try {
    const res = await fetch(API_URL, {
      signal: AbortSignal.timeout(30_000),
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'ApplierAI/1.0',
      },
    });

    if (!res.ok) throw new Error(`RemoteOK HTTP ${res.status}`);

    const data = await res.json() as unknown[];

    // First element is legal notice — skip it
    const jobs = Array.isArray(data) ? data.slice(1) : [];
    all.push(...normalizeRemoteOK(jobs));
  } catch (err) {
    console.error('[remoteok] fetch failed:', err);
  }

  return all;
}