'use client'

/**
 * components/jobs/JobFeed.tsx
 *
 * Client component. Owns the active drawer job and apply/save state.
 * Reads filters from URL params, fetches /api/jobs, renders cards + drawer.
 *
 * Initial data (from server page.tsx) is used on first paint.
 * Subsequent filter changes trigger client-side fetches.
 *
 * Staggered entry animation: translateY(4px)→0 + opacity 0→1,
 * 30ms stagger between cards. Only new items animate on filter change.
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { JobCard } from './JobCard'
import { JobDetail } from './JobDetail'
import { JobFilter } from './JobFilter'
import type { ScoredJob, JobFeedResponse } from '@/types/app'

// ---------------------------------------------------------------------------
// Search bar
// ---------------------------------------------------------------------------

function SearchBar({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div
      className="relative mx-auto"
      style={{ width: '560px', maxWidth: '100%' }}
    >
      <Search
        size={16}
        strokeWidth={1.5}
        className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2"
        style={{ color: 'hsl(0,0%,38%)' }}
      />
      <input
        type="text"
        placeholder="search jobs…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-transparent py-0 pl-10 pr-4 text-[14px] outline-none placeholder:text-neutral-600"
        style={{
          height: '48px',
          border: '1px solid hsl(0,0%,20%)',
          borderRadius: '8px',
          backgroundColor: 'hsl(220,6%,10%)',
          color: 'hsl(0,0%,90%)',
          caretColor: 'hsl(213,80%,52%)',
        }}
        onFocus={(e) => {
          e.currentTarget.style.boxShadow = '0 0 0 2px hsl(213,80%,52%)'
          e.currentTarget.style.borderColor = 'hsl(213,80%,52%,0.5)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.boxShadow = ''
          e.currentTarget.style.borderColor = 'hsl(0,0%,20%)'
        }}
      />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Pagination
// ---------------------------------------------------------------------------

function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (p: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 py-6">
      <button
        onClick={() => onPage(page - 1)}
        disabled={page <= 1}
        className="h-8 w-8 rounded text-[13px] disabled:opacity-30 transition-colors"
        style={{
          border: '1px solid hsl(0,0%,20%)',
          color: 'hsl(0,0%,55%)',
        }}
      >
        ←
      </button>

      {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
        const p = i + 1
        return (
          <button
            key={p}
            onClick={() => onPage(p)}
            className="h-8 min-w-8 rounded px-2 text-[13px] font-mono transition-colors"
            style={{
              border: '1px solid',
              borderColor: p === page ? 'hsl(213,80%,52%,0.5)' : 'hsl(0,0%,20%)',
              backgroundColor: p === page ? 'hsl(213,80%,52%,0.1)' : 'transparent',
              color: p === page ? 'hsl(213,80%,65%)' : 'hsl(0,0%,45%)',
            }}
          >
            {p}
          </button>
        )
      })}

      <button
        onClick={() => onPage(page + 1)}
        disabled={page >= totalPages}
        className="h-8 w-8 rounded text-[13px] disabled:opacity-30 transition-colors"
        style={{
          border: '1px solid hsl(0,0%,20%)',
          color: 'hsl(0,0%,55%)',
        }}
      >
        →
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyState({ query }: { query: string }) {
  const router = useRouter()
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <p style={{ fontSize: '15px', color: 'hsl(0,0%,45%)' }}>
        no jobs match{query ? ` "${query}"` : ' your filters'}
      </p>
      <button
        onClick={() => router.push('/jobs')}
        className="text-[13px] underline underline-offset-2"
        style={{ color: 'hsl(213,80%,55%)' }}
      >
        clear filters
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main JobFeed
// ---------------------------------------------------------------------------

interface JobFeedProps {
  initialData?: JobFeedResponse
}

const PAGE_SIZE = 50

export function JobFeed({ initialData }: JobFeedProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // ── Local state
  const [jobs, setJobs] = useState<ScoredJob[]>(initialData?.jobs ?? [])
  const [total, setTotal] = useState(initialData?.total ?? 0)
  const [scored, setScored] = useState(initialData?.scored ?? false)
  const [activeJob, setActiveJob] = useState<ScoredJob | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  // Map of job_id → user status
  const [userStatuses, setUserStatuses] = useState<Record<string, { status: string }>>({})

  // Search query (debounced before URL push)
  const [localQuery, setLocalQuery] = useState(searchParams.get('query') ?? '')
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Track which job IDs were in the previous render (for animation)
  const prevJobIdsRef = useRef<Set<string>>(new Set((initialData?.jobs ?? []).map(j => j.id)))

  // Current page from URL
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const totalPages = Math.ceil(total / PAGE_SIZE)

  // ── Fetch jobs when params change
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    const qs = params.toString()

    // Skip initial fetch if we have initialData and params match
    // (page=1, no filters)
    if (!qs && initialData && jobs.length > 0) return

    startTransition(async () => {
      try {
        const res = await fetch(`/api/jobs?${qs}`, { cache: 'no-store' })
        if (!res.ok) throw new Error('fetch failed')
        const data: JobFeedResponse = await res.json()

        setJobs(data.jobs)
        setTotal(data.total)
        setScored(data.scored)
        prevJobIdsRef.current = new Set(data.jobs.map((j) => j.id))
      } catch (err) {
        console.error('[JobFeed] fetch error', err)
      }
    })
  }, [searchParams]) // eslint-disable-line

  // ── Search debounce → URL param
  function handleQueryChange(v: string) {
    setLocalQuery(v)
    if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current)
    queryDebounceRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (v) params.set('query', v)
      else params.delete('query')
      params.delete('page')
      router.push(`/jobs?${params.toString()}`, { scroll: false })
    }, 300)
  }

  // ── Open drawer (swap without re-animation if already open)
  function handleOpenJob(job: ScoredJob) {
    setActiveJob(job)
    setDrawerOpen(true)
  }

  // ── Save job
  const handleSave = useCallback(async (job: ScoredJob) => {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'saved' }),
    })
    if (!res.ok) throw new Error('save failed')
    setUserStatuses((prev) => ({ ...prev, [job.id]: { status: 'saved' } }))
  }, [])

  // ── Apply job
  const handleApply = useCallback(async (job: ScoredJob) => {
    const res = await fetch(`/api/jobs/${job.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'applied' }),
    })
    if (!res.ok) throw new Error('apply failed')
    setUserStatuses((prev) => ({ ...prev, [job.id]: { status: 'applied' } }))
  }, [])

  // ── Pagination
  function handlePage(p: number) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('page', String(p))
    router.push(`/jobs?${params.toString()}`, { scroll: false })
  }

  return (
    <div
      className="flex h-full flex-col"
      style={{ paddingRight: drawerOpen ? '480px' : '0', transition: 'padding-right 120ms ease-out' }}
    >
      {/* Top: search + filters */}
      <div
        className="sticky top-0 z-30 flex flex-col gap-3 px-6 py-5"
        style={{ backgroundColor: 'hsl(220,8%,9%)', borderBottom: '1px solid hsl(0,0%,14%)' }}
      >
        <div className="flex justify-center">
          <SearchBar value={localQuery} onChange={handleQueryChange} />
        </div>
        <JobFilter
          totalCount={total}
          filteredCount={jobs.length}
        />
      </div>

      {/* Job list */}
      <div
        className="flex-1 overflow-y-auto px-6 py-4"
        style={{ opacity: isPending ? 0.6 : 1, transition: 'opacity 80ms' }}
      >
        {jobs.length === 0 ? (
          <EmptyState query={localQuery} />
        ) : (
          <div className="flex flex-col gap-px">
            {jobs.map((job, i) => {
              const isNew = !prevJobIdsRef.current.has(job.id)
              const status = userStatuses[job.id]

              return (
                <div
                  key={job.id}
                  className="job-card-enter"
                  style={{
                    animationDelay: isNew ? `${i * 30}ms` : '0ms',
                    animationPlayState: isNew ? 'running' : 'paused',
                  }}
                >
                  <JobCard
                    job={job}
                    isActive={activeJob?.id === job.id && drawerOpen}
                    isApplied={status?.status === 'applied'}
                    isSaved={status?.status === 'saved'}
                    scored={scored}
                    onOpen={handleOpenJob}
                    onSave={handleSave}
                  />
                </div>
              )
            })}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={handlePage} />
      </div>

      {/* Detail drawer */}
      <JobDetail
        job={activeJob}
        isOpen={drawerOpen}
        isSaved={activeJob ? userStatuses[activeJob.id]?.status === 'saved' : false}
        isApplied={activeJob ? userStatuses[activeJob.id]?.status === 'applied' : false}
        scored={scored}
        onClose={() => setDrawerOpen(false)}
        onSave={handleSave}
        onApply={handleApply}
      />

      {/* Stagger keyframe — injected once */}
      <style jsx global>{`
        @keyframes jobCardEnter {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .job-card-enter {
          animation: jobCardEnter 150ms ease-out both;
        }
      `}</style>
    </div>
  )
}

export default JobFeed