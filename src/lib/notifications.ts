// Admin 전용 알림 생성 헬퍼
// 모든 Admin 사용자에게 동일 알림을 insert

import { createAdminClient } from '@/lib/supabase/admin'

type NotificationType =
  | 'followup_change_detected'
  | 'followup_no_change'
  | 'patent_sync_completed'
  | 'pd_submit_success'
  | 'pd_submit_failed'
  | 'system_error'

type CreateNotificationParams = {
  type: NotificationType
  title: string
  message: string
  metadata?: Record<string, unknown>
}

const notifyAdmins = async (params: CreateNotificationParams): Promise<void> => {
  try {
    const supabase = createAdminClient()

    // Admin 사용자 목록 조회
    const { data: admins } = await supabase
      .from('users')
      .select('id')
      .eq('role', 'admin')
      .eq('is_active', true)

    if (!admins?.length) return

    // 각 Admin에게 알림 insert
    const rows = admins.map((admin) => ({
      user_id: admin.id,
      type: params.type,
      title: params.title,
      message: params.message,
      metadata: params.metadata ?? {},
      is_read: false,
    }))

    await supabase.from('notifications').insert(rows)
  } catch {
    // 알림 실패가 메인 로직을 중단시키면 안 됨
  }
}

export { notifyAdmins }
export type { NotificationType, CreateNotificationParams }
