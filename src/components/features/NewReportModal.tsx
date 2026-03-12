'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { MARKETPLACE_CODES, MARKETPLACES } from '@/constants/marketplaces'
import { AlertTriangle } from 'lucide-react'

const MARKETPLACE_OPTIONS = MARKETPLACE_CODES.map((code) => ({
  value: code,
  label: `${MARKETPLACES[code].name} (${code})`,
}))

type Step = 'input' | 'loading' | 'timeout'

type NewReportModalProps = {
  open: boolean
  onClose: () => void
  prefillAsin?: string
  prefillMarketplace?: string
}

export const NewReportModal = ({ open, onClose, prefillAsin, prefillMarketplace }: NewReportModalProps) => {
  const router = useRouter()
  const { addToast } = useToast()
  const [step, setStep] = useState<Step>('input')
  const [asin, setAsin] = useState(prefillAsin ?? '')
  const [marketplace, setMarketplace] = useState(prefillMarketplace || 'US')
  const [loading, setLoading] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duplicateId, setDuplicateId] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const queueIdRef = useRef<string | null>(null)

  const cleanup = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current)
    if (timerRef.current) clearInterval(timerRef.current)
    pollingRef.current = null
    timerRef.current = null
  }, [])

  const reset = useCallback(() => {
    cleanup()
    setStep('input')
    setAsin(prefillAsin ?? '')
    setMarketplace(prefillMarketplace || 'US')
    setLoading(false)
    setElapsed(0)
    setDuplicateId(null)
    queueIdRef.current = null
  }, [cleanup, prefillAsin, prefillMarketplace])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  useEffect(() => {
    return cleanup
  }, [cleanup])

  const createDraft = async (listingId?: string) => {
    const res = await fetch('/api/reports/manual', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        asin: asin.trim().toUpperCase(),
        marketplace,
        ...(listingId ? { listing_id: listingId } : {}),
      }),
    })

    if (res.status === 409) {
      const data = await res.json()
      setDuplicateId(data.error?.details?.existing_report_id ?? null)
      setStep('input')
      setLoading(false)
      return
    }

    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.error?.message ?? 'Failed to create report')
    }

    const data = await res.json()
    onClose()
    router.push(`/reports/${data.report_id}`)
    router.refresh()
  }

  const startPolling = (queueId: string) => {
    let pollCount = 0
    const maxPolls = 30

    pollingRef.current = setInterval(async () => {
      pollCount++
      try {
        const res = await fetch(`/api/ext/fetch-status?id=${queueId}`)
        if (!res.ok) return

        const data = await res.json()

        if (data.status === 'completed') {
          cleanup()
          try {
            const listingId = (data.result as { listing_id?: string })?.listing_id
            await createDraft(listingId)
          } catch (e) {
            addToast({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Draft creation failed' })
            setStep('input')
            setLoading(false)
          }
          return
        }

        if (data.status === 'failed') {
          cleanup()
          setStep('timeout')
          return
        }
      } catch {
        // continue polling
      }

      if (pollCount >= maxPolls) {
        cleanup()
        setStep('timeout')
      }
    }, 1000)
  }

  const handleCreate = async () => {
    const trimmed = asin.trim().toUpperCase()
    if (!trimmed || trimmed.length < 5) {
      addToast({ type: 'error', title: 'Invalid ASIN', message: 'ASIN must be at least 5 characters.' })
      return
    }

    setLoading(true)
    setDuplicateId(null)

    try {
      // Insert into extension_fetch_queue
      const res = await fetch('/api/reports/create-from-asin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: trimmed, marketplace }),
      })

      if (res.status === 409) {
        const data = await res.json()
        setDuplicateId(data.error?.details?.existing_report_id ?? null)
        setLoading(false)
        return
      }

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed')
      }

      const data = await res.json()
      queueIdRef.current = data.queue_id

      // Start polling
      setStep('loading')
      setElapsed(0)

      timerRef.current = setInterval(() => {
        setElapsed((prev) => prev + 1)
      }, 1000)

      startPolling(data.queue_id)
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(false)
    }
  }

  const handleManualCreate = async () => {
    setLoading(true)
    try {
      await createDraft()
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(false)
    }
  }

  const handleClose = () => {
    cleanup()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="New Report">
      {step === 'input' && (
        <div className="space-y-4">
          <Input
            label="ASIN"
            value={asin}
            onChange={(e) => setAsin(e.target.value.toUpperCase())}
            placeholder="B0XXXXXXXXX"
            className="font-mono"
            autoFocus
          />
          <Select
            label="Marketplace"
            value={marketplace}
            onChange={(e) => setMarketplace(e.target.value)}
            options={MARKETPLACE_OPTIONS}
          />
          {duplicateId && (
            <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
              <p className="text-sm font-medium text-st-warning-text">
                이미 활성 신고가 있습니다.
              </p>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  router.push(`/reports/${duplicateId}`)
                }}
                className="mt-1 text-sm text-th-accent underline"
              >
                기존 신고 보기
              </button>
            </div>
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              loading={loading}
              disabled={!asin.trim() || asin.trim().length < 5}
              onClick={handleCreate}
            >
              Create
            </Button>
          </div>
        </div>
      )}

      {step === 'loading' && (
        <div className="flex flex-col items-center gap-4 py-6">
          <svg className="h-8 w-8 animate-spin text-th-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <div className="text-center">
            <p className="text-sm font-medium text-th-text">
              {elapsed < 5
                ? 'Extension에서 정보를 가져오는 중...'
                : elapsed < 15
                  ? '아마존 페이지를 분석하고 있습니다...'
                  : elapsed < 25
                    ? '거의 완료됐습니다, 잠시만 기다려주세요...'
                    : '응답이 늦어지고 있습니다...'}
            </p>
          </div>
          {/* Progress bar */}
          <div className="w-full max-w-xs">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-th-border">
              <div
                className="h-full rounded-full bg-th-accent transition-all duration-1000 ease-linear"
                style={{ width: `${Math.min((elapsed / 30) * 100, 100)}%` }}
              />
            </div>
            <p className="mt-1.5 text-center text-xs text-th-text-muted">
              {elapsed}초 경과
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            Cancel
          </Button>
        </div>
      )}

      {step === 'timeout' && (
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3 py-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-st-warning-bg">
              <AlertTriangle className="h-6 w-6 text-st-warning-text" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-th-text">
                Extension이 응답하지 않습니다
              </p>
              <p className="mt-1 text-xs text-th-text-muted">
                Extension이 켜져 있는지 확인해주세요.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Button size="sm" loading={loading} onClick={handleManualCreate}>
              Create Manually
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
