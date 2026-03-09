import { createClient } from '@/lib/supabase/server'
import type { BrCaseEventType, BrCaseEventMetadata } from '@/types/br-case'

type InsertCaseEventParams = {
  reportId: string
  eventType: BrCaseEventType
  oldValue?: string | null
  newValue?: string | null
  metadata?: BrCaseEventMetadata
  actorId?: string | null
}

export const insertCaseEvent = async ({
  reportId,
  eventType,
  oldValue = null,
  newValue = null,
  metadata = {},
  actorId = null,
}: InsertCaseEventParams): Promise<{ id: string } | null> => {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('br_case_events')
    .insert({
      report_id: reportId,
      event_type: eventType,
      old_value: oldValue,
      new_value: newValue,
      metadata,
      actor_id: actorId,
    })
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to insert case event: ${error.message}`)
  }

  return data
}
