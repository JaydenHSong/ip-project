// GET /api/ads/amazon/debug-report — Debug: raw Amazon report API test
// Temporary endpoint for troubleshooting. Remove after sync is verified.

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminClient } from '@/lib/supabase/admin'
import { tokenStore } from '@/modules/ads/api/infra/token-store'

export const GET = withAuth(async (req: Request) => {
  const url = new URL(req.url)
  const supabase = createAdsAdminClient()

  // 1. Get first active profile
  const { data: profiles } = await supabase
    .from('marketplace_profiles')
    .select('ads_profile_id')
    .eq('is_active', true)
    .not('ads_profile_id', 'is', null)
    .limit(1)

  const profileId = profiles?.[0]?.ads_profile_id as string
  if (!profileId) {
    return NextResponse.json({ error: 'No active profile found' })
  }

  // 2. Get access token
  let accessToken: string
  try {
    accessToken = await tokenStore.getAccessToken(profileId)
  } catch (err) {
    return NextResponse.json({ step: 'getToken', error: String(err) })
  }

  const headers = {
    'Amazon-Advertising-API-ClientId': process.env.AMAZON_CLIENT_ID ?? '',
    'Amazon-Advertising-API-Scope': profileId,
    'Authorization': `Bearer ${accessToken}`,
  }

  // Amazon reporting data has 2-3 day delay. Use 3 days ago.
  const reportDate = new Date()
  reportDate.setDate(reportDate.getDate() - 3)
  const dateStr = reportDate.toISOString().split('T')[0]

  // 3. Check the already-completed report and compare with local DB
  const completedReportId = url.searchParams.get('id')
  if (!completedReportId) {
    return NextResponse.json({
      error: 'Pass ?id=<reportId> of a COMPLETED report to debug matching',
      hint: 'Use /api/ads/amazon/check-report?id=xxx to find a COMPLETED report first',
    })
  }

  // 3a. Get report status & download URL
  const statusRes = await fetch(`https://advertising-api.amazon.com/reporting/reports/${completedReportId}`, {
    headers: {
      ...headers,
      'Content-Type': 'application/vnd.createasyncreportrequest.v3+json',
    },
  })
  const reportStatus = await statusRes.json() as Record<string, unknown>

  if (reportStatus.status !== 'COMPLETED' || !reportStatus.url) {
    return NextResponse.json({ error: 'Report not completed', reportStatus })
  }

  // 3b. Download and decompress report data
  const { gunzipSync } = await import('node:zlib')
  const dataRes = await fetch(String(reportStatus.url))
  const buffer = Buffer.from(await dataRes.arrayBuffer())
  const decompressed = gunzipSync(buffer)
  const rows = JSON.parse(decompressed.toString()) as Array<Record<string, unknown>>

  // 3c. Get local campaign amazon_campaign_ids
  const { data: localCampaigns } = await supabase
    .from('campaigns')
    .select('id, amazon_campaign_id')
    .not('amazon_campaign_id', 'is', null)
    .limit(10)

  // 3d. Compare
  const sampleReportIds = rows.slice(0, 5).map(r => ({
    campaignId: r.campaignId,
    type: typeof r.campaignId,
    impressions: r.impressions,
    clicks: r.clicks,
    cost: r.cost,
  }))

  const sampleLocalIds = (localCampaigns ?? []).map(c => ({
    id: c.id,
    amazon_campaign_id: c.amazon_campaign_id,
    type: typeof c.amazon_campaign_id,
  }))

  // Check if any match
  const localIdSet = new Set((localCampaigns ?? []).map(c => String(c.amazon_campaign_id)))
  const reportIdSet = new Set(rows.map(r => String(r.campaignId)))
  const matched = [...localIdSet].filter(id => reportIdSet.has(id))

  return NextResponse.json({
    profileId,
    reportId: completedReportId,
    totalReportRows: rows.length,
    sampleReportIds,
    totalLocalCampaigns: localCampaigns?.length ?? 0,
    sampleLocalIds,
    matchedCount: matched.length,
    sampleMatched: matched.slice(0, 5),
  })
}, ['owner'])

export const maxDuration = 120
