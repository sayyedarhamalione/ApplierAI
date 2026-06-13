// lib/supabase/server.ts
// Server-side Supabase clients — use in Server Components, API routes, and actions.
// Never import in Client Components.

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// Authenticated client — respects RLS, uses session from cookies.
// Use in Server Components and Route Handlers that act on behalf of a user.
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // setAll called from Server Component — safe to ignore.
            // Middleware handles session refresh.
          }
        },
      },
    }
  )
}

// Service-role client — bypasses RLS.
// Use ONLY in:
//   - Scraper scripts (scripts/scraper/)
//   - Admin API routes (/api/admin/*)
//   - Cron-triggered server actions
// Never expose to client or use in user-facing API routes.
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!,
    {
      cookies: {
        getAll() { return [] },
        setAll() {},
      },
    }
  )
}