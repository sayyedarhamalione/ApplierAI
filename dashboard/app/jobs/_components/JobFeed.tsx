"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { JobCard } from "./JobCard";
import { useJobs } from "@/hooks/useJobs";
import { Button } from "@/components/ui/button";
import { JobFilters } from "@/lib/api";

export function JobFeed() {
  const params = useSearchParams();
  const router = useRouter();

  const filters: JobFilters = {
    page: Number(params.get("page") ?? 1),
    page_size: 20,
    ...(params.get("min_score") && { min_score: Number(params.get("min_score")) }),
    ...(params.get("remote") && { remote: params.get("remote") === "true" }),
    ...(params.get("source") && { source: params.get("source")! }),
    ...(params.get("job_type") && { job_type: params.get("job_type")! }),
  };

  const { data, isLoading, isError } = useJobs(filters);

  const setPage = (p: number) => {
    const next = new URLSearchParams(params.toString());
    next.set("page", String(p));
    router.push(`/jobs?${next.toString()}`);
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-lg border p-4 animate-pulse bg-muted h-28" />
        ))}
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="rounded-lg border border-destructive/40 p-6 text-center text-sm text-destructive">
        Failed to load jobs. Check that the API is running.
      </div>
    );
  }

  if (data.items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <p className="text-sm">No jobs found.</p>
        <p className="text-xs mt-1">Try running a scrape or adjusting your filters.</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs text-muted-foreground mb-3">
        {data.total.toLocaleString()} jobs · page {data.page} of {data.pages}
      </p>

      <div className="space-y-3">
        {data.items.map((job) => (
          <JobCard key={job.id} job={job} />
        ))}
      </div>

      {data.pages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant="outline"
            size="sm"
            disabled={data.page <= 1}
            onClick={() => setPage(data.page - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            {data.page} / {data.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={data.page >= data.pages}
            onClick={() => setPage(data.page + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}