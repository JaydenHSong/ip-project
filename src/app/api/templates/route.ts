import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_TEMPLATES } from '@/lib/demo/data'

// GET /api/templates — 템플릿 목록 (필터 지원)
export const GET = withAuth(async (req) => {
  const { searchParams } = req.nextUrl
  const category = searchParams.get('category')
  const violationType = searchParams.get('violation_type')
  const marketplace = searchParams.get('marketplace')
  const search = searchParams.get('search')
  const limit = searchParams.get('limit')

  if (isDemoMode()) {
    let filtered = [...DEMO_TEMPLATES]
    if (category) {
      filtered = filtered.filter((t) => t.category === category)
    }
    if (violationType) {
      filtered = filtered.filter((t) => t.violation_types.includes(violationType))
    }
    if (marketplace) {
      filtered = filtered.filter(
        (t) => t.marketplace.length === 0 || t.marketplace.includes(marketplace),
      )
    }
    if (search) {
      const q = search.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(q) ||
          t.body.toLowerCase().includes(q) ||
          t.tags.some((tag) => tag.toLowerCase().includes(q)),
      )
    }
    // is_default first, then by usage_count desc
    filtered.sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1
      return b.usage_count - a.usage_count
    })
    if (limit) filtered = filtered.slice(0, Number(limit))
    return NextResponse.json(filtered)
  }

  const supabase = await createClient()
  let query = supabase.from('report_templates').select('*')

  if (category) query = query.eq('category', category)
  if (violationType) query = query.contains('violation_types', [violationType])
  if (marketplace) {
    query = query.or(`marketplace.cs.{${marketplace}},marketplace.eq.{}`)
  }
  if (search) query = query.or(`title.ilike.%${search}%,body.ilike.%${search}%`)

  query = query.order('is_default', { ascending: false }).order('usage_count', { ascending: false })

  if (limit) query = query.limit(Number(limit))

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data)
}, ['owner', 'admin', 'editor', 'viewer_plus', 'viewer'])

// POST /api/templates — 템플릿 생성
export const POST = withAuth(async (req) => {
  const body = await req.json()
  const { title, body: templateBody, category, violation_types, marketplace, tags, is_default } =
    body as {
      title?: string
      body?: string
      category?: string
      violation_types?: string[]
      marketplace?: string[]
      tags?: string[]
      is_default?: boolean
    }

  if (!title?.trim() || !templateBody?.trim()) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Title and body are required.' } },
      { status: 400 },
    )
  }

  if (isDemoMode()) {
    return NextResponse.json({
      id: `tmpl-${Date.now()}`,
      title: title.trim(),
      body: templateBody.trim(),
      category: category ?? null,
      violation_types: violation_types ?? [],
      marketplace: marketplace ?? [],
      tags: tags ?? [],
      is_default: is_default ?? false,
      usage_count: 0,
      created_by: 'demo-user-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
  }

  const supabase = await createClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  const { data, error } = await supabase
    .from('report_templates')
    .insert({
      title: title.trim(),
      body: templateBody.trim(),
      category: category ?? null,
      violation_types: violation_types ?? [],
      marketplace: marketplace ?? [],
      tags: tags ?? [],
      is_default: is_default ?? false,
      created_by: authUser!.id,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(data, { status: 201 })
}, ['owner', 'admin', 'editor'])
