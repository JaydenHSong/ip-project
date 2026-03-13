import { NextRequest, NextResponse } from 'next/server'
import { withServiceAuth } from '@/lib/auth/service-middleware'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const VALID_LOG_TYPES = [
  'crawl_complete',
  'crawl_error',
  'proxy_ban',
  'captcha',
  'rate_limit',
  'api_error',
  'br_monitor',
  'br_submit',
  'br_reply',
] as const

// POST /api/crawler/logs — 크롤러가 로그 전송 (Service Token 인증)
export const POST = withServiceAuth(async (req) => {
  const body = await req.json() as Record<string, unknown>

  if (!body.type || !VALID_LOG_TYPES.includes(body.type as typeof VALID_LOG_TYPES[number])) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Required: type (crawl_complete|crawl_error|proxy_ban|captcha|rate_limit|api_error)' } },
      { status: 400 },
    )
  }

  const supabase = createAdminClient()

  const { data, error } = await supabase
    .from('crawler_logs')
    .insert({
      type: body.type as string,
      campaign_id: (body.campaign_id as string) ?? null,
      keyword: (body.keyword as string) ?? null,
      marketplace: (body.marketplace as string) ?? null,
      pages_crawled: (body.pages_crawled as number) ?? null,
      listings_found: (body.listings_found as number) ?? null,
      listings_sent: (body.listings_sent as number) ?? null,
      new_listings: (body.new_listings as number) ?? null,
      duplicates: (body.duplicates as number) ?? null,
      errors: (body.errors as number) ?? null,
      captchas: (body.captchas as number) ?? null,
      proxy_rotations: (body.proxy_rotations as number) ?? null,
      duration_ms: (body.duration_ms as number) ?? null,
      message: (body.message as string) ?? null,
      asin: (body.asin as string) ?? null,
      error_code: (body.error_code as string) ?? null,
    })
    .select('id')
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ ok: true, id: data.id }, { status: 201 })
})

// GET /api/crawler/logs — 로그 조회 (Admin 전용)
export const GET = withAuth(async (req) => {
  const { searchParams } = new URL(req.url)
  const type = searchParams.get('type')
  const keyword = searchParams.get('keyword')
  const days = parseInt(searchParams.get('days') ?? '7', 10)
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 100)
  const offset = (page - 1) * limit

  const sinceDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString()

  const supabase = createAdminClient()

  // 로그 목록 조회
  let query = supabase
    .from('crawler_logs')
    .select('*', { count: 'exact' })
    .gte('created_at', sinceDate)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (type) {
    query = query.eq('type', type)
  }
  if (keyword) {
    query = query.ilike('keyword', `%${keyword}%`)
  }

  // Summary 집계 (병렬 실행)
  const [logsResult, completeResult, errorResult, banResult, captchaResult] = await Promise.all([
    query,
    supabase
      .from('crawler_logs')
      .select('listings_found, new_listings')
      .eq('type', 'crawl_complete')
      .gte('created_at', sinceDate),
    supabase
      .from('crawler_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'crawl_error')
      .gte('created_at', sinceDate),
    supabase
      .from('crawler_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'proxy_ban')
      .gte('created_at', sinceDate),
    supabase
      .from('crawler_logs')
      .select('*', { count: 'exact', head: true })
      .eq('type', 'captcha')
      .gte('created_at', sinceDate),
  ])

  if (logsResult.error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: logsResult.error.message } },
      { status: 500 },
    )
  }

  // Summary 계산
  const completeRows = completeResult.data ?? []
  const totalListingsFound = completeRows.reduce((sum, r) => sum + (r.listings_found ?? 0), 0)
  const totalNewListings = completeRows.reduce((sum, r) => sum + (r.new_listings ?? 0), 0)

  const summary = {
    total_crawls: completeRows.length + (errorResult.count ?? 0),
    successful: completeRows.length,
    failed: errorResult.count ?? 0,
    total_listings_found: totalListingsFound,
    total_new_listings: totalNewListings,
    total_bans: banResult.count ?? 0,
    total_captchas: captchaResult.count ?? 0,
  }

  return NextResponse.json({
    logs: logsResult.data,
    summary,
    pagination: {
      page,
      limit,
      total: logsResult.count ?? 0,
      totalPages: Math.ceil((logsResult.count ?? 0) / limit),
    },
  })
}, ['owner', 'admin'])
