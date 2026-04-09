import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'

// GET /api/users/me — 현재 로그인 사용자 정보
export const GET = async () => {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json(
      { error: { code: 'UNAUTHORIZED', message: 'Not authenticated' } },
      { status: 401 },
    )
  }

  return NextResponse.json({ user })
}
