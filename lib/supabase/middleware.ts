// lib/supabase/middleware.ts
// Session refresh logic — called from middleware.ts at root.
// Keeps auth tokens alive across navigations.

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Refresh session — do not remove, required for Server Component auth.
  const { data: { user } } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/signup')
  const isDashboardRoute = pathname.startsWith('/jobs') ||
    pathname.startsWith('/tracker') ||
    pathname.startsWith('/profile') ||
    pathname.startsWith('/prep')
  const isAdminRoute = pathname.startsWith('/admin')

  // Unauthenticated user hitting protected route → redirect to login
  if (!user && isDashboardRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Authenticated user hitting auth route → redirect to jobs feed
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/jobs'
    return NextResponse.redirect(url)
  }

  // Admin route — token check handled in route handler, not middleware.
  // Middleware only needs to ensure session is refreshed.
  void isAdminRoute

  return supabaseResponse
}