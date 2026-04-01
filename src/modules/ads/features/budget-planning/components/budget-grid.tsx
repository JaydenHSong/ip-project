// S13 — Monthly Budget Grid (12-month editable grid)
// Design Ref: §5.3 S13 "Monthly Budget Grid (채널 탭 SP/SB/SD)"
// 3-Row per channel: Plan'25 / Actual'25 / Plan'26 + Auto Pilot row + Total
'use client'

import { useState } from 'react'
import type { ChannelBudget, BudgetEntry } from '../types'
import type { Channel } from '@/modules/ads/shared/types'

type BudgetGridProps = {
  plans: ChannelBudget[]
  actuals: ChannelBudget[]
  autopilotMonthly: number[]
  year: number
  onSave: (entries: BudgetEntry[]) => Promise<void>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const CHANNEL_TABS: { key: Channel; label: string }[] = [
  { key: 'sp', label: 'SP' },
  { key: 'sb', label: 'SB' },
  { key: 'sd', label: 'SD' },
]

const fmt = (v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0)

const BudgetGrid = ({ plans, actuals, autopilotMonthly, year, onSave }: BudgetGridProps) => {
  const [activeChannel, setActiveChannel] = useState<Channel>('sp')
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  const planData = plans.find((p) => p.channel === activeChannel)
  const actualData = actuals.find((a) => a.channel === activeChannel)

  const getCellKey = (month: number) => `${activeChannel}_${month}`

  const getCellValue = (month: number): number => {
    const key = getCellKey(month)
    if (editedCells.has(key)) return editedCells.get(key)!
    return planData?.months.find((m) => m.month === month)?.amount ?? 0
  }

  const handleCellChange = (month: number, value: string) => {
    const num = parseFloat(value) || 0
    setEditedCells((prev) => new Map(prev).set(getCellKey(month), num))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const entries: BudgetEntry[] = Array.from(editedCells.entries()).map(([key, amount]) => {
      const [channel, monthStr] = key.split('_')
      return { channel: channel as Channel, month: parseInt(monthStr, 10), amount }
    })
    try {
      await onSave(entries)
      setEditedCells(new Map())
    } finally {
      setIsSaving(false)
    }
  }

  const planTotal = Array.from({ length: 12 }, (_, i) => getCellValue(i + 1)).reduce((s, v) => s + v, 0)
  const actualTotal = actualData?.annual_total ?? 0

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Channel tabs */}
      <div className="flex border-b border-gray-200">
        {CHANNEL_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveChannel(tab.key)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${
              activeChannel === tab.key
                ? 'border-b-2 border-orange-500 text-orange-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
        <div className="ml-auto flex items-center px-4">
          {editedCells.size > 0 && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-orange-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : `Save Changes (${editedCells.size})`}
            </button>
          )}
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="sticky left-0 bg-white px-3 py-2 text-left text-gray-500 font-medium w-28">Row</th>
              {MONTHS.map((m) => (
                <th key={m} className="px-2 py-2 text-center text-gray-500 font-medium min-w-[72px]">{m}</th>
              ))}
              <th className="px-3 py-2 text-center text-gray-700 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {/* Plan row (editable) */}
            <tr className="border-b border-gray-50">
              <td className="sticky left-0 bg-white px-3 py-2 text-gray-700 font-medium">Plan &apos;{String(year).slice(2)}</td>
              {MONTHS.map((_, i) => {
                const month = i + 1
                const value = getCellValue(month)
                const isEdited = editedCells.has(getCellKey(month))
                return (
                  <td key={month} className="px-1 py-1">
                    <input
                      type="number"
                      value={value}
                      onChange={(e) => handleCellChange(month, e.target.value)}
                      className={`w-full rounded border px-2 py-1 text-right text-xs font-mono ${
                        isEdited
                          ? 'border-orange-300 bg-orange-50'
                          : 'border-gray-200 bg-white'
                      } focus:border-orange-500 focus:outline-none`}
                    />
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                ${fmt(planTotal)}
              </td>
            </tr>

            {/* Actual row (read-only) */}
            <tr className="border-b border-gray-50 bg-gray-50">
              <td className="sticky left-0 bg-gray-50 px-3 py-2 text-gray-500 font-medium">Actual &apos;{String(year).slice(2)}</td>
              {MONTHS.map((_, i) => {
                const amount = actualData?.months.find((m) => m.month === i + 1)?.amount ?? 0
                return (
                  <td key={i} className="px-2 py-2 text-center text-gray-500 font-mono">
                    {amount > 0 ? `$${fmt(amount)}` : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono font-medium text-gray-600">
                ${fmt(actualTotal)}
              </td>
            </tr>

            {/* Auto Pilot row — Design S13: "Auto Pilot ⚡ 행 (#FFF7ED 배경)" */}
            <tr className="border-b border-gray-50" style={{ backgroundColor: '#FFF7ED' }}>
              <td className="sticky left-0 px-3 py-2 font-medium text-orange-700" style={{ backgroundColor: '#FFF7ED' }}>
                Auto Pilot
              </td>
              {MONTHS.map((_, i) => (
                <td key={i} className="px-2 py-2 text-center text-orange-600 font-mono">
                  ${fmt(autopilotMonthly[i] ?? 0)}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-mono font-medium text-orange-700">
                ${fmt(autopilotMonthly.reduce((s, v) => s + v, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { BudgetGrid }
