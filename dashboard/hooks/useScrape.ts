"use client";

import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ScrapeRequest, ScrapeStatus } from "@/lib/api";

export function useScrape() {
  const queryClient = useQueryClient();
  const [taskStatus, setTaskStatus] = useState<ScrapeStatus | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  const mutation = useMutation({
    mutationFn: (req: ScrapeRequest) => api.scrape.trigger(req),
    onSuccess: (data) => {
      setTaskStatus(data);
      // Poll every 3 s until done/failed
      pollRef.current = setInterval(async () => {
        const status = await api.scrape.status(data.task_id);
        setTaskStatus(status);
        if (status.status === "done" || status.status === "failed") {
          stopPolling();
          if (status.status === "done") {
            queryClient.invalidateQueries({ queryKey: ["jobs"] });
          }
        }
      }, 3000);
    },
  });

  return { ...mutation, taskStatus };
}