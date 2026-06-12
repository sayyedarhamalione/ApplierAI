import { Suspense } from "react";
import { JobFeed } from "./_components/JobFeed";
import { JobFiltersPanel } from "./_components/JobFilters";

export const metadata = { title: "Jobs — ApplierAI" };

export default function JobsPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-semibold tracking-tight">ApplierAI</h1>
        <span className="text-sm text-muted-foreground">Job Feed</span>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar filters */}
        <aside className="w-56 shrink-0 hidden md:block">
          <Suspense>
            <JobFiltersPanel />
          </Suspense>
        </aside>

        {/* Main feed */}
        <main className="flex-1 min-w-0">
          <Suspense fallback={<FeedSkeleton />}>
            <JobFeed />
          </Suspense>
        </main>
      </div>
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 animate-pulse bg-muted h-28" />
      ))}
    </div>
  );
}