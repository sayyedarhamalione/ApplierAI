/**
 * scripts/scraper/normalize.ts
 * Converts raw API responses from any source into a unified NormalizedJob shape.
 * No DB calls. No AI. Pure transform + heuristics.
 *
 * Each source adapter calls the relevant normalizer, then returns NormalizedJob[].
 * The upsert layer only ever sees NormalizedJob — never raw API shapes.
 */

import { createHash } from 'crypto';
import {
  ExperienceLevel,
  JobType,
} from '../types/db';

// ── Canonical shape ────────────────────────────────────────────────────────────

export interface NormalizedJob {
  // Identity
  external_id:     string;   // SHA-256 hash — dedup key
  source:          string;   // 'himalayas' | 'remotive' | 'greenhouse' | ...

  // Company linkage
  company_id:      string | null;  // set by upsert layer if slug matches companies table
  company_name:    string;

  // Core fields
  title:           string;
  description:     string;
  apply_url:       string;

  // Location
  location:        string;         // raw string from source ("Remote", "Bangalore, IN")
  cities:          string[];       // normalized city array for GIN index filtering
  is_remote:       boolean;

  // Classification
  job_type:        JobType;
  experience_level: ExperienceLevel;
  skills:          string[];

  // Salary (optional — many jobs omit)
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string | null;

  // Timestamps
  posted_at:       string;         // ISO 8601
}

// ── Skills taxonomy (50 common tech skills) ───────────────────────────────────
// Simple string-inclusion match against lowercased job description.
// Order matters for multi-word terms — check longer strings first.

const SKILL_TAXONOMY: string[] = [
  // Languages
  'typescript', 'javascript', 'python', 'golang', 'go', 'rust', 'java', 'kotlin',
  'swift', 'ruby', 'php', 'scala', 'elixir', 'c++', 'c#',
  // Frontend
  'react', 'next.js', 'vue', 'angular', 'svelte', 'tailwind',
  // Backend / infra
  'node.js', 'express', 'fastapi', 'django', 'rails', 'graphql', 'rest api',
  'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch',
  'docker', 'kubernetes', 'terraform', 'aws', 'gcp', 'azure',
  'ci/cd', 'github actions',
  // Data / ML
  'machine learning', 'deep learning', 'pytorch', 'tensorflow', 'pandas',
  'spark', 'airflow', 'dbt', 'sql',
  // Other
  'linux', 'git', 'figma', 'product management',
];

export function extractSkills(text: string): string[] {
  const lower = text.toLowerCase();
  const found = new Set<string>();
  for (const skill of SKILL_TAXONOMY) {
    if (lower.includes(skill)) found.add(skill);
  }
  return Array.from(found);
}

// ── Experience level heuristics ────────────────────────────────────────────────
// Regex patterns evaluated in priority order — first match wins.

const EXPERIENCE_PATTERNS: Array<[RegExp, ExperienceLevel]> = [
  [/\b(fresher|fresh graduate|entry.?level|0[\s-]?[–-]?[\s]?[12]\s*year|intern)\b/i, 'fresher'],
  [/\b([1-3]\+?\s*year|junior|associate)\b/i,                                         '1-3'],
  [/\b([3-7]\+?\s*year|mid.?level|mid\s+senior)\b/i,                                  '3-7'],
  [/\b([7-9]\d*\+?\s*year|senior|staff|principal|lead|architect|director)\b/i,        '7+'],
];

export function extractExperienceLevel(
  title: string,
  description: string
): ExperienceLevel {
  const combined = `${title} ${description}`;
  for (const [pattern, level] of EXPERIENCE_PATTERNS) {
    if (pattern.test(combined)) return level;
  }
  return 'fresher'; // default — prevents null; matches widest audience
}

// ── Job type heuristics ────────────────────────────────────────────────────────

const JOB_TYPE_PATTERNS: Array<[RegExp, JobType]> = [
  [/\bpart.?time\b/i,               'part-time'],
  [/\b(contract|freelance|1099)\b/i, 'contract'],
  [/\bfull.?time\b/i,                'full-time'],
];

export function extractJobType(raw: string | null | undefined): JobType {
  if (!raw) return 'full-time';
  for (const [pattern, type] of JOB_TYPE_PATTERNS) {
    if (pattern.test(raw)) return type;
  }
  return 'full-time';
}

// ── Location normalization ─────────────────────────────────────────────────────
// Maps raw location strings → { cities, is_remote }.
// Cities array is stored with GIN index for multi-city filtering.

