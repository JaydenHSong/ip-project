import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createClient } from '@/lib/supabase/server'

// GET /api/patents — IP 자산 목록
export const GET = withAuth(async (req) => {
  const url = req.nextUrl
  const page = Number(url.searchParams.get('page')) || 1
  const limit = Math.min(Number(url.searchParams.get('limit')) || 20, 100)
  const offset = (page - 1) * limit
  const ipType = url.searchParams.get('type')
  const status = url.searchParams.get('status')
  const country = url.searchParams.get('country')
  const search = url.searchParams.get('search')
  const sort = url.searchParams.get('sort') || 'created_at'
  const order = url.searchParams.get('order') || 'desc'

  const supabase = await createClient()

  let query = supabase
    .from('ip_assets')
    .select('*', { count: 'exact' })
    .order(sort, { ascending: order === 'asc' })
    .range(offset, offset + limit - 1)

  if (ipType) {
    query = query.eq('ip_type', ipType)
  }
  if (status) {
    query = query.eq('status', status)
  }
  if (country) {
    query = query.eq('country', country)
  }
  if (search) {
    query = query.or(
      `management_number.ilike.%${search}%,name.ilike.%${search}%`,
    )
  }

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({
    data,
    pagination: {
      page,
      limit,
      total: count ?? 0,
      totalPages: Math.ceil((count ?? 0) / limit),
    },
  })
}, ['admin', 'editor', 'viewer'])

// POST /api/patents — IP 자산 등록 (Admin 전용)
export const POST = withAuth(async (req) => {
  const body = await req.json() as {
    ip_type?: string
    management_number?: string
    name?: string
    description?: string | null
    country?: string
    status?: string
    application_number?: string | null
    application_date?: string | null
    registration_number?: string | null
    registration_date?: string | null
    expiry_date?: string | null
    keywords?: string[]
    image_urls?: string[]
    related_products?: string[]
    report_url?: string | null
    assignee?: string | null
    notes?: string | null
  }

  if (!body.management_number || !body.name || !body.ip_type) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'ip_type, management_number, and name are required' } },
      { status: 400 },
    )
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ip_assets')
    .insert({
      ip_type: body.ip_type,
      management_number: body.management_number,
      name: body.name,
      description: body.description || null,
      country: body.country || 'US',
      status: body.status || 'filed',
      application_number: body.application_number || null,
      application_date: body.application_date || null,
      registration_number: body.registration_number || null,
      registration_date: body.registration_date || null,
      expiry_date: body.expiry_date || null,
      keywords: body.keywords || [],
      image_urls: body.image_urls || [],
      related_products: body.related_products || [],
      report_url: body.report_url || null,
      assignee: body.assignee || null,
      notes: body.notes || null,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ data }, { status: 201 })
}, ['admin'])
