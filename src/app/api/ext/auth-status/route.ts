import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'

// GET /api/ext/auth-status — Extension 인증 상태 확인
export const GET = withAuth(async (_req, { user }) => {
  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
    },
  })
}, ['admin', 'editor', 'viewer'])
