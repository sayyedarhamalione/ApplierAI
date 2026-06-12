"use client";

import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, Job, JobFilters } from "@/lib/api";
import { supabase } from "@/lib/supabase";

export function useJobs(filters: JobFilters = {}) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ["jobs", filters],
    queryFn: () => api.jobs.list(filters),
    staleTime: 30_000,
  });

  // Supabase Realtime — invalidate on INSERT/UPDATE
  useEffect(() => {
    const channel = supabase
      .channel("jobs-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "jobs" },
        () => {
          queryClient.invalidateQueries({ queryKey: ["jobs"] });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);

  return query;
}

export function useJob(id: string) {
  return useQuery({
    queryKey: ["job", id],
    queryFn: () => api.jobs.get(id),
    enabled: !!id,
  });
}