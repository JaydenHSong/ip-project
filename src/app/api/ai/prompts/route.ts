import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/auth/session'

// GET /api/ai/prompts — all prompt versions grouped by type
export const GET = async (): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ai_prompts')
    .select('*')
    .order('prompt_type')
    .order('version', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Group by prompt_type
  const grouped: Record<string, typeof data> = {}
  for (const row of data ?? []) {
    if (!grouped[row.prompt_type]) grouped[row.prompt_type] = []
    grouped[row.prompt_type].push(row)
  }

  return NextResponse.json(grouped)
}
