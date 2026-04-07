// S07 — Dayparting Schedule
// Design Ref: §5.3 S07
// 24h×7d Heatmap Grid + Group Selector + AI Schedule Strip + Group Status Table
'use client'

import { useState, useEffect, useCallback } from 'react'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { DaypartingGroup, HeatmapCell, DaypartingGroupStatus } from '../types'

type DaypartingScheduleProps = {
  brandMarketId: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const getWeightColor = (weight: number): string => {
  if (weight === 0) return 'bg-th-bg-tertiary'
  if (weight < 0.3) return 'bg-th-bg-tertiary'
  if (weight < 0.6) return 'bg-gray-400'
  if (weight < 0.8) return 'bg-th-bg-tertiary'
  return 'bg-th-bg-tertiary'
}

const DaypartingSchedule = ({ brandMarketId }: DaypartingScheduleProps) => {
  const [groups, setGroups] = useState<DaypartingGroup[]>([])
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetch_ = async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/ads/dayparting/schedules?brand_market_id=${brandMarketId}`)
        if (res.ok) {
          const json = await res.json() as { data: DaypartingGroup[] }
          setGroups(json.data ?? [])
          if (json.data?.length > 0) setSelectedGroup(json.data[0].id)
        }
      } catch { /* API not ready */ }
      finally { setIsLoading(false) }
    }
    fetch_()
  }, [brandMarketId])

  const currentGroup = groups.find((g) => g.id === selectedGroup)
  const currentHour = new Date().getHours()
  const currentDay = new Date().getDay()

  const handleToggleGroup = useCallback(async () => {
    if (!currentGroup) return
    const updated = { ...currentGroup, is_enabled: !currentGroup.is_enabled }
    setGroups((prev) => prev.map((g) => g.id === updated.id ? updated : g))
    try {
      await fetch(`/api/ads/dayparting/schedules/${currentGroup.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_enabled: updated.is_enabled }),
      })
    } catch { /* silent */ }
  }, [currentGroup])

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />

  // Build group status data from existing groups
  const groupStatusData: DaypartingGroupStatus[] = groups.map((g) => ({
    id: g.id,
    group_name: g.group_name,
    campaign_count: g.campaign_count,
    is_enabled: g.is_enabled,
    active_hours: g.heatmap.filter((c) => c.weight > 0).length,
    total_hours: 168,
    last_updated: new Date().toISOString(),
  }))

  return (
    <div className="space-y-6">
      {/* Phase 1 Notice — Design S07 */}
      <div className="rounded-md border border-th-border bg-th-bg-hover p-3">
        <div className="flex items-center gap-2">
          <svg className="h-4 w-4 shrink-0 text-th-text-muted" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="8" cy="8" r="6" />
            <path d="M8 5V8.5" strokeLinecap="round" />
            <circle cx="8" cy="11" r="0.5" fill="currentColor" />
          </svg>
          <p className="text-xs text-th-text-muted">
            Phase 1: Orders DB 기반 추정값입니다. Marketing Stream 연동 시 실시간 데이터로 전환됩니다.
          </p>
        </div>
      </div>

      {/* Group Selector + ON/OFF Toggle + Campaign Count — Design S07 */}
      {groups.length > 0 ? (
        <div className="flex items-center gap-3">
          <select
            value={selectedGroup ?? ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_name}
              </option>
            ))}
          </select>

          {/* Campaign count badge */}
          {currentGroup && (
            <span className="rounded bg-th-bg-tertiary px-2 py-0.5 text-xs font-medium text-th-text-secondary">
              {currentGroup.campaign_count} campaign{currentGroup.campaign_count !== 1 ? 's' : ''}
            </span>
          )}

          {/* ON/OFF Toggle Button — Design S07 */}
          {currentGroup && (
            <button
              onClick={handleToggleGroup}
              className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                currentGroup.is_enabled ? 'bg-emerald-500' : 'bg-th-text-muted'
              }`}
              role="switch"
              aria-checked={currentGroup.is_enabled}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-surface-card shadow ring-0 transition duration-200 ease-in-out ${
                  currentGroup.is_enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          )}
          {currentGroup && (
            <span className={`text-xs font-medium ${currentGroup.is_enabled ? 'text-emerald-700' : 'text-th-text-muted'}`}>
              {currentGroup.is_enabled ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
      ) : (
        <EmptyState title="No dayparting groups" description="Create a group to manage time-based bid adjustments." />
      )}

      {/* 24h×7d Heatmap — Design S07 */}
      {currentGroup && (
        <div className="rounded-lg border border-th-border bg-surface-card p-4">
          <h3 className="text-sm font-medium text-th-text mb-3">Schedule Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10" />
                  {HOURS.map((h) => (
                    <th key={h} className="text-[9px] text-th-text-muted text-center px-0 w-5">
                      {h % 4 === 0 ? `${h}` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIdx) => (
                  <tr key={day}>
                    <td className="text-[10px] text-th-text-muted pr-2 font-medium">{day}</td>
                    {HOURS.map((hour) => {
                      const cell = currentGroup.heatmap.find((c: HeatmapCell) => c.day === dayIdx && c.hour === hour)
                      const weight = cell?.weight ?? 0
                      const isNow = dayIdx === currentDay && hour === currentHour
                      return (
                        <td key={hour} className="px-0 py-0">
                          <div
                            className={`h-4 w-full ${getWeightColor(weight)} ${
                              isNow ? 'ring-2 ring-orange-500 ring-inset' : ''
                            }`}
                            title={`${day} ${hour}:00 — weight: ${weight.toFixed(2)}`}
                          />
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Heatmap Legend */}
          <div className="flex items-center gap-1 mt-3">
            <span className="text-[9px] text-th-text-muted mr-1">Low</span>
            <div className="h-2.5 w-4 rounded-sm bg-th-bg-tertiary" />
            <div className="h-2.5 w-4 rounded-sm bg-th-bg-tertiary" />
            <div className="h-2.5 w-4 rounded-sm bg-gray-400" />
            <div className="h-2.5 w-4 rounded-sm bg-th-bg-tertiary" />
            <div className="h-2.5 w-4 rounded-sm bg-th-bg-tertiary" />
            <span className="text-[9px] text-th-text-muted ml-1">High</span>
            <div className="ml-3 flex items-center gap-1">
              <div className="h-2.5 w-4 rounded-sm ring-2 ring-orange-500 ring-inset" />
              <span className="text-[9px] text-th-text-muted">Now</span>
            </div>
          </div>

          {/* AI Schedule Strip — Design S07: "#18181B 다크 바, Apply/Adjust" */}
          {currentGroup.ai_recommended && (
            <div className="mt-4 flex items-center justify-between rounded-lg bg-[#18181B] px-4 py-3">
              <div className="flex items-center gap-2">
                <svg className="h-4 w-4 text-orange-500" viewBox="0 0 16 16" fill="none">
                  <path d="M8 1L10 5.5L15 6.5L11.5 10L12.5 15L8 12.5L3.5 15L4.5 10L1 6.5L6 5.5L8 1Z" fill="currentColor" />
                </svg>
                <span className="text-xs font-medium text-white">AI recommends a different schedule</span>
                <span className="text-[10px] text-th-text-muted">Based on last 30d conversion data</span>
              </div>
              <div className="flex gap-2">
                <button className="rounded-md bg-orange-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-600">
                  Apply AI Schedule
                </button>
                <button className="rounded-md bg-th-bg-tertiary px-3 py-1.5 text-xs text-th-text-muted hover:bg-th-bg-hover">
                  Adjust
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Group Status Table — Design S07 */}
      {groups.length > 0 && (
        <div className="rounded-lg border border-th-border bg-surface-card p-4">
          <h3 className="text-sm font-medium text-th-text mb-3">Group Status</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-th-border">
                  <th className="pb-2 text-[11px] font-medium text-th-text-muted uppercase tracking-wide">Group</th>
                  <th className="pb-2 text-[11px] font-medium text-th-text-muted uppercase tracking-wide">Campaigns</th>
                  <th className="pb-2 text-[11px] font-medium text-th-text-muted uppercase tracking-wide">Status</th>
                  <th className="pb-2 text-[11px] font-medium text-th-text-muted uppercase tracking-wide">Active Hours</th>
                  <th className="pb-2 text-[11px] font-medium text-th-text-muted uppercase tracking-wide">Coverage</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-th-border">
                {groupStatusData.map((gs) => {
                  const coverage = gs.total_hours > 0 ? (gs.active_hours / gs.total_hours) * 100 : 0
                  return (
                    <tr key={gs.id} className="hover:bg-th-bg-hover">
                      <td className="py-2 text-xs font-medium text-th-text">{gs.group_name}</td>
                      <td className="py-2 text-xs text-th-text-secondary">{gs.campaign_count}</td>
                      <td className="py-2">
                        <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                          gs.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-th-bg-tertiary text-th-text-muted'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${gs.is_enabled ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          {gs.is_enabled ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-2 text-xs text-th-text-secondary">{gs.active_hours} / {gs.total_hours}</td>
                      <td className="py-2">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full bg-th-bg-tertiary">
                            <div
                              className="h-1.5 rounded-full bg-th-text"
                              style={{ width: `${Math.min(coverage, 100)}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-th-text-muted">{coverage.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

export { DaypartingSchedule }
