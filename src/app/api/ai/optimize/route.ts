import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth/session'
import { optimizePrompt, checkAndRollback } from '@/lib/ai/prompt-optimizer'
import type { PromptType } from '@/lib/ai/prompt-manager'
import { createClient } from '@/lib/supabase/server'

const OPTIMIZABLE_TYPES: PromptType[] = ['system', 'analyze', 'draft']

// POST /api/ai/optimize — Vercel Cron or manual trigger
export const POST = async (request: NextRequest): Promise<NextResponse> => {
  // Cron auth: Vercel sends CRON_SECRET header
  const cronSecret = request.headers.get('authorization')
  const isCron = cronSecret === `Bearer ${process.env.CRON_SECRET}`

  if (!isCron) {
    // Manual trigger: require admin
    const user = await getCurrentUser()
    if (!user || (user.role !== 'owner' && user.role !== 'admin')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  // Check if auto-optimization is enabled
  const supabase = await createClient()
  const { data: settings } = await supabase
    .from('ai_prompts')
    .select('metadata')
    .eq('prompt_type', 'system')
    .eq('is_active', true)
    .single()

  const autoOptimize = (settings?.metadata as Record<string, unknown>)?.auto_optimize !== false

  if (!autoOptimize && isCron) {
    return NextResponse.json({ message: 'Auto-optimization disabled', results: [] })
  }

  const results = []

  for (const type of OPTIMIZABLE_TYPES) {
    // First check if rollback is needed
    const rollbackResult = await checkAndRollback(type)
    if (rollbackResult.status === 'optimized') {
      results.push(rollbackResult)
      continue
    }

    // Then try optimization
    const result = await optimizePrompt(type)
    results.push(result)

    // Send notification if optimized or needs approval
    if (result.status === 'optimized' || result.status === 'needs_approval') {
      await supabase.from('notifications').insert({
        type: 'ai_prompt_update',
        title: result.status === 'needs_approval'
          ? `AI Prompt needs approval: ${result.promptType}`
          : `AI Prompt optimized: ${result.promptType}`,
        message: result.message,
        metadata: {
          prompt_type: result.promptType,
          new_version: result.newVersion,
          changes: result.changes,
          status: result.status,
        },
      })
    }
  }

  return NextResponse.json({ results })
}