const INDIAN_CITY_ALIASES: Record<string, string> = {
  'bengaluru': 'bangalore',
  'bombay':    'mumbai',
  'new delhi': 'delhi',
  'ncr':       'delhi',
  'gurugram':  'delhi',
  'gurgaon':   'delhi',
  'noida':     'delhi',
};

const TRACKED_CITIES = new Set([
  'bangalore', 'mumbai', 'hyderabad', 'pune', 'delhi',
]);

export function normalizeLocation(raw: string | null | undefined): {
  cities:    string[];
  is_remote: boolean;
} {
  if (!raw) return { cities: [], is_remote: true };

  const lower = raw.toLowerCase();
  const is_remote = /\b(remote|anywhere|worldwide|global)\b/.test(lower);

  const cities: string[] = [];
  for (const [alias, canonical] of Object.entries(INDIAN_CITY_ALIASES)) {
    if (lower.includes(alias)) {
      if (!cities.includes(canonical)) cities.push(canonical);
    }
  }
  for (const city of TRACKED_CITIES) {
    if (lower.includes(city) && !cities.includes(city)) {
      cities.push(city);
    }
  }

  return { cities, is_remote };
}

// ── Salary parsing ─────────────────────────────────────────────────────────────
// Handles "$120k", "120,000", "₹20 LPA", "€80000–100000", etc.
// Returns null values when unparseable — never guess.

const CURRENCY_SYMBOLS: Record<string, string> = {
  '$': 'USD', '€': 'EUR', '£': 'GBP', '₹': 'INR', '¥': 'JPY',
};

export function parseSalary(raw: string | null | undefined): {
  salary_min:      number | null;
  salary_max:      number | null;
  salary_currency: string | null;
} {
  const blank = { salary_min: null, salary_max: null, salary_currency: null };
  if (!raw) return blank;

  // Detect currency symbol
  let currency: string | null = null;
  for (const [symbol, code] of Object.entries(CURRENCY_SYMBOLS)) {
    if (raw.includes(symbol)) { currency = code; break; }
  }
  // Fallback: detect ISO code
  if (!currency) {
    const isoMatch = raw.match(/\b(USD|EUR|GBP|INR|CAD|AUD)\b/i);
    if (isoMatch) currency = isoMatch[1].toUpperCase();
  }

  // Extract numeric values
  const numbers = raw
    .replace(/,/g, '')
    .match(/\d+(\.\d+)?/g)
    ?.map(Number) ?? [];

  // Handle "k" multiplier (e.g., "120k")
  const kMatches = raw.match(/(\d+)\s*k/gi) ?? [];
  const expanded = kMatches.map(m => parseInt(m) * 1000);
  const allNums = expanded.length > 0 ? expanded : numbers;

  if (allNums.length === 0) return blank;

  // LPA (Indian Lakhs Per Annum) → annual INR
  if (/lpa|lakh/i.test(raw)) {
    const lpa = allNums[0];
    const min = lpa * 100_000;
    const max = allNums[1] ? allNums[1] * 100_000 : min;
    return { salary_min: min, salary_max: max, salary_currency: 'INR' };
  }

  const [min, max] = allNums.length >= 2
    ? [Math.min(...allNums), Math.max(...allNums)]
    : [allNums[0], allNums[0]];

  return { salary_min: min, salary_max: max, salary_currency: currency };
}

// ── External ID (dedup key) ────────────────────────────────────────────────────
// SHA-256 of source + company + title + url.
// Stable across runs — same job from same source always produces the same hash.

export function buildExternalId(
  source: string,
  company: string,
  title: string,
  url: string
): string {
  const raw = [source, company.toLowerCase().trim(), title.toLowerCase().trim(), url.trim()]
    .join('|');
  return createHash('sha256').update(raw).digest('hex');
}

// ── Date normalization ─────────────────────────────────────────────────────────
// Returns ISO 8601 string. Falls back to now() if unparseable.

