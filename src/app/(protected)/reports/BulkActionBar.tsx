'use client'

import { useI18n } from '@/lib/i18n/context'
import { Button } from '@/components/ui/Button'

type BulkActionBarProps = {
  selectedCount: number
  selectedStatuses: Record<string, number>
  canEdit: boolean
  bulkLoading: string | null
  onApprove: () => void
  onSubmit: (action: 'submit_review' | 'submit_sc') => void
  onDelete: () => void
  onDeselect: () => void
}

export const BulkActionBar = ({
  selectedCount,
  selectedStatuses,
  canEdit,
  bulkLoading,
  onApprove,
  onSubmit,
  onDelete,
  onDeselect,
}: BulkActionBarProps) => {
  const { t } = useI18n()

  if (selectedCount === 0) return null

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-th-accent/30 bg-th-accent/5 px-4 py-2.5">
      <span className="text-sm font-medium text-th-text">{t('reports.bulk.selected' as Parameters<typeof t>[0]).replace('{count}', String(selectedCount))}</span>
      <div className="h-4 w-px bg-th-border" />
      {(selectedStatuses['draft'] ?? 0) > 0 && canEdit && (
        <Button
          size="sm"
          variant="outline"
          loading={bulkLoading === 'bulk-submit'}
          onClick={() => onSubmit('submit_review')}
        >
          {t('reports.bulk.submitReview' as Parameters<typeof t>[0]).replace('{count}', String(selectedStatuses['draft']))}
        </Button>
      )}
      {(selectedStatuses['pending_review'] ?? 0) > 0 && canEdit && (
        <Button
          size="sm"
          loading={bulkLoading === 'bulk-approve'}
          onClick={onApprove}
        >
          {t('reports.bulk.approve' as Parameters<typeof t>[0]).replace('{count}', String(selectedStatuses['pending_review']))}
        </Button>
      )}
      {(selectedStatuses['approved'] ?? 0) > 0 && canEdit && (
        <Button
          size="sm"
          variant="outline"
          loading={bulkLoading === 'bulk-submit'}
          onClick={() => onSubmit('submit_sc')}
        >
          {t('reports.bulk.submitSc' as Parameters<typeof t>[0]).replace('{count}', String(selectedStatuses['approved']))}
        </Button>
      )}
      {canEdit && (
        <Button
          size="sm"
          variant="outline"
          className="border-st-danger-text/30 text-st-danger-text hover:bg-st-danger-text/10"
          onClick={onDelete}
        >
          {t('reports.bulk.delete' as Parameters<typeof t>[0]).replace('{count}', String(selectedCount))}
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={onDeselect}
      >
        {t('reports.bulk.deselect' as Parameters<typeof t>[0])}
      </Button>
    </div>
  )
}
