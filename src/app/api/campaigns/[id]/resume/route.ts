import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// POST /api/campaigns/:id/resume — 캠페인 재개
export const POST = withAuth(async (req, { params }) => {
  const { id } = params

  if (!id) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ID가 필요합니다.' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data: campaign, error: fetchError } = await supabase
    .from('campaigns')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !campaign) {
    return NextResponse.json(
      { error: { code: 'NOT_FOUND', message: '캠페인을 찾을 수 없습니다.' } },
      { status: 404 },
    )
  }

  if (campaign.status !== 'paused') {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: '일시 중지 상태인 캠페인만 재개할 수 있습니다.' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('campaigns')
    .update({ status: 'active' })
    .eq('id', id)
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor'])
