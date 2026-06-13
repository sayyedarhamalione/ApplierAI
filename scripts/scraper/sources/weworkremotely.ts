import { NormalizedJob, normalizeWeWorkRemotely } from '../normalize';

const RSS_URL = 'https://weworkremotely.com/remote-jobs.rss';

/** Extracts text content from first matching XML tag */
function extractTag(xml: string, tag: string): string {
  const cdataMatch = new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]></${tag}>`, 'i').exec(xml);
  if (cdataMatch) return cdataMatch[1].trim();
  const plainMatch = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i').exec(xml);
  return plainMatch ? plainMatch[1].trim() : '';
}

/** Parses <item> blocks from RSS XML */
function parseItems(xml: string): Record<string, string>[] {
  const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
  const items: Record<string, string>[] = [];
  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1];
    items.push({
      title:   extractTag(block, 'title'),
      link:    extractTag(block, 'link'),
      pubDate: extractTag(block, 'pubDate'),
      region:  extractTag(block, 'region'),
      type:    extractTag(block, 'type'),
    });
  }

  return items;
}

export async function fetchWeWorkRemotely(): Promise<NormalizedJob[]> {
  const all: NormalizedJob[] = [];

  try {
    const res = await fetch(RSS_URL, {
      signal: AbortSignal.timeout(30_000),
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
    });

    if (!res.ok) throw new Error(`WeWorkRemotely HTTP ${res.status}`);

    const xml = await res.text();
    const items = parseItems(xml);
    all.push(...normalizeWeWorkRemotely(items));
  } catch (err) {
    console.error('[weworkremotely] fetch failed:', err);
  }

  return all;
}