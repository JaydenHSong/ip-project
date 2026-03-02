import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { SettingsContent } from './SettingsContent'

const SettingsPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  return <SettingsContent isAdmin={user.role === 'admin'} />
}

export default SettingsPage
