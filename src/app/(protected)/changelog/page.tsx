import { getCurrentUser } from '@/lib/auth/session'
import { redirect } from 'next/navigation'
import { ChangelogContent } from './ChangelogContent'

const ChangelogPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  return <ChangelogContent isAdmin={user.role === 'admin'} />
}

export default ChangelogPage
