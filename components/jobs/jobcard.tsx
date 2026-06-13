'use client'

/**
 * components/jobs/JobCard.tsx
 *
 * Fixed height 80px. Three-line hierarchy. Score badge top-right.
 * Save/overflow icons appear on hover only.
 * Active state: 3px left blue border.
 * Applied state: 3px bottom amber bar (animated grow).
 * Inactive job: muted appearance + "closed" pill.
 */

import { useState, useTransition } from 'react'
import { Heart, MoreHorizontal } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { cn } from '@/lib/utils'
import type { ScoredJob } from '@/types/app'

// ---------------------------------------------------------------------------
// Score badge color thresholds
// ---------------------------------------------------------------------------
function scoreColor(score: number): string {
  if (score >= 7.5) return 'hsl(142,71%,45%)'   // green
  if (score >= 5.0) return 'hsl(38,92%,50%)'    // amber
  return 'hsl(0,0%,40%)'                         // gray
}

// ---------------------------------------------------------------------------
// Company logo / fallback initial
// ---------------------------------------------------------------------------
function CompanyLogo({ name, logoUrl }: { name: string; logoUrl?: string | null }) {
  const [imgError, setImgError] = useState(false)

  if (logoUrl && !imgError) {
    return (
      <img
        src={logoUrl}
        alt={name}
        width={32}
        height={32}
        className="h-8 w-8 rounded-[6px] object-contain"
        style={{ backgroundColor: 'hsl(220,6%,16%)' }}
        onError={() => setImgError(true)}
      />
    )
  }

  return (
    <div
      className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-[6px] text-[13px] font-semibold select-none"
      style={{
        backgroundColor: 'hsl(220,6%,16%)',
        color: 'hsl(0,0%,55%)',
        border: '1px solid hsl(0,0%,18%)',
      }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Skill badge
// ---------------------------------------------------------------------------
const SKILL_COLORS = [
  'hsl(213,60%,55%)',
  'hsl(270,50%,60%)',
  'hsl(160,50%,45%)',
] as const

function SkillBadge({ skill, idx }: { skill: string; idx: number }) {
  return (
    <span
      className="text-[11px] font-normal"
      style={{ color: SKILL_COLORS[idx % SKILL_COLORS.length] }}
    >
      {skill}
    </span>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
interface JobCardProps {
  job: ScoredJob
  isActive?: boolean   // drawer open for this card
  isApplied?: boolean  // user has applied
  isSaved?: boolean
  scored?: boolean     // show score badge
  onOpen?: (job: ScoredJob) => void
  onSave?: (job: ScoredJob) => Promise<void>
}

export function JobCard({
  job,
  isActive = false,
  isApplied = false,
  isSaved = false,
  scored = false,
  onOpen,
  onSave,
}: JobCardProps) {
  const [saved, setSaved] = useState(isSaved)
  const [, startTransition] = useTransition()

  const topSkills = (job.skills ?? []).slice(0, 3)
  const postedAgo = job.posted_at
    ? formatDistanceToNowStrict(new Date(job.posted_at), { addSuffix: true })
    : null

  const locationStr = [
    job.is_remote ? 'remote' : null,
    ...(job.cities ?? []).filter((c) => c !== 'remote').slice(0, 1),
  ]
    .filter(Boolean)
    .join(' · ')

  function handleSave(e: React.MouseEvent) {
    e.stopPropagation()
    if (!onSave) return
    setSaved((prev) => !prev)
    startTransition(() => {
      onSave(job).catch(() => setSaved((prev) => !prev)) // revert on error
    })
  }

  return (
    <div
      onClick={() => onOpen?.(job)}
      className={cn(
        'group relative flex cursor-pointer items-center gap-3 px-4',
        'transition-colors',
        !job.is_active && 'opacity-50',
      )}
      style={{
        height: '80px',
        backgroundColor: isActive
          ? 'hsl(220,6%,14%)'
          : 'hsl(220,6%,12%)',
        border: '1px solid',
        borderColor: isActive
          ? 'hsl(0,0%,28%)'
          : 'hsl(0,0%,20%)',
        borderLeftColor: isActive
          ? 'hsl(213,80%,52%)'
          : undefined,
        borderLeftWidth: isActive ? '3px' : undefined,
        // hover handled via Tailwind group
        willChange: 'transform',
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(0,0%,40%)'
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'hsl(220,6%,14%)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          (e.currentTarget as HTMLDivElement).style.borderColor = 'hsl(0,0%,20%)'
          ;(e.currentTarget as HTMLDivElement).style.backgroundColor = 'hsl(220,6%,12%)'
        }
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onOpen?.(job)}
      aria-pressed={isActive}
    >
      {/* Applied: 3px bottom amber bar (grows in) */}
      {isApplied && (
        <span
          className="pointer-events-none absolute bottom-0 left-0 right-0"
          style={{
            height: '3px',
            backgroundColor: 'hsl(24,85%,52%)',
            animation: 'appliedBarGrow 100ms ease-out forwards',
          }}
        />
      )}

      {/* Company logo */}
      <CompanyLogo
        name={job.company?.name ?? job.company_name}
        logoUrl={job.company?.logo_url}
      />

      {/* Main text block */}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        {/* Line 1: title */}
        <p
          className="truncate leading-tight"
          style={{
            fontSize: '15px',
            fontWeight: 500,
            color: job.is_active ? 'hsl(0,0%,92%)' : 'hsl(0,0%,55%)',
          }}
        >
          {job.title}
          {!job.is_active && (
            <span
              className="ml-2 text-[11px] font-normal"
              style={{ color: 'hsl(0,0%,40%)' }}
            >
              closed
            </span>
          )}
        </p>

        {/* Line 2: company · location · time */}
        <p
          className="truncate leading-tight"
          style={{ fontSize: '13px', fontWeight: 400, color: 'hsl(0,0%,50%)' }}
        >
          {job.company?.name ?? job.company_name}
          {locationStr && <span className="mx-1 opacity-40">·</span>}
          {locationStr}
          {postedAgo && <span className="mx-1 opacity-40">·</span>}
          <span style={{ color: 'hsl(0,0%,38%)' }}>{postedAgo}</span>
        </p>

        {/* Line 3: skill badges */}
        {topSkills.length > 0 && (
          <div className="flex items-center gap-2 overflow-hidden">
            {topSkills.map((skill, i) => (
              <SkillBadge key={skill} skill={skill} idx={i} />
            ))}
          </div>
        )}
      </div>

      {/* Right side: score + hover icons */}
      <div className="flex flex-shrink-0 items-center gap-2">
        {/* Score badge — always takes space to prevent layout shift */}
        <span
          className="font-mono text-[12px] font-semibold tabular-nums"
          style={{
            color: scored && job.score > 0 ? scoreColor(job.score) : 'transparent',
            minWidth: '32px',
            textAlign: 'right',
          }}
        >
          {scored && job.score > 0 ? `${Math.round(job.score * 10)}%` : ''}
        </span>

        {/* Hover-only: save + more */}
        <div
          className={cn(
            'flex items-center gap-1',
            'opacity-0 transition-opacity duration-100',
            'group-hover:opacity-100',
          )}
        >
          <button
            onClick={handleSave}
            className="flex h-7 w-7 items-center justify-center rounded transition-colors"
            style={{ color: saved ? 'hsl(213,80%,52%)' : 'hsl(0,0%,45%)' }}
            aria-label={saved ? 'unsave job' : 'save job'}
          >
            <Heart
              size={14}
              strokeWidth={1.5}
              fill={saved ? 'currentColor' : 'none'}
            />
          </button>

          <button
            onClick={(e) => e.stopPropagation()}
            className="flex h-7 w-7 items-center justify-center rounded transition-colors"
            style={{ color: 'hsl(0,0%,45%)' }}
            aria-label="more options"
          >
            <MoreHorizontal size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
    </div>
  )
}

// Inject keyframe once
if (typeof document !== 'undefined') {
  const id = '__applierAIStyles'
  if (!document.getElementById(id)) {
    const s = document.createElement('style')
    s.id = id
    s.textContent = `
      @keyframes appliedBarGrow {
        from { transform: scaleX(0); transform-origin: left; }
        to   { transform: scaleX(1); transform-origin: left; }
      }
    `
    document.head.appendChild(s)
  }
}

export default JobCard