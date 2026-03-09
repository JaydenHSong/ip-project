'use client'

import { useState, useEffect } from 'react'
import { formatSlaRemaining } from '@/lib/br-case/sla'

type SlaBadgeProps = {
  deadline: string | null
  paused: boolean
}

const getSlaColor = (deadline: string | null, paused: boolean): { bg: string; text: string; label: string } => {
  if (paused) {
    return { bg: 'bg-[#9ca3af]/15', text: 'text-[#9ca3af]', label: 'Paused' }
  }

  if (!deadline) {
    return { bg: 'bg-[#10b981]/15', text: 'text-[#10b981]', label: '-' }
  }

  const remainingMs = new Date(deadline).getTime() - Date.now()
  const remainingHours = remainingMs / (1000 * 60 * 60)

  if (remainingHours <= 0) {
    return { bg: 'bg-[#ef4444]/15', text: 'text-[#ef4444]', label: 'Breached' }
  }
  if (remainingHours <= 24) {
    return { bg: 'bg-[#f59e0b]/15', text: 'text-[#f59e0b]', label: 'Warning' }
  }
  return { bg: 'bg-[#10b981]/15', text: 'text-[#10b981]', label: 'On Track' }
}

export const SlaBadge = ({ deadline, paused }: SlaBadgeProps) => {
  const [, setTick] = useState(0)

  // Refresh every 60 seconds for real-time countdown
  useEffect(() => {
    if (paused || !deadline) return
    const interval = setInterval(() => setTick((t) => t + 1), 60_000)
    return () => clearInterval(interval)
  }, [deadline, paused])

  const color = getSlaColor(deadline, paused)
  const remaining = paused ? 'Paused' : formatSlaRemaining(deadline)

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${color.bg} ${color.text}`}
      title={color.label}
    >
      {remaining}
    </span>
  )
}
