import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { CampaignForm } from '@/components/features/CampaignForm'
import { NewCampaignHeader, NewCampaignDescription } from './NewCampaignHeader'

const NewCampaignPage = async () => {
  const user = await getCurrentUser()
  if (!user) redirect('/login')
  if (user.role === 'viewer' || user.role === 'viewer_plus') redirect('/campaigns')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <NewCampaignHeader />
      <Card>
        <CardHeader>
          <NewCampaignDescription />
        </CardHeader>
        <CardContent>
          <CampaignForm />
        </CardContent>
      </Card>
    </div>
  )
}

export default NewCampaignPage
