// Goal Mode Selector — 4 modes for AutoPilot campaigns
// Design Ref: §3.7 — Goal Mode (Launch/Growth/Profit/Defend)
'use client'

import { useState } from 'react'
import type { GoalMode } from '../types'

type GoalModeSelectorProps = {
  campaignId: string
  currentMode: GoalMode
  onChanged: (mode: GoalMode) => void
}

const GOAL_MODES: { value: GoalMode; label: string; desc: string; multiplier: string; color: string }[] = [
  { value: 'launch', label: 'Launch', desc: 'Aggressive — max visibility', multiplier: '×1.3', color: 'bg-blue-50 border-blue-300 text-blue-700' },
  { value: 'growth', label: 'Growth', desc: 'Balanced — scale steadily', multiplier: '×1.1', color: 'bg-green-50 border-green-300 text-green-700' },
  { value: 'profit', label: 'Profit', desc: 'Conservative — maximize ROI', multiplier: '×0.85', color: 'bg-amber-50 border-amber-300 text-amber-700' },
  { value: 'defend', label: 'Defend', desc: 'Maintain — hold position', multiplier: '×1.0', color: 'bg-gray-50 border-gray-300 text-gray-700' },
]

const GoalModeSelector = ({ campaignId, currentMode, onChanged }: GoalModeSelectorProps) => {
  const [selected, setSelected] = useState<GoalMode>(currentMode)
  const [isSaving, setIsSaving] = useState(false)

  const handleSelect = async (mode: GoalMode) => {
    if (mode === currentMode || isSaving) return

    setSelected(mode)
    setIsSaving(true)

    try {
      const res = await fetch(`/api/ads/campaigns/${campaignId}/goal-mode`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal_mode: mode }),
      })

      if (res.ok) {
        onChanged(mode)
      } else {
        setSelected(currentMode)
      }
    } catch {
      setSelected(currentMode)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Goal Mode</h3>
      <div className="mt-3 grid grid-cols-4 gap-2">
        {GOAL_MODES.map((mode) => {
          const isActive = selected === mode.value
          return (
            <button
              key={mode.value}
              onClick={() => handleSelect(mode.value)}
              disabled={isSaving}
              className={`rounded-lg border p-3 text-left transition-all ${
                isActive
                  ? `${mode.color} ring-1 ring-offset-1`
                  : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
              } ${isSaving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold">{mode.label}</span>
                <span className="text-xs font-mono opacity-70">{mode.multiplier}</span>
              </div>
              <p className="mt-1 text-xs opacity-70">{mode.desc}</p>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export { GoalModeSelector }
