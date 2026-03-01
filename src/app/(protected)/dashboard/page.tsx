import { getCurrentUser } from '@/lib/auth/session'
import { isDemoMode } from '@/lib/demo'
import { DEMO_CAMPAIGNS, DEMO_REPORTS, DEMO_LISTINGS } from '@/lib/demo/data'

const DashboardPage = async () => {
  const user = await getCurrentUser()

  const activeCampaigns = isDemoMode()
    ? DEMO_CAMPAIGNS.filter((c) => c.status === 'active').length
    : 0
  const pendingReports = isDemoMode()
    ? DEMO_REPORTS.filter((r) => r.status === 'draft' || r.status === 'pending_review').length
    : 0
  const totalListings = isDemoMode() ? DEMO_LISTINGS.length : 0
  const resolvedRate = isDemoMode() ? '25%' : '—'

  const stats = [
    { label: '활성 캠페인', value: activeCampaigns },
    { label: '대기 중 신고', value: pendingReports },
    { label: '수집 리스팅', value: totalListings },
    { label: '해결률', value: resolvedRate },
  ]

  return (
    <div>
      <h1 className="text-2xl font-bold text-th-text">Dashboard</h1>
      <p className="mt-2 text-sm text-th-text-secondary">
        안녕하세요, {user?.name}님. Sentinel에 오신 것을 환영합니다.
      </p>
      {isDemoMode() && (
        <div className="mt-2 rounded-lg border border-st-warning-text/30 bg-st-warning-bg px-4 py-2">
          <p className="text-sm text-st-warning-text">Demo Mode — 목업 데이터로 실행 중입니다</p>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-th-border bg-surface-card p-6">
            <p className="text-sm font-medium text-th-text-tertiary">{stat.label}</p>
            <p className="mt-2 text-3xl font-bold text-th-text">{stat.value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export default DashboardPage
