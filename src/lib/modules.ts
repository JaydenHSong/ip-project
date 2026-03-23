// A.R.C. Platform — Module utilities

import { MODULES } from '@/constants/modules'
import type { ModuleConfig } from '@/constants/modules'

// URL에서 현재 모듈 감지
// 현재는 IP만 active이고 URL prefix 없이 동작 → IP를 기본 모듈로 반환
const getCurrentModule = (pathname: string): ModuleConfig | null => {
  // 모듈 prefix가 있는 URL (/ip/*, /ads/* 등)
  const prefixMatch = MODULES.find((m) => pathname.startsWith(m.path + '/') || pathname === m.path)
  if (prefixMatch) return prefixMatch

  // 공통 페이지 (/settings, /audit-logs, /changelog)
  const commonPaths = ['/settings', '/audit-logs', '/changelog', '/login']
  if (commonPaths.some((p) => pathname.startsWith(p))) return null

  // 기존 URL (prefix 없는 /dashboard, /campaigns 등) → IP 모듈로 간주
  const ipModule = MODULES.find((m) => m.key === 'ip')
  return ipModule ?? null
}

// 모듈이 활성 상태인지
const isModuleActive = (moduleKey: string): boolean => {
  const mod = MODULES.find((m) => m.key === moduleKey)
  return mod?.status === 'active'
}

export { getCurrentModule, isModuleActive }
