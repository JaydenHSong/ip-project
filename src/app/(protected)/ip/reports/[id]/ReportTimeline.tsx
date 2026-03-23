'use client'

import { useI18n } from '@/lib/i18n/context'
import { formatDateTime } from '@/lib/utils/date'
import type { TimelineEvent, TimelineEventType } from '@/types/reports'

type ReportTimelineProps = {
  events: TimelineEvent[]
}

const EVENT_STYLES: Record<TimelineEventType, { color: string; icon: string }> = {
  created: { color: 'text-th-accent bg-th-accent/10', icon: '+' },
  ai_analyzed: { color: 'text-purple-500 bg-purple-500/10', icon: 'AI' },
  submitted_review: { color: 'text-th-text-muted bg-th-bg-tertiary', icon: '>' },
  draft_edited: { color: 'text-amber-500 bg-amber-500/10', icon: 'E' },
  approved: { color: 'text-st-success-text bg-st-success-bg', icon: '\u2713' },
  rejected: { color: 'text-st-danger-text bg-st-danger-bg', icon: '\u2717' },
  cancelled: { color: 'text-th-text-muted bg-th-bg-tertiary', icon: '\u2015' },
  rewritten: { color: 'text-amber-500 bg-amber-500/10', icon: 'R' },
  monitoring_started: { color: 'text-blue-500 bg-blue-500/10', icon: 'M' },
  snapshot_taken: { color: 'text-cyan-500 bg-cyan-500/10', icon: 'S' },
  change_detected: { color: 'text-amber-500 bg-amber-500/10', icon: '!' },
  resolved: { color: 'text-st-success-text bg-st-success-bg', icon: '\u2713' },
  unresolved: { color: 'text-st-danger-text bg-st-danger-bg', icon: '\u2717' },
}

const EVENT_I18N_KEYS: Record<TimelineEventType, string> = {
  created: 'reports.timeline.created',
  ai_analyzed: 'reports.timeline.aiAnalyzed',
  submitted_review: 'reports.timeline.submittedReview',
  draft_edited: 'reports.timeline.draftEdited',
  approved: 'reports.timeline.approved',
  rejected: 'reports.timeline.rejected',
  cancelled: 'reports.timeline.cancelled',
  rewritten: 'reports.timeline.rewritten',
  monitoring_started: 'reports.timeline.monitoringStarted',
  snapshot_taken: 'reports.timeline.snapshotTaken',
  change_detected: 'reports.timeline.changeDetected',
  resolved: 'reports.timeline.resolved',
  unresolved: 'reports.timeline.unresolved',
}

export const ReportTimeline = ({ events }: ReportTimelineProps) => {
  const { t } = useI18n()

  if (events.length === 0) return null

  return (
    <ol className="relative border-s border-th-border">
      {events.map((event, idx) => {
        const style = EVENT_STYLES[event.type]
        return (
          <li key={`${event.type}-${idx}`} className={`ms-6 ${idx < events.length - 1 ? 'mb-6' : ''}`}>
            <span
              className={`absolute -start-3.5 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ring-4 ring-th-bg ${style.color}`}
            >
              {style.icon}
            </span>
            <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h3 className="text-sm font-medium text-th-text">
                  {t(EVENT_I18N_KEYS[event.type] as Parameters<typeof t>[0])}
                </h3>
                {event.actor && (
                  <p className="text-xs text-th-text-muted">
                    {event.actor}
                  </p>
                )}
                {!event.actor && (event.type === 'ai_analyzed' || event.type === 'rewritten') && (
                  <p className="text-xs text-th-text-muted">
                    {t('reports.timeline.ai' as Parameters<typeof t>[0])}
                  </p>
                )}
                {event.detail && (
                  <p className="mt-1 text-xs text-th-text-secondary">{event.detail}</p>
                )}
              </div>
              <time className="shrink-0 text-xs text-th-text-muted sm:ms-4">
                {formatDateTime(event.timestamp)}
              </time>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
