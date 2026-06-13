// app/(dashboard)/layout.tsx
// Protected layout: server-side auth check + sidebar nav.
// Middleware handles redirect, this is a secondary guard + UI shell.

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { DashboardNav } from '@/components/ui/dashboard-nav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Fetch profile for nav (onboarding_step, full_name)
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, onboarding_step')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen bg-background flex">
      <DashboardNav
        userEmail={user.email ?? ''}
        fullName={profile?.full_name ?? null}
        onboardingStep={profile?.onboarding_step ?? 1}
      />
      <main className="flex-1 ml-64 p-8 max-w-7xl">
        {children}
      </main>
    </div>
  )
}