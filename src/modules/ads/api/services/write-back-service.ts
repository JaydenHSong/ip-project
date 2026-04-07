// Design Ref: §5.2 — WriteBackService (Action → Amazon dispatcher)
// Plan SC: Approve→Amazon 반영 <30초

import type { SupabaseClient } from '@supabase/supabase-js'
import type { AdsPort } from '../ports/ads-port'
import { checkGuardrails } from '@/modules/ads/engine/guardrails'
import type { GuardrailCheckParams } from '@/modules/ads/engine/types'

export type WriteBackAction = {
  type: 'bid_adjust' | 'budget_adjust' | 'campaign_state' | 'keyword_add' | 'keyword_negate'
  campaign_id: string
  keyword_id?: string
  ad_group_id?: string
  current_value: number
  proposed_value: number
  details: Record<string, unknown>
}

export type WriteBackResult = {
  applied: boolean
  reason?: string
  guardrail_blocked?: boolean
  guardrail_id?: string
}

export type DaypartingResult = {
  schedules_processed: number
  campaigns_adjusted: number
  errors: number
}

export class WriteBackService {
  constructor(
    private adsPort: AdsPort,
    private db: SupabaseClient,
  ) {}

  // Execute a single approved action → Amazon
  async execute(action: WriteBackAction): Promise<WriteBackResult> {
    // 1. Guardrail check (FR-G01~G10)
    const guardrailParams: GuardrailCheckParams = {
      action_type: action.type,
      campaign_id: action.campaign_id,
      current_value: action.current_value,
      proposed_value: action.proposed_value,
      max_bid_cap: action.details.max_bid_cap as number | undefined,
      confidence_score: action.details.confidence_score as number | undefined,
      keyword_orders: action.details.keyword_orders as number | undefined,
    }

    const guardrail = checkGuardrails(guardrailParams)
    if (guardrail.blocked) {
      await this.logAction(action, false, guardrail.guardrail_id, guardrail.reason)
      return {
        applied: false,
        reason: guardrail.reason ?? 'Blocked by guardrail',
        guardrail_blocked: true,
        guardrail_id: guardrail.guardrail_id ?? undefined,
      }
    }

    // 2. Dispatch to adsPort based on action type
    try {
      switch (action.type) {
        case 'bid_adjust': {
          if (!action.keyword_id) throw new Error('keyword_id required for bid_adjust')
          await this.adsPort.updateKeywordBid(action.keyword_id, action.proposed_value)
          // Update local DB
          await this.db
            .from('keywords')
            .update({ bid: action.proposed_value, last_auto_adjusted_at: new Date().toISOString() })
            .eq('amazon_keyword_id', action.keyword_id)
          break
        }

        case 'budget_adjust': {
          await this.adsPort.updateCampaign(action.campaign_id, {
            budget: action.proposed_value,
          })
          await this.db
            .from('campaigns')
            .update({ daily_budget: action.proposed_value, updated_at: new Date().toISOString() })
            .eq('amazon_campaign_id', action.campaign_id)
          break
        }

        case 'campaign_state': {
          const state = action.proposed_value === 1 ? 'enabled' : 'paused'
          await this.adsPort.updateCampaign(action.campaign_id, { state })
          await this.db
            .from('campaigns')
            .update({
              amazon_state: state,
              status: state === 'enabled' ? 'active' : 'paused',
              updated_at: new Date().toISOString(),
            })
            .eq('amazon_campaign_id', action.campaign_id)
          break
        }

        case 'keyword_add': {
          const keywords = action.details.keywords as Array<{
            keyword_text: string
            match_type: string
            bid: number
          }> ?? []
          await this.adsPort.createKeywords(
            keywords.map(k => ({
              campaign_id: action.campaign_id,
              ad_group_id: action.ad_group_id,
              keyword_text: k.keyword_text,
              match_type: k.match_type as 'broad' | 'phrase' | 'exact',
              bid: k.bid,
              state: 'enabled' as const,
            })),
          )
          break
        }

        case 'keyword_negate': {
          if (!action.keyword_id) throw new Error('keyword_id required for keyword_negate')
          await this.adsPort.archiveKeyword(action.keyword_id)
          await this.db
            .from('keywords')
            .update({ state: 'archived', updated_at: new Date().toISOString() })
            .eq('amazon_keyword_id', action.keyword_id)
          break
        }
      }

      // 3. Log success
      await this.logAction(action, true, null, null)
      return { applied: true }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      await this.logAction(action, false, null, message)
      return { applied: false, reason: message }
    }
  }

