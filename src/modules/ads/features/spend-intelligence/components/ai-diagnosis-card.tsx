// S12 — AI Diagnosis Card
// Design Ref: §2.1 spend-intelligence/components/ai-diagnosis-card.tsx
'use client'

import type { AiDiagnosisItem } from '../types'

type AiDiagnosisCardProps = {
  items: AiDiagnosisItem[]
  className?: string
}

const fmt = (v: number) => v >= 1000 ? `$${(v / 1000).toFixed(1)}K` : `$${v.toFixed(0)}`

const AiDiagnosisCard = ({ items, className = '' }: AiDiagnosisCardProps) => {
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">AI Diagnosis</h3>
        <p className="text-sm text-gray-400 text-center py-6">No issues diagnosed</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
      <h3 className="text-sm font-medium text-gray-900 mb-3">AI Diagnosis</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.campaign_id} className="rounded-lg border border-gray-100 bg-gray-50 p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700 truncate max-w-[200px]">
                {item.campaign_name}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-gray-400">
                  {item.confidence}% confidence
                </span>
                {item.estimated_savings > 0 && (
                  <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
                    Save {fmt(item.estimated_savings)}
                  </span>
                )}
              </div>
            </div>

            <p className="text-xs text-gray-600 mb-2">{item.diagnosis}</p>

            {item.suggested_actions.length > 0 && (
              <div className="space-y-1">
                {item.suggested_actions.map((action, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[11px]">
                    <span className="h-1 w-1 rounded-full bg-orange-400" />
                    <span className="text-gray-500">{action}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export { AiDiagnosisCard }
