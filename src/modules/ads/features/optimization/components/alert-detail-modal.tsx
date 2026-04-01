// M04 — Alert Detail Modal
// Design Ref: §2.1 optimization/components/alert-detail-modal.tsx
'use client'

import type { AlertDetailData } from '../types'

type AlertDetailModalProps = {
  alert: AlertDetailData | null
  isOpen: boolean
  onClose: () => void
  onAction: (alertId: string, actionKey: string) => void
}

const SEV_STYLES: Record<string, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200',
  warning: 'bg-orange-50 text-orange-700 border-orange-200',
  info: 'bg-gray-50 text-gray-600 border-gray-200',
}

const AlertDetailModal = ({ alert, isOpen, onClose, onAction }: AlertDetailModalProps) => {
  if (!isOpen || !alert) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className={`rounded border px-2 py-0.5 text-xs font-medium ${SEV_STYLES[alert.severity]}`}>
              {alert.severity}
            </span>
            <h2 className="text-sm font-semibold text-gray-900">{alert.alert_type}</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <h3 className="text-base font-medium text-gray-900">{alert.title}</h3>
            <p className="mt-1 text-sm text-gray-600">{alert.message}</p>
          </div>

          <div className="rounded bg-gray-50 px-3 py-2">
            <p className="text-xs text-gray-500">Campaign: <span className="font-medium text-gray-700">{alert.campaign_name}</span></p>
            <p className="text-xs text-gray-400 mt-0.5">{new Date(alert.created_at).toLocaleString()}</p>
          </div>

          {alert.data && Object.keys(alert.data).length > 0 && (
            <div className="rounded bg-gray-50 px-3 py-2">
              <p className="text-xs text-gray-500 mb-1">Details</p>
              <pre className="text-[11px] text-gray-600 font-mono whitespace-pre-wrap">
                {JSON.stringify(alert.data, null, 2)}
              </pre>
            </div>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            {alert.quick_actions.map((action) => (
              <button
                key={action.key}
                onClick={() => onAction(alert.id, action.key)}
                className={`flex-1 rounded-md px-3 py-2 text-sm font-medium ${
                  action.variant === 'danger'
                    ? 'bg-red-500 text-white hover:bg-red-600'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export { AlertDetailModal }
