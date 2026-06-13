'use client'

/**
 * components/DashboardNav.tsx
 * 64px icon-only sidebar. Tooltip on hover. Active state via pathname.
 *
 * Design tokens:
 *   Nav bg:  hsl(220,9%,7%)
 *   Icon:    hsl(0,0%,50%) idle → hsl(0,0%,90%) active/hover
 *   Accent:  hsl(213,80%,52%) — left border on active item
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Briefcase,
  LayoutKanban,
  User,
  MessagesSquare,
  Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface NavItem {
  href: string
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>
  label: string
}

const NAV_ITEMS: NavItem[] = [
  { href: '/jobs',    icon: Briefcase,      label: 'jobs'    },
  { href: '/tracker', icon: LayoutKanban,   label: 'tracker' },
  { href: '/profile', icon: User,           label: 'profile' },
  { href: '/prep',    icon: MessagesSquare, label: 'prep'    },
]

interface Props {
  fullName?: string | null
}

export function DashboardNav({ fullName }: Props) {
  const pathname = usePathname()

  const initials = fullName
    ? fullName
        .split(' ')
        .slice(0, 2)
        .map((n) => n[0])
        .join('')
        .toUpperCase()
    : '?'

  return (
    <nav
      style={{ backgroundColor: 'hsl(220,9%,7%)' }}
      className="
        fixed left-0 top-0 z-40
        flex h-screen w-16 flex-col
        items-center justify-between
        border-r border-white/[0.06]
        py-4
      "
    >
      {/* Logo mark */}
      <div className="flex h-10 w-10 items-center justify-center">
        <span
          className="select-none font-mono text-xs font-semibold tracking-widest"
          style={{ color: 'hsl(213,80%,52%)' }}
        >
          AI
        </span>
      </div>

      {/* Nav items */}
      <ul className="flex flex-1 flex-col items-center gap-1 pt-4">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const isActive = pathname.startsWith(href)

          return (
            <li key={href} className="group relative w-full">
              <Link
                href={href}
                className={cn(
                  'relative flex h-11 w-full items-center justify-center transition-colors duration-100',
                  isActive
                    ? 'text-white'
                    : 'text-neutral-500 hover:text-neutral-200'
                )}
              >
                {/* Active left accent bar */}
                {isActive && (
                  <span
                    className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r"
                    style={{ backgroundColor: 'hsl(213,80%,52%)' }}
                  />
                )}

                <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />

                {/* Tooltip */}
                <span
                  className="
                    pointer-events-none absolute left-14 z-50
                    whitespace-nowrap rounded-md px-2.5 py-1.5
                    text-xs font-medium
                    opacity-0 transition-opacity duration-100
                    group-hover:opacity-100
                  "
                  style={{
                    backgroundColor: 'hsl(220,6%,18%)',
                    color: 'hsl(0,0%,88%)',
                    border: '1px solid hsl(0,0%,20%)',
                  }}
                >
                  {label}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>

      {/* Bottom: avatar + settings */}
      <div className="flex flex-col items-center gap-3 pb-2">
        <div className="group relative">
          <Link
            href="/settings"
            className="flex h-10 w-10 items-center justify-center rounded-full text-neutral-500 transition-colors hover:text-neutral-200"
          >
            <Settings size={16} strokeWidth={1.5} />
            <span
              className="
                pointer-events-none absolute left-14 z-50
                whitespace-nowrap rounded-md px-2.5 py-1.5
                text-xs font-medium
                opacity-0 transition-opacity duration-100
                group-hover:opacity-100
              "
              style={{
                backgroundColor: 'hsl(220,6%,18%)',
                color: 'hsl(0,0%,88%)',
                border: '1px solid hsl(0,0%,20%)',
              }}
            >
              settings
            </span>
          </Link>
        </div>

        {/* User avatar */}
        <div
          className="
            flex h-7 w-7 items-center justify-center
            rounded-full text-[10px] font-semibold select-none
          "
          style={{
            backgroundColor: 'hsl(220,6%,18%)',
            color: 'hsl(0,0%,70%)',
            border: '1px solid hsl(0,0%,22%)',
          }}
          title={fullName ?? undefined}
        >
          {initials}
        </div>
      </div>
    </nav>
  )
}

export default DashboardNav