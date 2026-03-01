import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_USER } from '@/lib/demo/data'
import type { User } from '@/types/users'

// 서버 컴포넌트/API에서 현재 사용자 조회
export const getCurrentUser = async (): Promise<User | null> => {
  if (isDemoMode()) {
    return DEMO_USER as User
  }

  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()
  if (!authUser) return null

  const { data: dbUser } = await supabase
    .from('users')
    .select('*')
    .eq('id', authUser.id)
    .single()

  return (dbUser as User) ?? null
}

// 특정 역할 이상인지 확인
export const hasRole = (user: User, minimumRole: 'admin' | 'editor' | 'viewer'): boolean => {
  const hierarchy = { admin: 3, editor: 2, viewer: 1 }
  return hierarchy[user.role] >= hierarchy[minimumRole]
}