  // Batch execute (for Auto Pilot bulk operations)
  async executeBatch(actions: WriteBackAction[]): Promise<WriteBackResult[]> {
    const results: WriteBackResult[] = []
    for (const action of actions) {
      results.push(await this.execute(action))
      // 100ms delay between actions for rate limit awareness
      await new Promise(r => setTimeout(r, 100))
    }
    return results
  }

  // Apply dayparting schedule
  async applyDayparting(profileId: string): Promise<DaypartingResult> {
    const supabase = this.db
    const result: DaypartingResult = { schedules_processed: 0, campaigns_adjusted: 0, errors: 0 }

    const now = new Date()
    const currentHour = now.getUTCHours()
    const currentDay = now.getUTCDay()

    // Get enabled dayparting schedules
    const { data: schedules } = await supabase
      .from('dayparting_schedules')
      .select('id, campaign_ids, schedule')
      .eq('is_enabled', true)

    if (!schedules?.length) return result

    for (const sched of schedules) {
      result.schedules_processed += 1
      const schedule = sched.schedule as Record<string, Record<string, boolean>> | null
      if (!schedule) continue

      const dayKey = String(currentDay)
      const hourKey = String(currentHour)
      const isOn = schedule[dayKey]?.[hourKey] ?? true

      // Get autopilot campaigns from the schedule's campaign_ids
      const campaignIds = sched.campaign_ids as string[]
      if (!campaignIds?.length) continue

      const { data: campaigns } = await supabase
        .from('campaigns')
        .select('id, amazon_campaign_id, amazon_state, mode')
        .in('id', campaignIds)
        .eq('mode', 'autopilot')

      for (const camp of campaigns ?? []) {
        if (!camp.amazon_campaign_id) continue

        const shouldBeEnabled = isOn
        const isCurrentlyEnabled = camp.amazon_state === 'enabled'

        if (shouldBeEnabled && !isCurrentlyEnabled) {
          try {
            await this.adsPort.updateCampaign(camp.amazon_campaign_id, { state: 'enabled' })
            await supabase
              .from('campaigns')
              .update({ amazon_state: 'enabled', status: 'active', updated_at: new Date().toISOString() })
              .eq('id', camp.id)
            result.campaigns_adjusted += 1
          } catch { result.errors += 1 }
        } else if (!shouldBeEnabled && isCurrentlyEnabled) {
          try {
            await this.adsPort.updateCampaign(camp.amazon_campaign_id, { state: 'paused' })
            await supabase
              .from('campaigns')
              .update({ amazon_state: 'paused', status: 'paused', updated_at: new Date().toISOString() })
              .eq('id', camp.id)
            result.campaigns_adjusted += 1
          } catch { result.errors += 1 }
        }
      }

      // Update last_applied_at
      await supabase
        .from('dayparting_schedules')
        .update({ last_applied_at: new Date().toISOString() })
        .eq('id', sched.id)
    }

    return result
  }

  // Log action to automation_log
  private async logAction(
    action: WriteBackAction,
    success: boolean,
    guardrailId: string | null,
    reason: string | null,
  ): Promise<void> {
    await this.db.from('automation_log').insert({
      campaign_id: action.campaign_id,
      keyword_id: action.keyword_id ?? null,
      batch_id: crypto.randomUUID(),
      action_type: action.type,
      action_detail: action.details,
      reason: reason ?? (success ? 'Applied successfully' : 'Failed'),
      source: 'algorithm',
      guardrail_blocked: !success && !!guardrailId,
      guardrail_id: guardrailId,
      guardrail_reason: reason,
      api_success: success,
    })
  }
}
