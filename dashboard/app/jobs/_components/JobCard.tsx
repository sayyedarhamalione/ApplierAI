"use client";

import { Job } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { formatDistanceToNow } from "date-fns";

interface Props {
  job: Job;
}

function scoreColor(score: number | null): string {
  if (score === null) return "bg-muted text-muted-foreground";
  if (score >= 0.8) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (score >= 0.6) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function formatSalary(salary: Job["salary"]): string | null {
  if (!salary || (!salary.min && !salary.max)) return null;
  const fmt = (n: number) =>
    n >= 1000 ? `$${(n / 1000).toFixed(0)}k` : `$${n}`;
  const interval = salary.interval === "yearly" ? "/yr" : salary.interval === "hourly" ? "/hr" : "";
  if (salary.min && salary.max) return `${fmt(salary.min)} – ${fmt(salary.max)}${interval}`;
  if (salary.min) return `${fmt(salary.min)}+${interval}`;
  return `up to ${fmt(salary.max!)}${interval}`;
}

export function JobCard({ job }: Props) {
  const postedAgo = job.posted_at
    ? formatDistanceToNow(new Date(job.posted_at), { addSuffix: true })
    : null;
  const salaryStr = formatSalary(job.salary);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="pt-4 pb-2">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-medium truncate">{job.title}</p>
            <p className="text-sm text-muted-foreground truncate">{job.company}</p>
          </div>
          {job.match_score !== null && (
            <span
              className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${scoreColor(job.match_score)}`}
            >
              {(job.match_score * 100).toFixed(0)}%
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5 mt-2.5">
          {job.remote && <Badge variant="secondary">Remote</Badge>}
          {job.location && !job.remote && (
            <Badge variant="outline">{job.location}</Badge>
          )}
          {job.job_type && <Badge variant="outline">{job.job_type}</Badge>}
          <Badge variant="outline" className="capitalize">{job.source}</Badge>
          {salaryStr && <Badge variant="secondary">{salaryStr}</Badge>}
        </div>

        {postedAgo && (
          <p className="text-xs text-muted-foreground mt-2">{postedAgo}</p>
        )}
      </CardContent>

      <CardFooter className="pb-3 pt-0">
        {job.apply_url ? (
          <Button asChild size="sm" variant="default">
            <a href={job.apply_url} target="_blank" rel="noopener noreferrer">
              Apply
            </a>
          </Button>
        ) : (
          <Button size="sm" variant="secondary" disabled>
            No link
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}