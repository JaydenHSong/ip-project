// /ads → 역할별 리다이렉트
// Design Ref: §2.2 page.tsx — /ads → 역할별 리다이렉트

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth/session'

const AdsPage = async () => {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/login')
  }

  // CEO/Director → Dashboard, Marketer → Campaigns
  const role = user.role
  if (role === 'owner' || role === 'admin') {
    redirect('/ads/dashboard')
  }

  redirect('/ads/campaigns')
}

export default AdsPage