export function normalizeDate(raw: string | number | null | undefined): string {
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

// ── Text sanitization ──────────────────────────────────────────────────────────
// Strip HTML tags, collapse whitespace. Used on description fields.

export function sanitizeText(raw: string | null | undefined): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')   // strip HTML
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Source-specific normalizers ────────────────────────────────────────────────
// Each normalizer takes raw API shape → NormalizedJob[].
// Adapters import and call these; they never touch DB types directly.

// --- Himalayas ------------------------------------------------------------------

export interface RawHimalayasJob {
  id:          string;
  title:       string;
  companyName: string;
  description: string;
  url:         string;
  locationRestrictions?: string[];
  remoteOk?:   boolean;
  jobType?:    string;
  salary?:     string;
  createdAt?:  string;
}

export function normalizeHimalayas(raw: RawHimalayasJob[]): NormalizedJob[] {
  return raw.map(job => {
    const locationRaw = job.locationRestrictions?.join(', ') ?? null;
    const { cities, is_remote } = normalizeLocation(locationRaw);
    const description = sanitizeText(job.description);
    return {
      external_id:      buildExternalId('himalayas', job.companyName, job.title, job.url),
      source:           'himalayas',
      company_id:       null,
      company_name:     job.companyName,
      title:            job.title,
      description,
      apply_url:        job.url,
      location:         locationRaw ?? 'Remote',
      cities,
      is_remote:        job.remoteOk ?? is_remote,
      job_type:         extractJobType(job.jobType),
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      ...parseSalary(job.salary ?? null),
      posted_at:        normalizeDate(job.createdAt),
    };
  });
}

// --- Remotive ------------------------------------------------------------------

export interface RawRemotiveJob {
  id:           number;
  url:          string;
  title:        string;
  company_name: string;
  description:  string;
  job_type?:    string;
  salary?:      string;
  publication_date?: string;
  candidate_required_location?: string;
}

export function normalizeRemotive(raw: RawRemotiveJob[]): NormalizedJob[] {
  return raw.map(job => {
    const { cities, is_remote } = normalizeLocation(job.candidate_required_location);
    const description = sanitizeText(job.description);
    return {
      external_id:      buildExternalId('remotive', job.company_name, job.title, job.url),
      source:           'remotive',
      company_id:       null,
      company_name:     job.company_name,
      title:            job.title,
      description,
      apply_url:        job.url,
      location:         job.candidate_required_location ?? 'Remote',
      cities,
      is_remote,
      job_type:         extractJobType(job.job_type),
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      ...parseSalary(job.salary ?? null),
      posted_at:        normalizeDate(job.publication_date),
    };
  });
}

// --- Arbeitnow -----------------------------------------------------------------

export interface RawArbeitnowJob {
  slug:         string;
  url:          string;
  title:        string;
  company_name: string;
  description:  string;
  job_types?:   string[];
  salary?:      string;
  created_at?:  string;
  remote?:      boolean;
  location?:    string;
}

export function normalizeArbeitnow(raw: RawArbeitnowJob[]): NormalizedJob[] {
  return raw.map(job => {
    const { cities, is_remote } = normalizeLocation(job.location);
    const description = sanitizeText(job.description);
    return {
      external_id:      buildExternalId('arbeitnow', job.company_name, job.title, job.url),
      source:           'arbeitnow',
      company_id:       null,
      company_name:     job.company_name,
      title:            job.title,
      description,
      apply_url:        job.url,
      location:         job.location ?? 'Remote',
      cities,
      is_remote:        job.remote ?? is_remote,
      job_type:         extractJobType(job.job_types?.[0]),
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      ...parseSalary(job.salary ?? null),
      posted_at:        normalizeDate(job.created_at),
    };
  });
}

// --- RemoteOK ------------------------------------------------------------------

export interface RawRemoteOKJob {
  id:       string;
  url:      string;
  position: string;
  company:  string;
  description?: string;
  tags?:    string[];
  salary_min?: number;
  salary_max?: number;
  date?:    string;
}

export function normalizeRemoteOK(raw: RawRemoteOKJob[]): NormalizedJob[] {
  return raw.map(job => {
    const description = sanitizeText(job.description);
    return {
      external_id:      buildExternalId('remoteok', job.company, job.position, job.url),
      source:           'remoteok',
      company_id:       null,
      company_name:     job.company,
      title:            job.position,
      description,
      apply_url:        job.url,
      location:         'Remote',
      cities:           [],
      is_remote:        true,
      job_type:         'full-time',
      experience_level: extractExperienceLevel(job.position, description),
      // RemoteOK tags are clean skill names — use directly alongside description extraction
      skills:           Array.from(new Set([
                          ...(job.tags ?? []).map(t => t.toLowerCase()),
                          ...extractSkills(description),
                        ])),
      salary_min:       job.salary_min ?? null,
      salary_max:       job.salary_max ?? null,
      salary_currency:  job.salary_min ? 'USD' : null,
      posted_at:        normalizeDate(job.date),
    };
  });
}

// --- WeWorkRemotely ------------------------------------------------------------

export interface RawWWRJob {
  id:          string;
  url:         string;
  title:       string;
  company:     string;
  description: string;
  job_type?:   string;
  region?:     string;
  pub_date?:   string;
}

export function normalizeWeWorkRemotely(raw: RawWWRJob[]): NormalizedJob[] {
  return raw.map(job => {
    const { cities, is_remote } = normalizeLocation(job.region);
    const description = sanitizeText(job.description);
    return {
      external_id:      buildExternalId('weworkremotely', job.company, job.title, job.url),
      source:           'weworkremotely',
      company_id:       null,
      company_name:     job.company,
      title:            job.title,
      description,
      apply_url:        job.url,
      location:         job.region ?? 'Remote',
      cities,
      is_remote:        is_remote || true, // WWR is remote-only by definition
      job_type:         extractJobType(job.job_type),
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      posted_at:        normalizeDate(job.pub_date),
    };
  });
}

// --- Greenhouse ----------------------------------------------------------------
// ATS normalizer receives pre-fetched company metadata alongside raw jobs.

export interface RawGreenhouseJob {
  id:            number;
  title:         string;
  absolute_url:  string;
  content:       string;
  location:      { name: string };
  updated_at?:   string;
}

export function normalizeGreenhouse(
  raw: RawGreenhouseJob[],
  companyName: string,
  companyId: string | null
): NormalizedJob[] {
  return raw.map(job => {
    const locationRaw = job.location?.name ?? null;
    const { cities, is_remote } = normalizeLocation(locationRaw);
    const description = sanitizeText(job.content);
    return {
      external_id:      buildExternalId('greenhouse', companyName, job.title, job.absolute_url),
      source:           'greenhouse',
      company_id:       companyId,
      company_name:     companyName,
      title:            job.title,
      description,
      apply_url:        job.absolute_url,
      location:         locationRaw ?? 'Remote',
      cities,
      is_remote,
      job_type:         'full-time',
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      posted_at:        normalizeDate(job.updated_at),
    };
  });
}

// --- Lever ---------------------------------------------------------------------

export interface RawLeverJob {
  id:         string;
  text:       string;   // title
  hostedUrl:  string;
  descriptionBody?: string;
  categories?: {
    location?:     string;
    commitment?:   string;
  };
  createdAt?: number;   // Unix ms
}

export function normalizeLever(
  raw: RawLeverJob[],
  companyName: string,
  companyId: string | null
): NormalizedJob[] {
  return raw.map(job => {
    const locationRaw = job.categories?.location ?? null;
    const { cities, is_remote } = normalizeLocation(locationRaw);
    const description = sanitizeText(job.descriptionBody);
    return {
      external_id:      buildExternalId('lever', companyName, job.text, job.hostedUrl),
      source:           'lever',
      company_id:       companyId,
      company_name:     companyName,
      title:            job.text,
      description,
      apply_url:        job.hostedUrl,
      location:         locationRaw ?? 'Remote',
      cities,
      is_remote,
      job_type:         extractJobType(job.categories?.commitment),
      experience_level: extractExperienceLevel(job.text, description),
      skills:           extractSkills(description),
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      posted_at:        normalizeDate(job.createdAt),
    };
  });
}

// --- Ashby ---------------------------------------------------------------------

export interface RawAshbyJob {
  id:            string;
  title:         string;
  jobUrl:        string;
  descriptionHtml?: string;
  location?:     string;
  employmentType?: string;
  publishedAt?:  string;
}

export function normalizeAshby(
  raw: RawAshbyJob[],
  companyName: string,
  companyId: string | null
): NormalizedJob[] {
  return raw.map(job => {
    const { cities, is_remote } = normalizeLocation(job.location);
    const description = sanitizeText(job.descriptionHtml);
    return {
      external_id:      buildExternalId('ashby', companyName, job.title, job.jobUrl),
      source:           'ashby',
      company_id:       companyId,
      company_name:     companyName,
      title:            job.title,
      description,
      apply_url:        job.jobUrl,
      location:         job.location ?? 'Remote',
      cities,
      is_remote,
      job_type:         extractJobType(job.employmentType),
      experience_level: extractExperienceLevel(job.title, description),
      skills:           extractSkills(description),
      salary_min:       null,
      salary_max:       null,
      salary_currency:  null,
      posted_at:        normalizeDate(job.publishedAt),
    };
  });
}