// M05 — Underspend Analysis Modal
// Design Ref: §2.1 optimization/components/underspend-modal.tsx
'use client'

type UnderspendModalProps = {
  campaignId: string
  campaignName: string
  dailyBudget: number
  spendToday: number
  isOpen: boolean
  onClose: () => void
}

const UnderspendModal = ({ campaignName, dailyBudget, spendToday, isOpen, onClose }: UnderspendModalProps) => {
  if (!isOpen) return null

  const utilization = dailyBudget > 0 ? (spendToday / dailyBudget) * 100 : 0
  const remaining = dailyBudget - spendToday

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-200 px-6 py-4">
          <h2 className="text-base font-semibold text-gray-900">Underspend Analysis</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">&times;</button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="rounded-md border border-orange-200 bg-orange-50 p-3">
            <p className="text-sm font-medium text-orange-800">{campaignName}</p>
            <p className="text-xs text-orange-700 mt-1">
              Budget utilization: {utilization.toFixed(0)}% — ${remaining.toFixed(2)} remaining
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Possible Causes</h3>
            <ul className="space-y-1.5">
              {[
                'Bids too low for competitive keywords',
                'Narrow targeting (few keywords or tight match types)',
                'Low search volume for selected keywords',
                'Campaign recently launched (learning period)',
              ].map((cause, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                  <span className="h-1 w-1 rounded-full bg-orange-400 shrink-0" />
                  {cause}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-2">Recommended Actions</h3>
            <div className="space-y-2">
              <button className="w-full rounded-md bg-gray-900 px-4 py-2 text-sm text-white text-left hover:bg-gray-800">
                Increase bids by 20% for top keywords
              </button>
              <button className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 text-left hover:bg-gray-50">
                Add broad match keywords from search terms
              </button>
              <button className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 text-left hover:bg-gray-50">
                Expand product targeting
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-200 px-6 py-4">
          <button onClick={onClose} className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export { UnderspendModal }
