import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { SettingsContent } from './SettingsContent'
import type { Role } from '@/types/users'

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 5,
  admin: 4,
  editor: 3,
  viewer_plus: 2,
  viewer: 1,
}

const SettingsPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const roleLevel = ROLE_HIERARCHY[user.role]
  const isOwner = roleLevel >= 5
  const isAdmin = roleLevel >= 4
  const isEditor = roleLevel >= 3

  return (
    <SettingsContent
      isOwner={isOwner}
      isAdmin={isAdmin}
      isEditor={isEditor}
      currentUserId={user.id}
    />
  )
}

export default SettingsPage
