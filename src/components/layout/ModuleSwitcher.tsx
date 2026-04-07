'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronDown, Shield, Megaphone, List, Package, Lightbulb, Calculator, Truck } from 'lucide-react'
import { MODULES } from '@/constants/modules'
import type { ModuleConfig } from '@/constants/modules'
import { cn } from '@/lib/utils/cn'

const MODULE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  shield: Shield,
  megaphone: Megaphone,
  list: List,
  package: Package,
  lightbulb: Lightbulb,
  calculator: Calculator,
  truck: Truck,
}

type ModuleSwitcherProps = {
  currentModule: ModuleConfig | null
  collapsed: boolean
}

export const ModuleSwitcher = ({ currentModule, collapsed }: ModuleSwitcherProps) => {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const active = currentModule ?? MODULES[0]
  const ActiveIcon = MODULE_ICONS[active.icon] ?? Shield

  const handleSelect = (mod: ModuleConfig) => {
    setOpen(false)
    if (mod.status !== 'active') return
    // IP 모듈은 기존 URL 유지
    if (mod.key === 'ip') {
      router.push('/ip/dashboard')
    } else {
      router.push(mod.path + '/dashboard')
    }
  }

  return (
    <div ref={ref} className="relative px-2 py-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'flex w-full items-center gap-2.5 rounded-lg border border-th-sidebar-border px-3 py-2.5 text-sm font-medium transition-colors',
          'text-th-sidebar-text hover:bg-th-sidebar-hover',
          collapsed && 'justify-center px-2',
        )}
      >
        <ActiveIcon className="h-4 w-4 shrink-0" />
        {!collapsed && (
          <>
            <span className="flex-1 truncate text-left">{active.name}</span>
            <ChevronDown className={cn('h-3.5 w-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
          </>
        )}
      </button>

      {open && (
        <div className="absolute left-2 right-2 top-full z-50 mt-1 overflow-hidden rounded-xl border border-th-border bg-th-bg shadow-lg">
          {MODULES.map((mod) => {
            const Icon = MODULE_ICONS[mod.icon] ?? Shield
            const isActive = mod.key === active.key
            const isDisabled = mod.status !== 'active'

            return (
              <button
                key={mod.key}
                type="button"
                disabled={isDisabled}
                onClick={() => handleSelect(mod)}
                className={cn(
                  'flex w-full items-center gap-3 px-3.5 py-3 text-sm transition-colors',
                  isActive
                    ? 'bg-th-accent/10 text-th-accent-text font-medium'
                    : isDisabled
                      ? 'text-th-text-muted cursor-default'
                      : 'text-th-text-secondary hover:bg-th-bg-hover',
                )}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="flex-1 text-left">{mod.name}</span>
                {isActive && <span className="h-2 w-2 rounded-full bg-th-accent" />}
                {isDisabled && (
                  <span className="rounded-full bg-th-bg-tertiary px-2 py-0.5 text-[10px] text-th-text-muted">Soon</span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
