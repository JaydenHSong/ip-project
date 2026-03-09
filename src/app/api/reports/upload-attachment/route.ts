import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB per file

// POST /api/reports/upload-attachment — BR 답장 첨부파일 업로드
export const POST = withAuth(async (req: NextRequest) => {
  const formData = await req.formData()
  const file = formData.get('file') as File | null

  if (!file) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File is required.' } },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File size must be under 10MB.' } },
      { status: 400 },
    )
  }

  // 파일명에서 확장자 추출
  const originalName = file.name || 'file'
  const ext = originalName.includes('.') ? originalName.split('.').pop() : 'bin'
  const storagePath = `br-reply-attachments/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`

  const supabase = createAdminClient()
  const buffer = Buffer.from(await file.arrayBuffer())

  const { error: uploadError } = await supabase.storage
    .from('reports')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })

  if (uploadError) {
    return NextResponse.json(
      { error: { code: 'UPLOAD_ERROR', message: uploadError.message } },
      { status: 500 },
    )
  }

  return NextResponse.json({ storagePath })
}, ['owner', 'admin', 'editor'])
