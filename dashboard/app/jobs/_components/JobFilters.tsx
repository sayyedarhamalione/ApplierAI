"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useScrape } from "@/hooks/useScrape";

const SOURCES = ["jobspy", "greenhouse", "lever", "ashby", "remoteok", "wwr"];
const JOB_TYPES = ["fulltime", "parttime", "contract", "internship"];

export function JobFiltersPanel() {
  const router = useRouter();
  const params = useSearchParams();
  const { mutate: triggerScrape, taskStatus, isPending } = useScrape();

  const set = useCallback(
    (key: string, value: string | null) => {
      const next = new URLSearchParams(params.toString());
      if (value === null || value === "") {
        next.delete(key);
      } else {
        next.set(key, value);
      }
      next.delete("page"); // reset pagination on filter change
      router.push(`/jobs?${next.toString()}`);
    },
    [params, router],
  );

  const minScore = Number(params.get("min_score") ?? 0);
  const remote = params.get("remote");
  const source = params.get("source") ?? "";
  const jobType = params.get("job_type") ?? "";

  const scrapeLabel =
    isPending || taskStatus?.status === "queued" || taskStatus?.status === "running"
      ? "Scraping…"
      : taskStatus?.status === "done"
      ? `Done (${taskStatus.message})`
      : "Scrape jobs";

  return (
    <div className="space-y-5">
      <div>
        <Button
          size="sm"
          className="w-full"
          onClick={() => triggerScrape({})}
          disabled={isPending || taskStatus?.status === "running"}
        >
          {scrapeLabel}
        </Button>
      </div>

      <div className="space-y-2">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Min match score: {minScore > 0 ? `${(minScore * 100).toFixed(0)}%` : "Any"}
        </Label>
        <Slider
          min={0}
          max={1}
          step={0.05}
          value={[minScore]}
          onValueChange={([v]) => set("min_score", v === 0 ? null : String(v))}
        />
      </div>

      <div className="flex items-center justify-between">
        <Label className="text-sm">Remote only</Label>
        <Switch
          checked={remote === "true"}
          onCheckedChange={(v) => set("remote", v ? "true" : null)}
        />
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Source</Label>
        <Select value={source} onValueChange={(v) => set("source", v === "all" ? null : v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sources</SelectItem>
            {SOURCES.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">Job type</Label>
        <Select value={jobType} onValueChange={(v) => set("job_type", v === "all" ? null : v)}>
          <SelectTrigger className="h-8 text-sm">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {JOB_TYPES.map((t) => (
              <SelectItem key={t} value={t}>{t}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {(minScore > 0 || remote || source || jobType) && (
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={() => router.push("/jobs")}
        >
          Clear filters
        </Button>
      )}
    </div>
  );
}