import { redirect } from 'next/navigation'
import { getCurrentUser, hasRole } from '@/lib/auth/session'
import { NewReportForm } from './NewReportForm'

const NewReportPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (!hasRole(user, 'editor')) redirect('/reports')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <NewReportForm />
    </div>
  )
}

export default NewReportPage
