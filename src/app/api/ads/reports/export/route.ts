// POST /api/ads/reports/export — CSV export

import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdsAdminContext } from '@/lib/supabase/ads-context'
import { parseBody } from '@/lib/api/validate-body'
import { exportReportSchema } from '@/modules/ads/features/reports/schemas'

export const POST = withAuth(async (req) => {
  // Plan SC-3: Zod validation — required date fields + YYYY-MM-DD format enforced.
  const parsed = await parseBody(req, exportReportSchema)
  if (!parsed.success) return parsed.response
  const body = parsed.data

  try {
    const ctx = createAdsAdminContext()

    let query = ctx.ads
      .from(ctx.adsTable('report_snapshots'))
      .select('*')
      .eq('brand_market_id', body.brand_market_id)
      .gte('report_date', body.date_from)
      .lte('report_date', body.date_to)
      .order('report_date', { ascending: true })

    if (body.campaign_ids?.length) {
      query = query.in('campaign_id', body.campaign_ids)
    }

    const { data: rows, error } = await query

    if (error) throw error

    if (!rows?.length) {
      return NextResponse.json(
        { error: { code: 'NO_DATA', message: 'No data found for the specified date range' } },
        { status: 404 },
      )
    }

    // Build CSV
    const headers = Object.keys(rows[0])
    const csvLines = [
      headers.join(','),
      ...rows.map((row) =>
        headers.map((h) => {
          const val = (row as Record<string, unknown>)[h]
          const str = val == null ? '' : String(val)
          return str.includes(',') ? `"${str}"` : str
        }).join(','),
      ),
    ]
    const csv = csvLines.join('\n')

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="ads-report-${body.date_from}-${body.date_to}.csv"`,
      },
    })
  } catch (err) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: err instanceof Error ? err.message : 'Unknown error' } },
      { status: 500 },
    )
  }
}, ['viewer_plus', 'editor', 'admin', 'owner'])
