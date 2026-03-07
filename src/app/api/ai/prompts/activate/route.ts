import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { promptManager, type PromptType } from '@/lib/ai/prompt-manager'

// POST /api/ai/prompts/activate — activate a specific prompt version
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  const user = await getCurrentUser()
  if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json() as { prompt_type: string; version: number }
  const { prompt_type, version } = body

  if (!prompt_type || !version) {
    return NextResponse.json({ error: 'prompt_type and version required' }, { status: 400 })
  }

  try {
    await promptManager.activate(prompt_type as PromptType, version)
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
