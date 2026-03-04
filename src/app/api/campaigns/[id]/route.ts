import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import type { UpdateCampaignRequest } from '@/types/api'

// GET /api/campaigns/:id — 캠페인 상세 (수집 현황 포함)
export const GET = withAuth(async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: campaign, error } = await supabase
    .from('campaigns')
    .select('*, users!campaigns_created_by_fkey(name, email)')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '캠페인을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  // 수집 현황 통계
  const { count: listingCount } = await supabase
    .from('campaign_listings')
    .select('*', { count: 'exact', head: true })
    .eq('campaign_id', id)

  const { count: suspectCount } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true })
    .eq('source_campaign_id', id)
    .eq('is_suspect', true)

  return NextResponse.json({
    ...campaign,
    stats: {
      total_listings: listingCount ?? 0,
      suspect_listings: suspectCount ?? 0,
    },
  })
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// PATCH /api/campaigns/:id — 캠페인 수정
export const PATCH = withAuth(async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()
  const body = (await req.json()) as UpdateCampaignRequest

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const updateData: Record<string, unknown> = {}
  if (body.keyword !== undefined) updateData.keyword = body.keyword
  if (body.marketplace !== undefined) updateData.marketplace = body.marketplace
  if (body.start_date !== undefined) updateData.start_date = body.start_date
  if (body.end_date !== undefined) updateData.end_date = body.end_date
  if (body.frequency !== undefined) updateData.frequency = body.frequency
  if (body.max_pages !== undefined) updateData.max_pages = body.max_pages
  if (body.status !== undefined) updateData.status = body.status

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '수정할 필드가 없습니다.' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json(
        { error: { code: 'NOT_FOUND', message: '캠페인을 찾을 수 없습니다.' } },
        { status: 404 },
      )
    }
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])

// DELETE /api/campaigns/:id — 캠페인 삭제 (Admin만)
export const DELETE = withAuth(async (req) => {
  const id = req.nextUrl.pathname.split('/').pop()

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('campaigns')
    .delete()
    .eq('id', id)

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ success: true })
}, ['owner', 'admin'])
