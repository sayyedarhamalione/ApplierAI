'use client'

/**
 * components/jobs/JobFilter.tsx
 *
 * Filter bar rendered below the search input.
 * State lives in URL params (useSearchParams + router.push).
 * Each pill is 32px high, 12px lowercase text.
 * Active filter pills show with blue tint.
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useTransition } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

const ROLE_OPTIONS = [
  'SWE', 'Data Science', 'ML Engineer', 'DevOps',
  'Product', 'Design', 'Mobile', 'QA', 'Security',
]

const EXPERIENCE_OPTIONS = [
  { label: 'fresher', value: 'fresher' },
  { label: '1–3 yrs', value: '1-3' },
  { label: '3–7 yrs', value: '3-7' },
  { label: '7+ yrs', value: '7+' },
]

const JOB_TYPE_OPTIONS = [
  { label: 'full-time', value: 'full-time' },
  { label: 'contract', value: 'contract' },
  { label: 'part-time', value: 'part-time' },
]

const LOCATION_SHORTCUTS = [
  { label: 'remote', value: 'remote' },
  { label: 'bangalore', value: 'bangalore' },
  { label: 'mumbai', value: 'mumbai' },
  { label: 'hyderabad', value: 'hyderabad' },
  { label: 'pune', value: 'pune' },
  { label: 'delhi', value: 'delhi' },
]

// ---------------------------------------------------------------------------
// Pill component
// ---------------------------------------------------------------------------

interface PillProps {
  label: string
  active?: boolean
  onClick: () => void
  onRemove?: () => void
}

function Pill({ label, active, onClick, onRemove }: PillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-3 text-[12px] font-normal',
        'border transition-colors duration-100 select-none whitespace-nowrap',
        'cursor-pointer',
      )}
      style={{
        height: '28px',
        backgroundColor: active ? 'hsl(213,80%,52%,0.12)' : 'transparent',
        borderColor: active ? 'hsl(213,80%,52%,0.4)' : 'hsl(0,0%,22%)',
        color: active ? 'hsl(213,80%,65%)' : 'hsl(0,0%,50%)',
      }}
    >
      {label}
      {active && onRemove && (
        <span
          role="button"
          tabIndex={-1}
          onClick={(e) => { e.stopPropagation(); onRemove() }}
          className="ml-0.5 opacity-70 hover:opacity-100"
        >
          <X size={10} strokeWidth={2} />
        </span>
      )}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Show-all toggle
// ---------------------------------------------------------------------------

interface ShowAllToggleProps {
  active: boolean
  onToggle: () => void
}

function ShowAllToggle({ active, onToggle }: ShowAllToggleProps) {
  return (
    <button
      onClick={onToggle}
      className="inline-flex items-center gap-1.5 rounded-full border px-3 text-[12px] transition-colors duration-100 whitespace-nowrap"
      style={{
        height: '28px',
        backgroundColor: active ? 'hsl(0,0%,18%)' : 'transparent',
        borderColor: 'hsl(0,0%,22%)',
        color: active ? 'hsl(0,0%,80%)' : 'hsl(0,0%,45%)',
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: active ? 'hsl(0,0%,70%)' : 'hsl(0,0%,35%)' }}
      />
      show all
    </button>
  )
}

// ---------------------------------------------------------------------------
// Active filter summary (chips shown above the pill rows)
// ---------------------------------------------------------------------------

interface ActiveFiltersProps {
  roles: string[]
  locations: string[]
  experience: string | null
  jobType: string | null
  onClear: () => void
}

function ActiveFilters({ roles, locations, experience, jobType, onClear }: ActiveFiltersProps) {
  const hasFilters = roles.length || locations.length || experience || jobType
  if (!hasFilters) return null

  const summaryParts = [
    ...roles,
    ...locations,
    experience ?? '',
    jobType ?? '',
  ].filter(Boolean)

  return (
    <div className="flex items-center gap-2">
      <span style={{ fontSize: '11px', color: 'hsl(0,0%,38%)' }}>
        filtered by:
      </span>
      {summaryParts.map((p) => (
        <span
          key={p}
          className="rounded px-1.5 py-0.5 text-[11px]"
          style={{
            backgroundColor: 'hsl(213,80%,52%,0.1)',
            color: 'hsl(213,80%,62%)',
          }}
        >
          {p}
        </span>
      ))}
      <button
        onClick={onClear}
        className="text-[11px] underline-offset-2 hover:underline"
        style={{ color: 'hsl(0,0%,38%)' }}
      >
        clear all
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main JobFilter
// ---------------------------------------------------------------------------

interface JobFilterProps {
  totalCount?: number
  filteredCount?: number
  className?: string
}

export function JobFilter({ totalCount, filteredCount, className }: JobFilterProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()

  // Read current values
  const rolesParam = searchParams.get('roles') ?? ''
  const locationsParam = searchParams.get('locations') ?? ''
  const experience = searchParams.get('experience')
  const jobType = searchParams.get('job_type')
  const showAll = searchParams.get('show_all') === 'true'

  const activeRoles = rolesParam ? rolesParam.split(',').filter(Boolean) : []
  const activeLocations = locationsParam ? locationsParam.split(',').filter(Boolean) : []

  // ── URL update helper
  const updateParam = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString())
      for (const [key, val] of Object.entries(updates)) {
        if (val === null || val === '') {
          params.delete(key)
        } else {
          params.set(key, val)
        }
      }
      // Always reset to page 1 on filter change
      params.delete('page')
      startTransition(() => {
        router.push(`/jobs?${params.toString()}`, { scroll: false })
      })
    },
    [router, searchParams]
  )

  // ── Toggle a role
  function toggleRole(role: string) {
    const next = activeRoles.includes(role)
      ? activeRoles.filter((r) => r !== role)
      : [...activeRoles, role]
    updateParam({ roles: next.join(',') || null })
  }

  // ── Toggle a location
  function toggleLocation(loc: string) {
    const next = activeLocations.includes(loc)
      ? activeLocations.filter((l) => l !== loc)
      : [...activeLocations, loc]
    updateParam({ locations: next.join(',') || null })
  }

  // ── Set experience
  function setExperience(val: string) {
    updateParam({ experience: experience === val ? null : val })
  }

  // ── Set job type
  function setJobType(val: string) {
    updateParam({ job_type: jobType === val ? null : val })
  }

  // ── Toggle show all
  function toggleShowAll() {
    updateParam({ show_all: showAll ? null : 'true' })
  }

  // ── Clear all
  function clearAll() {
    startTransition(() => {
      router.push('/jobs', { scroll: false })
    })
  }

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      {/* Row 1: Roles */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="mr-1 text-[11px]"
          style={{ color: 'hsl(0,0%,35%)' }}
        >
          role
        </span>
        {ROLE_OPTIONS.map((role) => (
          <Pill
            key={role}
            label={role.toLowerCase()}
            active={activeRoles.includes(role)}
            onClick={() => toggleRole(role)}
            onRemove={() => toggleRole(role)}
          />
        ))}
      </div>

      {/* Row 2: Location + Experience + Type + Show All */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span
          className="mr-1 text-[11px]"
          style={{ color: 'hsl(0,0%,35%)' }}
        >
          where
        </span>
        {LOCATION_SHORTCUTS.map(({ label, value }) => (
          <Pill
            key={value}
            label={label}
            active={activeLocations.includes(value)}
            onClick={() => toggleLocation(value)}
            onRemove={() => toggleLocation(value)}
          />
        ))}

        <span
          className="mx-1 text-[11px]"
          style={{ color: 'hsl(0,0%,25%)' }}
        >
          /
        </span>

        {EXPERIENCE_OPTIONS.map(({ label, value }) => (
          <Pill
            key={value}
            label={label}
            active={experience === value}
            onClick={() => setExperience(value)}
            onRemove={() => setExperience(value)}
          />
        ))}

        <span
          className="mx-1 text-[11px]"
          style={{ color: 'hsl(0,0%,25%)' }}
        >
          /
        </span>

        {JOB_TYPE_OPTIONS.map(({ label, value }) => (
          <Pill
            key={value}
            label={label}
            active={jobType === value}
            onClick={() => setJobType(value)}
            onRemove={() => setJobType(value)}
          />
        ))}

        <span className="ml-auto flex items-center gap-3">
          {/* Live count */}
          {filteredCount !== undefined && (
            <span
              className="font-mono text-[12px] tabular-nums"
              style={{
                color: isPending ? 'hsl(0,0%,30%)' : 'hsl(0,0%,50%)',
                transition: 'color 80ms',
              }}
            >
              {filteredCount.toLocaleString()}
              {totalCount !== undefined && totalCount !== filteredCount && (
                <span style={{ color: 'hsl(0,0%,30%)' }}>
                  {' '}/ {totalCount.toLocaleString()}
                </span>
              )}
            </span>
          )}
          <ShowAllToggle active={showAll} onToggle={toggleShowAll} />
        </span>
      </div>

      {/* Active filters summary row */}
      <ActiveFilters
        roles={activeRoles}
        locations={activeLocations}
        experience={experience}
        jobType={jobType}
        onClear={clearAll}
      />
    </div>
  )
}

export default JobFilter