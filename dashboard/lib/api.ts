const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface SalaryRange {
  min: number | null;
  max: number | null;
  currency: string;
  interval: string | null;
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string | null;
  remote: boolean;
  job_type: string | null;
  source: string;
  apply_url: string | null;
  description: string | null;
  salary: SalaryRange | null;
  match_score: number | null;
  posted_at: string | null;
  scraped_at: string;
}

export interface PaginatedJobs {
  items: Job[];
  total: number;
  page: number;
  page_size: number;
  pages: number;
}

export interface JobFilters {
  min_score?: number;
  remote?: boolean;
  source?: string;
  job_type?: string;
  date_from?: string;
  page?: number;
  page_size?: number;
}

export interface ScrapeRequest {
  sources?: string[];
  keywords?: string[];
  location?: string;
  limit_per_source?: number;
}

export interface ScrapeStatus {
  task_id: string;
  status: "queued" | "running" | "done" | "failed";
  message: string;
}

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`API ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  jobs: {
    list(filters: JobFilters = {}): Promise<PaginatedJobs> {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v !== undefined && v !== null) params.set(k, String(v));
      });
      const qs = params.toString();
      return apiFetch<PaginatedJobs>(`/jobs${qs ? `?${qs}` : ""}`);
    },
    get(id: string): Promise<Job> {
      return apiFetch<Job>(`/jobs/${id}`);
    },
  },
  scrape: {
    trigger(req: ScrapeRequest = {}): Promise<ScrapeStatus> {
      return apiFetch<ScrapeStatus>("/scrape", {
        method: "POST",
        body: JSON.stringify(req),
      });
    },
    status(taskId: string): Promise<ScrapeStatus> {
      return apiFetch<ScrapeStatus>(`/scrape/${taskId}`);
    },
  },
};