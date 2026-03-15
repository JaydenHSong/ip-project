// Prompt Manager — DB에서 프롬프트 로딩 (캐시 + fallback)

import { createClient } from '@/lib/supabase/server'

export type PromptType =
  | 'system'
  | 'tone-suggest'
  | 'crawler-violation-scan'
  | 'crawler-thumbnail-scan'

type PromptVersion = {
  id: string
  prompt_type: string
  version: number
  content: string
  is_active: boolean
  accuracy_score: number | null
  sample_count: number
  created_by: string
  created_at: string
  metadata: Record<string, unknown>
}

type CacheEntry = {
  content: string
  version: number
  fetchedAt: number
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const cache = new Map<PromptType, CacheEntry>()

const getActive = async (type: PromptType): Promise<{ content: string; version: number } | null> => {
  // Check cache
  const cached = cache.get(type)
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
    return { content: cached.content, version: cached.version }
  }

  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('ai_prompts')
      .select('content, version')
      .eq('prompt_type', type)
      .eq('is_active', true)
      .single()

    if (error || !data) return null

    // Update cache
    cache.set(type, {
      content: data.content,
      version: data.version,
      fetchedAt: Date.now(),
    })

    return { content: data.content, version: data.version }
  } catch {
    return null
  }
}

const save = async (
  type: PromptType,
  content: string,
  createdBy: string,
  metadata?: Record<string, unknown>,
): Promise<{ version: number }> => {
  const supabase = await createClient()

  // Get next version number
  const { data: latest } = await supabase
    .from('ai_prompts')
    .select('version')
    .eq('prompt_type', type)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  const nextVersion = (latest?.version ?? 0) + 1

  const { error } = await supabase
    .from('ai_prompts')
    .insert({
      prompt_type: type,
      version: nextVersion,
      content,
      is_active: false,
      created_by: createdBy,
      metadata: metadata ?? {},
    })

  if (error) throw new Error(`Failed to save prompt: ${error.message}`)

  return { version: nextVersion }
}

const activate = async (type: PromptType, version: number): Promise<void> => {
  const supabase = await createClient()

  // Deactivate all versions of this type
  await supabase
    .from('ai_prompts')
    .update({ is_active: false })
    .eq('prompt_type', type)

  // Activate the specified version
  const { error } = await supabase
    .from('ai_prompts')
    .update({ is_active: true })
    .eq('prompt_type', type)
    .eq('version', version)

  if (error) throw new Error(`Failed to activate prompt: ${error.message}`)

  // Invalidate cache
  cache.delete(type)
}

const rollback = async (type: PromptType): Promise<{ version: number }> => {
  const supabase = await createClient()

  // Get current active version
  const { data: active } = await supabase
    .from('ai_prompts')
    .select('version')
    .eq('prompt_type', type)
    .eq('is_active', true)
    .single()

  if (!active) throw new Error('No active prompt to rollback from')

  // Find previous version
  const { data: previous } = await supabase
    .from('ai_prompts')
    .select('version')
    .eq('prompt_type', type)
    .lt('version', active.version)
    .order('version', { ascending: false })
    .limit(1)
    .single()

  if (!previous) throw new Error('No previous version to rollback to')

  await activate(type, previous.version)
  return { version: previous.version }
}

const getHistory = async (type: PromptType): Promise<PromptVersion[]> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_prompts')
    .select('*')
    .eq('prompt_type', type)
    .order('version', { ascending: false })

  if (error) throw new Error(`Failed to fetch history: ${error.message}`)
  return (data ?? []) as PromptVersion[]
}

const clearCache = (type?: PromptType): void => {
  if (type) {
    cache.delete(type)
  } else {
    cache.clear()
  }
}

export const promptManager = {
  getActive,
  save,
  activate,
  rollback,
  getHistory,
  clearCache,
}
