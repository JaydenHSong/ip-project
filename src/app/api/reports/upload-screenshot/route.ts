import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

// POST /api/reports/upload-screenshot — 스크린샷 업로드 to Supabase Storage
export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File is required.' } },
      { status: 400 },
    )
  }

  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File size must be under 5MB.' } },
      { status: 400 },
    )
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Only JPEG, PNG, WebP allowed.' } },
      { status: 400 },
    )
  }

  const ext = file.type.split('/')[1] === 'jpeg' ? 'jpg' : file.type.split('/')[1]
  const fileName = `screenshots/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(fileName, buffer, {
      contentType: file.type,
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: { code: 'UPLOAD_ERROR', message: uploadError.message } },
      { status: 500 },
    )
  }

  const { data: urlData } = supabase.storage
    .from('reports')
    .getPublicUrl(fileName)

  return NextResponse.json({ screenshot_url: urlData.publicUrl })
}, ['owner', 'admin', 'editor'])
