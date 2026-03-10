import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/br-templates — 전체 조회 (active만 또는 전체)
export const GET = withAuth(async (req) => {
  const supabase = await createClient()
  const showAll = req.nextUrl.searchParams.get('all') === 'true'

  let query = supabase
    .from('br_templates')
    .select('*')
    .order('code', { ascending: true })

  if (!showAll) {
    query = query.eq('active', true)
  }

  const { data, error } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ templates: data ?? [] })
}, ['owner', 'admin', 'editor', 'viewer'])

// POST /api/br-templates — 신규 생성
export const POST = withAuth(async (req) => {
  const supabase = await createClient()
  const body = await req.json() as {
    code: string
    category: string
    title: string
    body: string
    br_form_type: string
    instruction?: string
    violation_codes?: string[]
    placeholders?: string[]
  }

  if (!body.code || !body.category || !body.title || !body.body || !body.br_form_type) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'code, category, title, body, br_form_type required' } },
      { status: 400 },
    )
  }

  const { data, error } = await supabase
    .from('br_templates')
    .insert({
      code: body.code,
      category: body.category,
      title: body.title,
      body: body.body,
      br_form_type: body.br_form_type,
      instruction: body.instruction ?? null,
      violation_codes: body.violation_codes ?? [],
      placeholders: body.placeholders ?? [],
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ template: data }, { status: 201 })
}, ['owner', 'admin'])
