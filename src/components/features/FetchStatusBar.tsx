'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { RefreshCw, CheckCircle, XCircle, Loader2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/Button'

type FetchStatusBarProps = {
  listingId: string
  reportId: string
  onDataUpdated?: () => void
}

type FetchStatus = 'idle' | 'fetching' | 'completed' | 'failed'

export const FetchStatusBar = ({ listingId, reportId, onDataUpdated }: FetchStatusBarProps) => {
  const [status, setStatus] = useState<FetchStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [cooldownUntil, setCooldownUntil] = useState<Date | null>(null)
  const [cooldownRemaining, setCooldownRemaining] = useState(0)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const cooldownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const poll = useCallback(async () => {
    try {
      const res = await fetch(`/api/listings/${listingId}/fetch-status`)
      if (!res.ok) return
      const data = await res.json() as { status: FetchStatus; error?: string }
      setStatus(data.status)
      setError(data.error ?? null)

      if (data.status === 'completed') {
        stopPolling()
        onDataUpdated?.()
      } else if (data.status === 'failed') {
        stopPolling()
      }
    } catch {
      // ignore
    }
  }, [listingId, onDataUpdated])

  const stopPolling = () => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
  }

  const startPolling = useCallback(() => {
    stopPolling()
    pollingRef.current = setInterval(poll, 5000)
  }, [poll])

  // 초기 상태 확인 + fetching이면 polling 시작
  useEffect(() => {
    poll().then(() => {
      // poll 후 status가 fetching이면 polling 시작
    })
    return stopPolling
  }, [poll])

  useEffect(() => {
    if (status === 'fetching') {
      startPolling()
    }
    return stopPolling
  }, [status, startPolling])

  // 쿨다운 타이머
  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownRemaining(0)
      if (cooldownRef.current) clearInterval(cooldownRef.current)
      return
    }

    const tick = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil.getTime() - Date.now()) / 1000))
      setCooldownRemaining(remaining)
      if (remaining <= 0) {
        setCooldownUntil(null)
        if (cooldownRef.current) clearInterval(cooldownRef.current)
      }
    }

    tick()
    cooldownRef.current = setInterval(tick, 1000)
    return () => { if (cooldownRef.current) clearInterval(cooldownRef.current) }
  }, [cooldownUntil])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/refresh-listing`, { method: 'POST' })
      const data = await res.json() as { ok: boolean; cooldown_until?: string }

      if (data.cooldown_until) {
        setCooldownUntil(new Date(data.cooldown_until))
        return
      }

      if (data.ok) {
        setStatus('fetching')
        setError(null)
        startPolling()
      }
    } catch {
      // ignore
    } finally {
      setRefreshing(false)
    }
  }

  // idle + 에러 없으면 표시 안 함
  if (status === 'idle' && !error) return null

  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 text-sm ${
      status === 'fetching' ? 'border-th-accent/30 bg-th-accent/5 text-th-accent-text' :
      status === 'completed' ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-600 dark:text-emerald-400' :
      status === 'failed' ? 'border-red-500/30 bg-red-500/5 text-red-600 dark:text-red-400' :
      'border-th-border bg-surface-card text-th-text-muted'
    }`}>
      <div className="flex items-center gap-2">
        {status === 'fetching' && <Loader2 className="h-4 w-4 animate-spin" />}
        {status === 'completed' && <CheckCircle className="h-4 w-4" />}
        {status === 'failed' && <XCircle className="h-4 w-4" />}

        <span>
          {status === 'fetching' && '상품 정보 수집 중...'}
          {status === 'completed' && '상품 정보 수집 완료'}
          {status === 'failed' && `수집 실패${error ? ` — ${error}` : ''}`}
        </span>
      </div>

      {cooldownRemaining > 0 ? (
        <span className="flex items-center gap-1 text-xs text-th-text-muted">
          <Clock className="h-3.5 w-3.5" />
          {Math.floor(cooldownRemaining / 60)}:{String(cooldownRemaining % 60).padStart(2, '0')} 후 재시도
        </span>
      ) : (
        <Button
          variant="ghost"
          size="sm"
          loading={refreshing || status === 'fetching'}
          onClick={handleRefresh}
          className="gap-1"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      )}
    </div>
  )
}
