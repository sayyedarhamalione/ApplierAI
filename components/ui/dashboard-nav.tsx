// components/ui/dashboard-nav.tsx
// Sidebar nav. Stub — flesh out with shadcn + lucide icons in Week 3.

'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Briefcase, LayoutKanban, User, BookOpen } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/jobs',    label: 'Jobs',      icon: Briefcase    },
  { href: '/tracker', label: 'Tracker',   icon: LayoutKanban },
  { href: '/prep',    label: 'Prep',      icon: BookOpen     },
  { href: '/profile', label: 'Profile',   icon: User         },
]

interface DashboardNavProps {
  userEmail: string
  fullName: string | null
  onboardingStep: number
}

export function DashboardNav({ userEmail, fullName, onboardingStep }: DashboardNavProps) {
  const pathname = usePathname()

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 border-r border-border bg-card flex flex-col px-4 py-6">
      {/* Wordmark */}
      <div className="mb-8 px-2">
        <span className="text-xl font-bold tracking-tight">ApplierAI</span>
      </div>

      {/* Nav links */}
      <nav className="flex-1 space-y-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors
                ${active
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                }`}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Stage 2 nudge — show if onboarding incomplete */}
      {onboardingStep < 2 && (
        <Link
          href="/profile"
          className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-800 hover:bg-amber-100 transition-colors"
        >
          ✦ Upload resume to unlock AI features
        </Link>
      )}

      {/* User footer */}
      <div className="border-t border-border pt-4 px-2">
        <p className="text-sm font-medium truncate">{fullName ?? userEmail}</p>
        {fullName && (
          <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
        )}
      </div>
    </aside>
  )
}