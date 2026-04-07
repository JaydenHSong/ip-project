// Module Access Gate — role 기반 모듈 접근 제어
// 사용법: <ModuleAccessGate minRole="owner" moduleName="AD Optimizer">...</ModuleAccessGate>
'use client'

import { useState, useEffect, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import type { Role } from '@/types/users'

const ROLE_LEVEL: Record<Role, number> = {
  owner: 5, admin: 4, editor: 3, viewer_plus: 2, viewer: 1,
}

type ModuleAccessGateProps = {
  minRole: Role
  moduleName: string
  children: ReactNode
}

export const ModuleAccessGate = ({ minRole, moduleName, children }: ModuleAccessGateProps) => {
  const router = useRouter()
  const [status, setStatus] = useState<'loading' | 'granted' | 'denied'>('loading')

  useEffect(() => {
    const checkAccess = async () => {
      try {
        const res = await fetch('/api/users/me')
        if (!res.ok) { setStatus('denied'); return }

        const json = await res.json() as { user: { role: Role } }
        const userLevel = ROLE_LEVEL[json.user.role] ?? 0
        const requiredLevel = ROLE_LEVEL[minRole] ?? 0

        setStatus(userLevel >= requiredLevel ? 'granted' : 'denied')
      } catch {
        setStatus('denied')
      }
    }
    checkAccess()
  }, [minRole])

  if (status === 'loading') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-th-accent border-t-transparent" />
      </div>
    )
  }

  if (status === 'denied') {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-th-text">{moduleName}</p>
          <p className="mt-2 text-sm text-th-text-muted">Coming Soon</p>
          <button
            onClick={() => router.push('/ip/dashboard')}
            className="mt-4 rounded-lg bg-th-accent px-4 py-2 text-sm font-medium text-white hover:opacity-90"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
