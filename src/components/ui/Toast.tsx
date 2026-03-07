'use client'

import { useEffect, useState } from 'react'
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react'
import type { Toast as ToastData, ToastType } from '@/hooks/useToast'

const DURATION = 3000

const ICONS: Record<ToastType, React.ComponentType<{ className?: string }>> = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
}

const BAR_COLORS: Record<ToastType, string> = {
  success: 'bg-emerald-500',
  error: 'bg-red-500',
  warning: 'bg-amber-500',
  info: 'bg-blue-500',
}

const ICON_COLORS: Record<ToastType, string> = {
  success: 'text-emerald-500',
  error: 'text-red-500',
  warning: 'text-amber-500',
  info: 'text-blue-500',
}

type ToastItemProps = {
  toast: ToastData
  onDismiss: (id: string) => void
}

const ToastItem = ({ toast, onDismiss }: ToastItemProps) => {
  const [exiting, setExiting] = useState(false)
  const [timerWidth, setTimerWidth] = useState('100%')
  const Icon = ICONS[toast.type]

  useEffect(() => {
    // Start timer bar animation
    const frame = requestAnimationFrame(() => setTimerWidth('0%'))
    const timer = setTimeout(() => {
      setExiting(true)
      setTimeout(() => onDismiss(toast.id), 200)
    }, DURATION)
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(timer)
    }
  }, [toast.id, onDismiss])

  const handleDismiss = () => {
    setExiting(true)
    setTimeout(() => onDismiss(toast.id), 200)
  }

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-th-border bg-surface-card shadow-lg transition-all duration-200 ${
        exiting ? 'translate-x-full opacity-0' : 'translate-x-0 opacity-100'
      }`}
      style={{ animation: exiting ? undefined : 'slide-in-right 0.3s ease-out' }}
    >
      {/* Left color bar */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${BAR_COLORS[toast.type]}`} />

      <div className="flex items-start gap-3 pl-4 pr-3 py-3">
        <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${ICON_COLORS[toast.type]}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-th-text">{toast.title}</p>
          {toast.message && (
            <p className="mt-0.5 text-xs text-th-text-secondary">{toast.message}</p>
          )}
        </div>
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 rounded-lg p-1 text-th-text-muted hover:bg-th-bg-hover hover:text-th-text-secondary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Timer bar */}
      <div className="h-0.5 w-full bg-th-bg-secondary">
        <div
          className={`h-full ${BAR_COLORS[toast.type]} transition-all ease-linear`}
          style={{ width: timerWidth, transitionDuration: `${DURATION}ms` }}
        />
      </div>
    </div>
  )
}

type ToastContainerProps = {
  toasts: ToastData[]
  onDismiss: (id: string) => void
}

export const ToastContainer = ({ toasts, onDismiss }: ToastContainerProps) => {
  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-[100] flex w-80 flex-col gap-2">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  )
}
