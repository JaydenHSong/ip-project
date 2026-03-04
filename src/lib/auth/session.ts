import { createClient } from '@/lib/supabase/server'
import { isDemoMode } from '@/lib/demo'
import { DEMO_USER } from '@/lib/demo/data'
import type { Role, User } from '@/types/users'

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  viewer_plus: 2,
  viewer: 1,
}

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

  if (!dbUser || !dbUser.is_active) return null

  return dbUser as User
}

// 특정 역할 이상인지 확인
export const hasRole = (user: User, minimumRole: Role): boolean => {
  return ROLE_HIERARCHY[user.role] >= ROLE_HIERARCHY[minimumRole]
}
