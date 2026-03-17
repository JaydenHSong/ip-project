'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Modal } from '@/components/ui/Modal'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/hooks/useToast'
import { MARKETPLACE_CODES, MARKETPLACES } from '@/constants/marketplaces'
import { useI18n } from '@/lib/i18n/context'

const MARKETPLACE_OPTIONS = MARKETPLACE_CODES.map((code) => ({
  value: code,
  label: `${MARKETPLACES[code].name} (${code})`,
}))

type DuplicateWarning = {
  report_id: string
  status: string
  report_number: number
}

type NewReportModalProps = {
  open: boolean
  onClose: () => void
  prefillAsin?: string
  prefillMarketplace?: string
}

export const NewReportModal = ({ open, onClose, prefillAsin, prefillMarketplace }: NewReportModalProps) => {
  const { t } = useI18n()
  const router = useRouter()
  const { addToast } = useToast()
  const [asin, setAsin] = useState(prefillAsin ?? '')
  const [marketplace, setMarketplace] = useState(prefillMarketplace || 'US')
  const [loading, setLoading] = useState(false)
  const [duplicates, setDuplicates] = useState<DuplicateWarning[]>([])
  const [checking, setChecking] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const reset = useCallback(() => {
    setAsin(prefillAsin ?? '')
    setMarketplace(prefillMarketplace || 'US')
    setLoading(false)
    setDuplicates([])
    setChecking(false)
  }, [prefillAsin, prefillMarketplace])

  useEffect(() => {
    if (!open) reset()
  }, [open, reset])

  // 실시간 중복 체크
  useEffect(() => {
    const trimmed = asin.trim().toUpperCase()
    if (trimmed.length < 5) {
      setDuplicates([])
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setChecking(true)
      try {
        const res = await fetch(`/api/reports/check-duplicate?asin=${trimmed}&marketplace=${marketplace}`)
        if (res.ok) {
          const data = await res.json() as { exists: boolean; reports?: DuplicateWarning[] }
          setDuplicates(data.reports ?? [])
        }
      } catch {
        // ignore
      } finally {
        setChecking(false)
      }
    }, 500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [asin, marketplace])

  const statusLabel = (status: string): string => {
    const map: Record<string, string> = {
      draft: '작성 중인 신고서가',
      pending_review: '승인 대기 중인 신고서가',
      approved: '승인된 신고서가',
      monitoring: '신고가 되어 모니터링 상태인 건이',
      br_submitting: '신고가 되어 모니터링 상태인 건이',
    }
    return map[status] ?? `${status} 상태인 건이`
  }

  const handleCreate = async () => {
    const trimmed = asin.trim().toUpperCase()
    if (!trimmed || trimmed.length < 5) {
      addToast({ type: 'error', title: 'Invalid ASIN', message: 'ASIN must be at least 5 characters.' })
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/reports/manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asin: trimmed, marketplace }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message ?? 'Failed to create report')
      }

      const data = await res.json() as { report_id: string }
      onClose()
      router.push(`/reports/${data.report_id}`)
      router.refresh()
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: e instanceof Error ? e.message : 'Unknown error' })
      setLoading(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title="New Report">
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

        {/* 중복 경고 */}
        {duplicates.length > 0 && (
          <div className="rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-3">
            {duplicates.map((dup) => (
              <div key={dup.report_id} className="flex items-start justify-between gap-2">
                <p className="text-sm text-st-warning-text">
                  이 ASIN은 {statusLabel(dup.status)} 있습니다 (#{String(dup.report_number).padStart(5, '0')}). 그래도 새로 만들까요?
                </p>
                <button
                  type="button"
                  onClick={() => { onClose(); router.push(`/reports/${dup.report_id}`) }}
                  className="shrink-0 text-xs text-th-accent underline"
                >
                  보기
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="ghost" size="sm" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button
            size="sm"
            loading={loading}
            disabled={!asin.trim() || asin.trim().length < 5 || checking}
            onClick={handleCreate}
          >
            Create Draft
          </Button>
        </div>
      </div>
    </Modal>
  )
}
