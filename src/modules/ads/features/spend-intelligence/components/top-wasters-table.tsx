// S12 — Top Wasters Table
// Design Ref: §2.1 spend-intelligence/components/top-wasters-table.tsx
'use client'

import type { TopWasterItem } from '../types'

type TopWastersTableProps = {
  items: TopWasterItem[]
  className?: string
}

const getScoreColor = (score: number): string => {
  if (score >= 70) return 'text-red-600 bg-red-50'
  if (score >= 40) return 'text-orange-600 bg-orange-50'
  return 'text-gray-600 bg-gray-50'
}

const TopWastersTable = ({ items, className = '' }: TopWastersTableProps) => {
  if (items.length === 0) {
    return (
      <div className={`rounded-lg border border-gray-200 bg-white p-4 ${className}`}>
        <h3 className="text-sm font-medium text-gray-900 mb-3">Top Wasters</h3>
        <p className="text-sm text-gray-400 text-center py-8">No wasters detected</p>
      </div>
    )
  }

  return (
    <div className={`rounded-lg border border-gray-200 bg-white ${className}`}>
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900">Top Wasters</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="px-4 py-2 text-left text-gray-500 font-medium">Campaign</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Spend 7d</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">Sales 7d</th>
              <th className="px-3 py-2 text-right text-gray-500 font-medium">ACoS</th>
              <th className="px-3 py-2 text-center text-gray-500 font-medium">Score</th>
              <th className="px-3 py-2 text-left text-gray-500 font-medium">Cause</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.campaign_id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-2">
                  <p className="font-medium text-gray-700 truncate max-w-[180px]">{item.campaign_name}</p>
                  <p className="text-[10px] text-gray-400 font-mono">{item.marketing_code}</p>
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">
                  ${item.spend_7d.toFixed(0)}
                </td>
                <td className="px-3 py-2 text-right font-mono text-gray-700">
                  ${item.sales_7d.toFixed(0)}
                </td>
                <td className="px-3 py-2 text-right">
                  <span className={item.acos > 35 ? 'font-medium text-red-600' : 'text-gray-700'}>
                    {item.acos.toFixed(1)}%
                  </span>
                </td>
                <td className="px-3 py-2 text-center">
                  <span className={`inline-block rounded px-2 py-0.5 text-[10px] font-semibold ${getScoreColor(item.waste_score)}`}>
                    {item.waste_score.toFixed(0)}
                  </span>
                </td>
                <td className="px-3 py-2 text-gray-500 truncate max-w-[120px]">
                  {item.primary_cause}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { TopWastersTable }
