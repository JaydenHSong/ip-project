import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export const middleware = async (req: NextRequest): Promise<NextResponse> => {
  // Demo mode: skip all auth checks
  if (process.env.DEMO_MODE === 'true') {
    // 로그인 페이지 접근 시 대시보드로 리다이렉트
    if (req.nextUrl.pathname.startsWith('/login')) {
      return NextResponse.redirect(new URL('/dashboard', req.url))
    }
    return NextResponse.next()
  }

  const res = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set(name, value)
            res.cookies.set(name, value, options)
          })
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()

  // Cron / Crawler / Extension API는 자체 인증 사용 — 미들웨어 스킵
  if (req.nextUrl.pathname.startsWith('/api/cron/') ||
      req.nextUrl.pathname.startsWith('/api/crawler/') ||
      req.nextUrl.pathname.startsWith('/api/ext/')) {
    return res
  }

  // 인증 없이 보호 경로 접근 시 로그인으로 리다이렉트
  if (!user && !req.nextUrl.pathname.startsWith('/login') && !req.nextUrl.pathname.startsWith('/api/auth')) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // 이미 인증된 상태에서 로그인 페이지 접근 시 대시보드로 리다이렉트
  if (user && req.nextUrl.pathname.startsWith('/login')) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|api/auth).*)',
  ],
}
