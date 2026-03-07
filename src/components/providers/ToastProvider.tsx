'use client'

import { useState, useCallback } from 'react'
import { ToastContext } from '@/hooks/useToast'
import type { Toast, AddToastInput } from '@/hooks/useToast'
import { ToastContainer } from '@/components/ui/Toast'

const MAX_TOASTS = 3

export const ToastProvider = ({ children }: { children: React.ReactNode }) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((input: AddToastInput) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    setToasts((prev) => {
      const next = [...prev, { ...input, id }]
      return next.length > MAX_TOASTS ? next.slice(-MAX_TOASTS) : next
    })
  }, [])

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  )
}
