// /ads/autopilot/[id] → S09 Auto Pilot Detail
// Design Ref: §2.2 — Track C
'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { use } from 'react'
import { AutopilotDetail } from '@/modules/ads/features/autopilot/components/autopilot-detail'
import type { AutopilotCampaignItem, ActivityLogEntry } from '@/modules/ads/features/autopilot/types'

const AutopilotDetailPage = ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = use(params)
  const router = useRouter()
  const [campaign, setCampaign] = useState<AutopilotCampaignItem | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    try {
      // Fetch campaign detail
      const campRes = await fetch(`/api/ads/campaigns/${id}`)
      if (campRes.ok) {
        const campJson = await campRes.json() as { data: AutopilotCampaignItem & { marketplace_profile_id?: string } }
        setCampaign(campJson.data)
        if (campJson.data.marketplace_profile_id) {
          setProfileId(campJson.data.marketplace_profile_id)
        }
      }

      // Fetch activity log
      const logRes = await fetch(`/api/ads/autopilot/${id}`)
      if (logRes.ok) {
        const logJson = await logRes.json() as { data: { activity_log: ActivityLogEntry[] } }
        setActivityLog(logJson.data.activity_log)
      }
    } catch (err) {
      // L1 fix: log fetch failures
      console.error('[ads/autopilot/[id]] fetch failed', err)
    }
    finally { setIsLoading(false) }
  }, [id])

  useEffect(() => { fetchData() }, [fetchData])

  const handlePause = async () => {
    await fetch(`/api/ads/campaigns/${id}`, {
      // L3 fix: PATCH is the RESTful verb for partial updates
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paused' }),
    })
    await fetchData()
  }

  const handleRollback = async (logIds: string[]) => {
    await fetch(`/api/ads/autopilot/${id}/rollback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ log_ids: logIds }),
    })
    await fetchData()
  }

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 animate-pulse rounded-lg border border-th-border bg-th-bg-hover" />
        ))}
      </div>
    )
  }

  if (!campaign) {
    return (
      <div className="p-6 text-center py-12">
        <p className="text-sm text-th-text-muted">Campaign not found</p>
        <button onClick={() => router.push('/ads/autopilot')} className="mt-2 text-sm text-orange-500 hover:text-orange-600">
          Back to Auto Pilot
        </button>
      </div>
    )
  }

  return (
    <div className="p-6">
      <AutopilotDetail
        campaign={campaign}
        activityLog={activityLog}
        profileId={profileId ?? undefined}
        onPause={handlePause}
        onRollback={handleRollback}
        onGoalModeChanged={() => fetchData()}
        onBack={() => router.push('/ads/autopilot')}
      />
    </div>
  )
}

export default AutopilotDetailPage
