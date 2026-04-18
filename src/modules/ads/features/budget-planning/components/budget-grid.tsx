// S13 — Monthly budget: team × selected market (country). Plan rows use unified channel `total`.
'use client'

import { useState } from 'react'
import type { TeamMonthlyBudget, BudgetEntry } from '../types'

type BudgetGridProps = {
  plan_total: TeamMonthlyBudget
  actual_total: TeamMonthlyBudget
  year: number
  marketLabel: string | null
  marketplace: string | null
  onSave: (entries: BudgetEntry[]) => Promise<void>
  canEdit: boolean
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const fmt = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v.toFixed(0))

const PLAN_CHANNEL = 'total' as const

const BudgetGrid = ({
  plan_total,
  actual_total,
  year,
  marketLabel,
  marketplace,
  onSave,
  canEdit,
}: BudgetGridProps) => {
  const [editedCells, setEditedCells] = useState<Map<string, number>>(new Map())
  const [isSaving, setIsSaving] = useState(false)

  const getCellKey = (month: number) => `${PLAN_CHANNEL}_${month}`

  const getCellValue = (month: number): number => {
    const key = getCellKey(month)
    if (editedCells.has(key)) return editedCells.get(key)!
    return plan_total.months.find((m) => m.month === month)?.amount ?? 0
  }

  const handleCellChange = (month: number, value: string) => {
    const num = parseFloat(value) || 0
    setEditedCells((prev) => new Map(prev).set(getCellKey(month), num))
  }

  const handleSave = async () => {
    setIsSaving(true)
    const entries: BudgetEntry[] = Array.from(editedCells.entries()).map(([key, amount]) => {
      const monthStr = key.split('_').slice(1).join('_')
      const month = parseInt(monthStr, 10)
      return { channel: PLAN_CHANNEL, month, amount }
    })
    try {
      await onSave(entries)
      setEditedCells(new Map())
    } finally {
      setIsSaving(false)
    }
  }

  const footerPlanTotal = Array.from({ length: 12 }, (_, i) => getCellValue(i + 1)).reduce((s, v) => s + v, 0)

  const regionLine = [marketLabel, marketplace ? `Country: ${marketplace}` : null].filter(Boolean).join(' · ')

  return (
    <div className="rounded-lg border border-th-border bg-surface-card">
      <div className="border-b border-th-border px-4 py-3">
        <p className="text-xs text-th-text-muted">{regionLine || 'Market'}</p>
        <p className="mt-1 text-sm text-th-text-secondary">
          Figures and the rightmost column are totals for the selected team in this market only — not a company or market roll-up.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-end border-b border-th-border px-4 py-2">
        {canEdit && editedCells.size > 0 ? (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-md bg-orange-500 px-4 py-1.5 text-xs font-medium text-white hover:bg-orange-600 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : `Save (${editedCells.size})`}
          </button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <p className="px-4 pt-3 pb-2 text-[11px] leading-snug text-th-text-muted">
          Jan–Dec in the header row are column labels only — not inputs. Enter or change amounts in the{' '}
          <span className="font-medium text-th-text-secondary">Team plan</span> row directly under each month.
        </p>
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-th-border">
              <th scope="col" className="sticky left-0 bg-surface-card px-3 py-2 text-left text-th-text-muted font-medium w-32">
                Line
              </th>
              {MONTHS.map((m) => (
                <th key={m} scope="col" className="px-2 py-2 text-center text-th-text-muted font-medium min-w-[72px]">
                  {m}
                </th>
              ))}
              <th scope="col" className="px-3 py-2 text-center text-th-text-secondary font-semibold">Team total</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-th-border">
              <th scope="row" className="sticky left-0 bg-surface-card px-3 py-2 text-left text-th-text-secondary font-medium">
                Team plan &apos;{String(year).slice(2)}
              </th>
              {MONTHS.map((_, i) => {
                const month = i + 1
                const value = getCellValue(month)
                const isEdited = editedCells.has(getCellKey(month))
                return (
                  <td key={month} className="px-1 py-1">
                    {canEdit ? (
                      <input
                        type="number"
                        inputMode="decimal"
                        value={value}
                        onChange={(e) => handleCellChange(month, e.target.value)}
                        className={[
                          'w-full rounded border px-2 py-1 text-right text-xs font-mono [-moz-appearance:textfield]',
                          '[&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
                          isEdited
                            ? 'border-orange-300 bg-orange-50 dark:bg-orange-950/30'
                            : 'border-th-border bg-surface-card',
                          'focus:border-orange-500 focus:outline-none',
                        ].join(' ')}
                      />
                    ) : (
                      <div className="w-full rounded border border-th-border bg-th-bg-hover px-2 py-1 text-right text-xs font-mono text-th-text-secondary">
                        ${fmt(value)}
                      </div>
                    )}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono font-semibold text-th-text">${fmt(footerPlanTotal)}</td>
            </tr>

            <tr className="border-b border-th-border bg-th-bg-hover">
              <th scope="row" className="sticky left-0 bg-th-bg-hover px-3 py-2 text-left font-medium text-th-text-muted">
                Team actual &apos;{String(year).slice(2)}
              </th>
              {MONTHS.map((_, i) => {
                const month = i + 1
                const amount = actual_total.months.find((m) => m.month === month)?.amount ?? 0
                return (
                  <td key={month} className="px-2 py-2 text-center text-th-text-muted font-mono">
                    {amount > 0 ? `$${fmt(amount)}` : '-'}
                  </td>
                )
              })}
              <td className="px-3 py-2 text-right font-mono font-medium text-th-text-secondary">
                ${fmt(actual_total.annual_total)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export { BudgetGrid }
