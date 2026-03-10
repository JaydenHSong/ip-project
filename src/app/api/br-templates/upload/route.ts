import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/middleware'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseBuffer } from '@/lib/br-template/parse-excel'

const ALLOWED_EXTENSIONS = ['.xlsx', '.xls', '.csv']
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024 // 5 MB

// POST /api/br-templates/upload — Excel/CSV bulk import
export const POST = withAuth(async (req) => {
  const contentType = req.headers.get('content-type') ?? ''
  if (!contentType.includes('multipart/form-data')) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Request must be multipart/form-data' } },
      { status: 400 },
    )
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'Failed to parse form data' } },
      { status: 400 },
    )
  }

  const file = formData.get('file')
  if (!file || !(file instanceof File)) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'No file provided. Use field name "file"' } },
      { status: 400 },
    )
  }

  const filename = file.name.toLowerCase()
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => filename.endsWith(ext))
  if (!hasAllowedExt) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: `File must be one of: ${ALLOWED_EXTENSIONS.join(', ')}` } },
      { status: 400 },
    )
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return NextResponse.json(
      { error: { code: 'VALIDATION_ERROR', message: 'File size must be under 5 MB' } },
      { status: 400 },
    )
  }

  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const { templates, errors } = parseBuffer(buffer, file.name)

  if (templates.length === 0) {
    return NextResponse.json(
      { error: { code: 'PARSE_ERROR', message: 'No valid rows found', details: errors } },
      { status: 422 },
    )
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('br_templates')
    .insert(
      templates.map((t) => ({
        code: t.code,
        category: t.category,
        title: t.title,
        body: t.body,
        br_form_type: t.br_form_type,
        instruction: t.instruction,
        violation_codes: t.violation_codes,
        placeholders: t.placeholders,
      })),
    )
    .select('id')

  if (error) {
    return NextResponse.json(
      { error: { code: 'DB_ERROR', message: error.message } },
      { status: 500 },
    )
  }

  return NextResponse.json(
    {
      imported: data?.length ?? 0,
      skipped: errors.length,
      errors: errors.length > 0 ? errors : undefined,
    },
    { status: 201 },
  )
}, ['owner', 'admin'])
