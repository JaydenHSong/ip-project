import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { CampaignForm } from '@/components/features/CampaignForm'

const NewCampaignPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer') redirect('/campaigns')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-th-text">New Campaign</h1>
      <Card>
        <CardHeader>
          <p className="text-sm text-th-text-secondary">
            Create a new keyword monitoring campaign. The crawler will automatically collect listings matching this keyword.
          </p>
        </CardHeader>
        <CardContent>
          <CampaignForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewCampaignPage
