'use client'

/**
 * components/jobs/JobDetail.tsx
 *
 * 480px side drawer. Slides in from right: translateX(100%) → 0, 120ms ease-out.
 * Closes via × or Esc only — clicking outside does NOT close.
 * Hovering another card while open swaps content instantly (no animation re-trigger).
 *
 * Three tabs: overview / ai match / optimize resume
 * Footer: "Go to [Company]" ghost + "Quick Apply ⚡" solid
 * Apply state: footer transforms to "✓ Applied · Just now" + "Optimize Resume →"
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import {
  X,
  Heart,
  ExternalLink,
  MapPin,
  Briefcase,
  Calendar,
  Building2,
  Zap,
  ChevronRight,
} from 'lucide-react'
import { formatDistanceToNowStrict, format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ScoredJob } from '@/types/app'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DrawerProps {
  job: ScoredJob | null
  isOpen: boolean
  isSaved?: boolean
  isApplied?: boolean
  scored?: boolean
  onClose: () => void
  onSave?: (job: ScoredJob) => Promise<void>
  onApply?: (job: ScoredJob) => Promise<void>
}

type TabId = 'overview' | 'ai-match' | 'optimize'

// ---------------------------------------------------------------------------
// Company logo
// ---------------------------------------------------------------------------
function CompanyLogo({ name, logoUrl, size = 40 }: { name: string; logoUrl?: string | null; size?: number }) {
  const [err, setErr] = useState(false)
  if (logoUrl && !err) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={size}
        height={size}
        className="rounded-[8px] object-contain flex-shrink-0"
        style={{ width: size, height: size, backgroundColor: 'hsl(220,6%,16%)' }}
        onError={() => setErr(true)}
      />
    )
  }
  return (
    <div
      className="flex flex-shrink-0 items-center justify-center rounded-[8px] font-semibold select-none"
      style={{
        width: size,
        height: size,
        backgroundColor: 'hsl(220,6%,16%)',
        color: 'hsl(0,0%,55%)',
        border: '1px solid hsl(0,0%,18%)',
        fontSize: size * 0.4,
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Salary display
// ---------------------------------------------------------------------------
function formatSalary(
  min: number | null,
  max: number | null,
  currency: string | null
): string | null {
  if (!min && !max) return null
  const sym = currency === 'INR' ? '₹' : currency === 'EUR' ? '€' : '$'
  const fmt = (n: number) =>
    n >= 100000
      ? `${sym}${(n / 1000).toFixed(0)}k`
      : `${sym}${n.toLocaleString()}`
  if (min && max) return `${fmt(min)} – ${fmt(max)}`
  if (min) return `${fmt(min)}+`
  return `up to ${fmt(max!)}`
}

// ---------------------------------------------------------------------------
// Tab bar
// ---------------------------------------------------------------------------
const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'overview' },
  { id: 'ai-match', label: 'ai match' },
  { id: 'optimize', label: 'optimize resume' },
]

function TabBar({
  active,
  onChange,
}: {
  active: TabId
  onChange: (t: TabId) => void
}) {
  return (
    <div
      className="flex border-b"
      style={{ borderColor: 'hsl(0,0%,16%)' }}
    >
      {TABS.map(({ id, label }) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          className="relative px-4 py-2.5 text-[13px] transition-colors duration-100"
          style={{
            color: active === id ? 'hsl(0,0%,90%)' : 'hsl(0,0%,45%)',
            fontWeight: active === id ? 500 : 400,
          }}
        >
          {label}
          {active === id && (
            <span
              className="absolute bottom-0 left-0 right-0 h-px"
              style={{ backgroundColor: 'hsl(213,80%,52%)' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Overview tab content
// ---------------------------------------------------------------------------
function OverviewTab({ job }: { job: ScoredJob }) {
  const salary = formatSalary(job.salary_min, job.salary_max, job.salary_currency)
  const posted = job.posted_at ? format(new Date(job.posted_at), 'MMM d, yyyy') : null

  return (
    <div className="flex flex-col gap-5 p-5">
      {/* Metadata row */}
      <div className="flex flex-wrap gap-4">
        {(job.cities?.length || job.is_remote) && (
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'hsl(0,0%,55%)' }}>
            <MapPin size={13} strokeWidth={1.5} />
            {job.is_remote && 'remote'}
            {job.cities?.filter(c => c !== 'remote').slice(0, 2).join(', ')}
          </span>
        )}
        {job.job_type && (
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'hsl(0,0%,55%)' }}>
            <Briefcase size={13} strokeWidth={1.5} />
            {job.job_type}
          </span>
        )}
        {posted && (
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'hsl(0,0%,55%)' }}>
            <Calendar size={13} strokeWidth={1.5} />
            {posted}
          </span>
        )}
        {job.experience_level && (
          <span className="flex items-center gap-1.5 text-[13px]" style={{ color: 'hsl(0,0%,55%)' }}>
            <Building2 size={13} strokeWidth={1.5} />
            {job.experience_level}
          </span>
        )}
      </div>

      {/* Salary */}
      {salary && (
        <p
          className="font-mono text-[13px]"
          style={{ color: 'hsl(142,71%,45%)' }}
        >
          {salary}
        </p>
      )}

      {/* Skills */}
      {(job.skills?.length ?? 0) > 0 && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wider" style={{ color: 'hsl(0,0%,35%)' }}>
            skills
          </p>
          <div className="flex flex-wrap gap-1.5">
            {job.skills!.map((skill) => (
              <span
                key={skill}
                className="rounded px-2 py-0.5 text-[12px]"
                style={{
                  backgroundColor: 'hsl(220,6%,16%)',
                  color: 'hsl(0,0%,60%)',
                  border: '1px solid hsl(0,0%,20%)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Description */}
      {job.description && (
        <div>
          <p className="mb-2 text-[11px] uppercase tracking-wider" style={{ color: 'hsl(0,0%,35%)' }}>
            about the role
          </p>
          <p
            className="whitespace-pre-wrap text-[13px] leading-relaxed"
            style={{ color: 'hsl(0,0%,62%)' }}
          >
            {job.description.slice(0, 1500)}
            {job.description.length > 1500 && (
              <a
                href={job.apply_url}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 underline underline-offset-2"
                style={{ color: 'hsl(213,80%,55%)' }}
              >
                read more ↗
              </a>
            )}
          </p>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// AI Match tab (placeholder — Week 5 fills this)
// ---------------------------------------------------------------------------
function AiMatchTab({ scored }: { scored: boolean }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
      <p className="text-[13px]" style={{ color: 'hsl(0,0%,40%)' }}>
        {scored
          ? 'skill gap analysis coming in week 5.'
          : 'complete your profile to unlock ai match analysis.'}
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Optimize tab (placeholder — Week 5)
// ---------------------------------------------------------------------------
function OptimizeTab() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
      <p className="text-[13px]" style={{ color: 'hsl(0,0%,40%)' }}>
        upload your resume to tailor it to this role.
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main Drawer
// ---------------------------------------------------------------------------

export function JobDetail({
  job,
  isOpen,
  isSaved = false,
  isApplied = false,
  scored = false,
  onClose,
  onSave,
  onApply,
}: DrawerProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')
  const [saved, setSaved] = useState(isSaved)
  const [applied, setApplied] = useState(isApplied)
  const [applyPending, setApplyPending] = useState(false)
  const [justApplied, setJustApplied] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Sync external state
  useEffect(() => setSaved(isSaved), [isSaved])
  useEffect(() => setApplied(isApplied), [isApplied])
  useEffect(() => {
    setActiveTab('overview') // reset tab when job changes
    setJustApplied(false)
  }, [job?.id])

  // Esc key
  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  const handleSave = useCallback(async () => {
    if (!job || !onSave) return
    setSaved((p) => !p)
    try {
      await onSave(job)
    } catch {
      setSaved((p) => !p)
    }
  }, [job, onSave])

  const handleApply = useCallback(async () => {
    if (!job) return
    // Open URL immediately
    window.open(job.apply_url, '_blank', 'noopener,noreferrer')
    setApplyPending(true)
    try {
      await onApply?.(job)
      setApplied(true)
      setJustApplied(true)
    } finally {
      setApplyPending(false)
    }
  }, [job, onApply])

  if (!job) return null

  const postedAgo = job.posted_at
    ? formatDistanceToNowStrict(new Date(job.posted_at), { addSuffix: true })
    : null

  return (
    <>
      {/* Drawer */}
      <div
        ref={drawerRef}
        className="fixed right-0 top-0 z-50 flex h-screen flex-col"
        style={{
          width: '480px',
          backgroundColor: 'hsl(220,5%,14%)',
          borderLeft: '1px solid hsl(0,0%,16%)',
          transform: isOpen ? 'translateX(0)' : 'translateX(100%)',
          opacity: isOpen ? 1 : 0,
          transition: 'transform 120ms ease-out, opacity 120ms ease-out',
          willChange: 'transform',
        }}
        role="dialog"
        aria-modal="true"
        aria-label="job details"
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 p-5 pb-0"
        >
          <CompanyLogo
            name={job.company?.name ?? job.company_name}
            logoUrl={job.company?.logo_url}
            size={40}
          />

          <div className="flex min-w-0 flex-1 flex-col">
            <h2
              className="leading-snug"
              style={{ fontSize: '18px', fontWeight: 600, color: 'hsl(0,0%,92%)' }}
            >
              {job.title}
            </h2>
            <p className="text-[13px]" style={{ color: 'hsl(0,0%,50%)' }}>
              {job.company?.name ?? job.company_name}
              {postedAgo && (
                <span style={{ color: 'hsl(0,0%,35%)' }}> · {postedAgo}</span>
              )}
            </p>
          </div>

          {/* Save + Close */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleSave}
              className="flex h-8 w-8 items-center justify-center rounded transition-colors"
              style={{ color: saved ? 'hsl(213,80%,52%)' : 'hsl(0,0%,40%)' }}
              aria-label={saved ? 'unsave' : 'save'}
            >
              <Heart size={16} strokeWidth={1.5} fill={saved ? 'currentColor' : 'none'} />
            </button>
            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded transition-colors"
              style={{ color: 'hsl(0,0%,40%)' }}
              aria-label="close"
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div className="mt-4">
          <TabBar active={activeTab} onChange={setActiveTab} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto">
          {activeTab === 'overview' && <OverviewTab job={job} />}
          {activeTab === 'ai-match' && <AiMatchTab scored={scored} />}
          {activeTab === 'optimize' && <OptimizeTab />}
        </div>

        {/* Footer */}
        <div
          className="flex flex-shrink-0 items-center gap-3 border-t px-5"
          style={{
            height: '64px',
            borderColor: 'hsl(0,0%,14%)',
          }}
        >
          {applied ? (
            /* Applied state */
            <div className="flex flex-1 items-center justify-between">
              <span className="text-[13px]" style={{ color: 'hsl(142,71%,45%)' }}>
                ✓ applied · {justApplied ? 'just now' : 'earlier'}
              </span>
              <button
                onClick={() => setActiveTab('optimize')}
                className="flex items-center gap-1 text-[13px] transition-colors"
                style={{ color: 'hsl(213,80%,55%)' }}
              >
                optimize resume
                <ChevronRight size={13} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            /* Normal footer */
            <>
              {/* Ghost: Go to company */}
              <a
                href={job.company?.website ?? '#'}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'flex h-9 flex-1 items-center justify-center gap-1.5 rounded text-[13px] transition-colors',
                  !job.company?.website && 'pointer-events-none opacity-30'
                )}
                style={{
                  border: '1px solid hsl(0,0%,22%)',
                  color: 'hsl(0,0%,60%)',
                }}
              >
                <ExternalLink size={13} strokeWidth={1.5} />
                {job.company?.name ?? 'company'}
              </a>

              {/* Solid: Quick Apply */}
              <button
                onClick={handleApply}
                disabled={applyPending}
                className="flex h-9 flex-1 items-center justify-center gap-1.5 rounded text-[13px] font-medium transition-opacity disabled:opacity-70"
                style={{
                  backgroundColor: 'hsl(213,80%,52%)',
                  color: 'hsl(0,0%,98%)',
                }}
              >
                <Zap size={13} strokeWidth={1.5} />
                quick apply
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}

export default JobDetail