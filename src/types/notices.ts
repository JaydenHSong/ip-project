export const NOTICE_CATEGORIES = ['update', 'policy', 'notice', 'system'] as const
export type NoticeCategory = (typeof NOTICE_CATEGORIES)[number]

export type Notice = {
  id: string
  category: NoticeCategory
  title: string
  content: string
  is_pinned: boolean
  created_by: string | null
  created_at: string
  updated_at: string
  users?: { name: string; email: string } | null
}

export type CreateNoticePayload = {
  category: NoticeCategory
  title: string
  content: string
  is_pinned?: boolean
}

export type NoticeRead = {
  id: string
  user_id: string
  notice_id: string
  read_at: string
}
