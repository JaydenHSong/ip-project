import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'

// POST /api/campaigns/[id]/force-run — Trigger immediate crawl (admin+)
export const POST = withAuth(async (req: NextRequest, { params }) => {
  const campaignId = params.id

  if (isDemoMode()) {
    return NextResponse.json({ success: true, jobId: 'demo-job-001' })
  }

  const supabase = await createClient()

  // Fetch campaign details
  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('id, keyword, marketplace, max_pages, status')
    .eq('id', campaignId)
    .single()

  if (error || !campaign) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: 'Campaign not found.' } },
      { status: 404 },
    )
  }

  if (campaign.status !== 'active') {
    return NextResponse.json(
      { error: { code: 'INACTIVE', message: 'Campaign is not active.' } },
      { status: 400 },
    )
  }

  // Send trigger to crawler
  const crawlerUrl = process.env.CRAWLER_HEALTH_URL
  const serviceToken = process.env.CRAWLER_SERVICE_TOKEN

  if (!crawlerUrl) {
    return NextResponse.json(
      { error: { code: 'NOT_CONFIGURED', message: 'Crawler URL not configured.' } },
      { status: 503 },
    )
  }

  try {
    const res = await fetch(`${crawlerUrl}/trigger`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(serviceToken ? { 'Authorization': `Bearer ${serviceToken}` } : {}),
      },
      body: JSON.stringify({
        campaignId: campaign.id,
        keyword: campaign.keyword,
        marketplace: campaign.marketplace,
        maxPages: campaign.max_pages,
      }),
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: { code: 'CRAWLER_ERROR', message: `Crawler responded: ${body}` } },
        { status: 502 },
      )
    }

    const result = await res.json() as { success: boolean; jobId?: string }
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Connection failed'
    return NextResponse.json(
      { error: { code: 'CRAWLER_UNREACHABLE', message } },
      { status: 502 },
    )
  }
}, ['owner', 'admin'])
