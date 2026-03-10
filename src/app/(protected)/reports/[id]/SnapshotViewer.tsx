'use client'

import { useState } from 'react'
import { useI18n } from '@/lib/i18n/context'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import type { ReportSnapshot } from '@/types/monitoring'

type SnapshotViewerProps = {
  initialSnapshot: ReportSnapshot | null
  followupSnapshots: ReportSnapshot[]
}

export const SnapshotViewer = ({ initialSnapshot, followupSnapshots }: SnapshotViewerProps) => {
  const { t } = useI18n()
  const [currentIndex, setCurrentIndex] = useState(followupSnapshots.length > 0 ? followupSnapshots.length - 1 : 0)

  const current = followupSnapshots[currentIndex]
  const totalFollowups = followupSnapshots.length

  if (!initialSnapshot && totalFollowups === 0) {
    return (
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-th-text">{t('reports.monitoring.title' as Parameters<typeof t>[0])}</h2>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-th-text-muted">{t('reports.monitoring.noSnapshots' as Parameters<typeof t>[0])}</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-th-text">{t('reports.monitoring.title' as Parameters<typeof t>[0])}</h2>
          {totalFollowups > 0 && (
            <span className="text-sm text-th-text-muted">
              {currentIndex + 1} / {totalFollowups}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {/* Initial Snapshot */}
          <div className="rounded-lg border border-th-border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">
              {t('reports.monitoring.initialSnapshot' as Parameters<typeof t>[0])}
            </p>
            {initialSnapshot ? (
              <SnapshotDataView data={initialSnapshot.listing_data} crawledAt={initialSnapshot.crawled_at} />
            ) : (
              <p className="text-sm text-th-text-muted">—</p>
            )}
          </div>

          {/* Current Follow-up Snapshot */}
          <div className="rounded-lg border border-th-border p-4">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">
              {`Follow-up #${currentIndex + 1}`}
            </p>
            {current ? (
              <>
                <SnapshotDataView data={current.listing_data} crawledAt={current.crawled_at} />
                {current.change_detected && current.change_type && (
                  <div className="mt-3">
                    <Badge variant={current.change_type === 'no_change' ? 'default' : 'warning'}>
                      {current.change_type === 'listing_removed' ? 'Listing Removed'
                        : current.change_type === 'content_modified' ? 'Content Modified'
                        : current.change_type === 'seller_changed' ? 'Seller Changed'
                        : 'No Change'}
                    </Badge>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-th-text-muted">—</p>
            )}
          </div>
        </div>

        {/* Diff Details */}
        {current?.diff_from_initial && current.diff_from_initial.changes.length > 0 && (
          <div className="rounded-lg border border-st-warning-text/20 bg-st-warning-bg/30 p-4">
            <p className="mb-2 text-sm font-medium text-th-text">{t('reports.monitoring.changeDetected' as Parameters<typeof t>[0])}</p>
            <div className="space-y-2">
              {current.diff_from_initial.changes.map((change, i) => (
                <div key={i} className="text-sm">
                  <span className="font-medium text-th-text-secondary">{change.field}:</span>
                  {change.before && (
                    <span className="ml-2 text-red-400 line-through">{truncate(change.before, 60)}</span>
                  )}
                  {change.after && (
                    <span className="ml-2 text-green-400">{truncate(change.after, 60)}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AI Remark */}
        {current?.ai_remark && (
          <div className="rounded-lg bg-th-bg-tertiary p-4">
            <p className="mb-1 text-xs font-medium uppercase tracking-wider text-th-text-tertiary">
              {t('reports.monitoring.aiRemark' as Parameters<typeof t>[0])}
            </p>
            <p className="text-sm text-th-text-secondary">{current.ai_remark}</p>
            {current.ai_resolution_suggestion && (
              <div className="mt-2">
                <span className="text-xs text-th-text-muted">{t('reports.monitoring.suggestion' as Parameters<typeof t>[0])}: </span>
                <Badge variant={
                  current.ai_resolution_suggestion === 'resolved' ? 'success'
                    : current.ai_resolution_suggestion === 'unresolved' ? 'danger'
                    : 'default'
                }>
                  {current.ai_resolution_suggestion}
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Screenshot Comparison */}
        {(initialSnapshot?.screenshot_url || current?.screenshot_url) && (
          <div className="grid gap-4 md:grid-cols-2">
            {initialSnapshot?.screenshot_url && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Initial Screenshot</p>
                <img
                  src={initialSnapshot.screenshot_url}
                  alt="Initial listing"
                  className="w-full rounded-lg border border-th-border"
                />
              </div>
            )}
            {current?.screenshot_url && (
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Follow-up #{currentIndex + 1}</p>
                <img
                  src={current.screenshot_url}
                  alt="Follow-up listing"
                  className="w-full rounded-lg border border-th-border"
                />
              </div>
            )}
          </div>
        )}

        {/* Follow-up Timeline Bar */}
        {totalFollowups > 1 && (
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wider text-th-text-tertiary">Follow-up History</p>
            <div className="flex items-center gap-1">
              {followupSnapshots.map((snap, i) => (
                <button
                  key={snap.id}
                  onClick={() => setCurrentIndex(i)}
                  className={`flex-1 rounded-md px-1 py-1.5 text-center text-[10px] transition-colors ${
                    i === currentIndex
                      ? 'bg-th-accent text-white'
                      : snap.change_detected
                        ? 'bg-st-warning-bg text-st-warning-text hover:bg-st-warning-bg/80'
                        : 'bg-th-bg-tertiary text-th-text-muted hover:bg-th-bg-hover'
                  }`}
                  title={`${new Date(snap.crawled_at).toLocaleDateString()} — ${snap.change_type ?? 'no_change'}`}
                >
                  {new Date(snap.crawled_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        {totalFollowups > 1 && (
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={currentIndex >= totalFollowups - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              Next
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

const SnapshotDataView = ({ data, crawledAt }: { data: Record<string, unknown>; crawledAt: string }) => {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== '')
  return (
    <div className="space-y-1">
      {entries.map(([key, value]) => (
        <div key={key} className="text-sm">
          <span className="text-th-text-tertiary">{key}: </span>
          <span className="text-th-text-secondary">{truncate(String(value), 80)}</span>
        </div>
      ))}
      <p className="mt-2 text-xs text-th-text-muted">
        {new Date(crawledAt).toLocaleDateString()} {new Date(crawledAt).toLocaleTimeString()}
      </p>
    </div>
  )
}

const truncate = (str: string, max: number): string =>
  str.length > max ? `${str.slice(0, max)}...` : str
