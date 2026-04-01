// S09 — AI Activity Log Table (8 rows, color dots, badges, undo)
// Design Ref: §5.3 S09
'use client'

import type { ActivityLogEntry } from '../types'

type AiActivityLogProps = {
  entries: ActivityLogEntry[]
  onRollback: (logId: string) => void
}

const ACTION_COLORS: Record<string, string> = {
  bid_adjust: 'bg-emerald-500',
  keyword_add: 'bg-blue-500',
  keyword_negate: 'bg-red-500',
  keyword_promote: 'bg-orange-500',
  budget_adjust: 'bg-purple-500',
  campaign_pause: 'bg-gray-500',
  campaign_resume: 'bg-emerald-500',
  dayparting_apply: 'bg-indigo-500',
}

const SOURCE_BADGES: Record<string, string> = {
  rule_engine: 'bg-gray-100 text-gray-600',
  algorithm: 'bg-orange-50 text-orange-700',
  ml: 'bg-purple-50 text-purple-700',
  manual: 'bg-blue-50 text-blue-700',
}

const AiActivityLog = ({ entries, onRollback }: AiActivityLogProps) => {
  if (entries.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">AI Activity Log</h3>
        <p className="text-sm text-gray-400 text-center py-8">No AI actions recorded yet</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">AI Activity Log</h3>
      </div>
      <div className="divide-y divide-gray-50">
        {entries.slice(0, 8).map((entry) => (
          <div
            key={entry.id}
            className={`flex items-center gap-3 px-4 py-2.5 ${
              entry.guardrail_blocked ? 'border-l-2 border-dashed border-l-orange-400 bg-orange-50/30' : ''
            } ${entry.is_rolled_back ? 'opacity-50' : ''}`}
          >
            {/* Color dot — Design S09 */}
            <span className={`h-2 w-2 shrink-0 rounded-full ${ACTION_COLORS[entry.action_type] ?? 'bg-gray-400'}`} />

            {/* Action info */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-700">{entry.action_type}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${SOURCE_BADGES[entry.source] ?? 'bg-gray-100 text-gray-600'}`}>
                  {entry.source}
                </span>
                {entry.guardrail_blocked && (
                  <span className="rounded border border-orange-300 px-1.5 py-0.5 text-[10px] font-medium text-orange-700">
                    Blocked
                  </span>
                )}
                {entry.is_rolled_back && (
                  <span className="rounded bg-gray-200 px-1.5 py-0.5 text-[10px] text-gray-600">
                    Rolled Back
                  </span>
                )}
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                {entry.keyword_text && <span className="font-mono">{entry.keyword_text} </span>}
                {entry.reason}
                {entry.guardrail_reason && <span className="text-orange-600 ml-1">— {entry.guardrail_reason}</span>}
              </p>
            </div>

            {/* Value change */}
            {entry.old_value && entry.new_value && (
              <div className="text-xs font-mono shrink-0">
                <span className="text-gray-400">${entry.old_value}</span>
                <span className="mx-1 text-gray-300">&rarr;</span>
                <span className="text-gray-700">${entry.new_value}</span>
              </div>
            )}

            {/* Timestamp + Undo */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px] text-gray-400">
                {new Date(entry.executed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
              {!entry.is_rolled_back && !entry.guardrail_blocked && (
                <button
                  onClick={() => onRollback(entry.id)}
                  className="text-[10px] text-gray-400 hover:text-red-500"
                >
                  Undo
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export { AiActivityLog }
