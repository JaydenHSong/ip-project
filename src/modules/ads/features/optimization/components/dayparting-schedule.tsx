// S07 — Dayparting Schedule
// Design Ref: §5.3 S07
// 24h×7d Heatmap Grid + Group Selector + AI Schedule Strip
'use client'

import { useState, useEffect } from 'react'
import { EmptyState } from '@/modules/ads/shared/components/empty-state'
import type { DaypartingGroup, HeatmapCell } from '../types'

type DaypartingScheduleProps = {
  brandMarketId: string
}

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const HOURS = Array.from({ length: 24 }, (_, i) => i)

const getWeightColor = (weight: number): string => {
  if (weight === 0) return 'bg-gray-100'
  if (weight < 0.3) return 'bg-gray-200'
  if (weight < 0.6) return 'bg-gray-400'
  if (weight < 0.8) return 'bg-gray-600'
  return 'bg-gray-800'
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

  if (isLoading) return <div className="h-64 animate-pulse rounded-lg border border-gray-200 bg-gray-50" />

  return (
    <div className="space-y-6">
      {/* Phase 1 Notice — Design S07 */}
      <div className="rounded-md border border-gray-200 bg-gray-50 p-3">
        <p className="text-xs text-gray-500">
          Phase 1: Orders DB 기반 추정값입니다. Marketing Stream 연동 시 실시간 데이터로 전환됩니다.
        </p>
      </div>

      {/* Group Selector — Design S07 */}
      {groups.length > 0 ? (
        <div className="flex items-center gap-3">
          <select
            value={selectedGroup ?? ''}
            onChange={(e) => setSelectedGroup(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.group_name} ({g.campaign_count} campaigns)
              </option>
            ))}
          </select>
          {currentGroup && (
            <span className={`rounded px-2 py-0.5 text-xs font-medium ${
              currentGroup.is_enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {currentGroup.is_enabled ? 'ON' : 'OFF'}
            </span>
          )}
        </div>
      ) : (
        <EmptyState title="No dayparting groups" description="Create a group to manage time-based bid adjustments." />
      )}

      {/* 24h×7d Heatmap — Design S07 */}
      {currentGroup && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Schedule Heatmap</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="w-10" />
                  {HOURS.map((h) => (
                    <th key={h} className="text-[9px] text-gray-400 text-center px-0 w-5">
                      {h % 4 === 0 ? `${h}` : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAYS.map((day, dayIdx) => (
                  <tr key={day}>
                    <td className="text-[10px] text-gray-500 pr-2 font-medium">{day}</td>
                    {HOURS.map((hour) => {
                      const cell = currentGroup.heatmap.find((c) => c.day === dayIdx && c.hour === hour)
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

          {/* AI Schedule Strip — Design S07: "#18181B 다크 바" */}
          {currentGroup.ai_recommended && (
            <div className="mt-3 flex items-center justify-between rounded-lg bg-gray-900 px-4 py-2.5">
              <span className="text-xs text-gray-300">AI recommends a different schedule</span>
              <div className="flex gap-2">
                <button className="rounded bg-orange-500 px-3 py-1 text-xs font-medium text-white hover:bg-orange-600">
                  Apply AI Schedule
                </button>
                <button className="rounded bg-gray-700 px-3 py-1 text-xs text-gray-300 hover:bg-gray-600">
                  Adjust
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export { DaypartingSchedule }
