// /ads/dashboard → S01 CEO or S02 Director (역할별 자동 뷰 전환)
// Design Ref: §2.2, §5.3 S01/S02
'use client'

import { useMarketContext } from '@/modules/ads/shared/hooks/use-market-context'
import { CeoDashboard } from '@/modules/ads/features/dashboard/components/ceo-dashboard'
import { DirectorDashboard } from '@/modules/ads/features/dashboard/components/director-dashboard'
import { useAdsDashboardPageData } from './hooks/use-ads-dashboard-page-data'

const AdsDashboardPage = () => {
  const { selectedMarketId } = useMarketContext()
  const {
    view,
    setView,
    userRole,
    ceoData,
    directorData,
    isLoading,
    dashboardError,
    refetchDashboard,
  } = useAdsDashboardPageData({ selectedMarketId })

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-th-text">AD Dashboard</h1>
          <p className="mt-0.5 text-sm text-th-text-muted">
            {view === 'ceo' ? 'Cross-brand performance overview' : 'Budget pacing & team performance'}
          </p>
        </div>

        {userRole === 'owner' && (
          <div className="inline-flex overflow-hidden rounded-lg border border-th-border bg-surface-card">
            <button
              type="button"
              onClick={() => setView('ceo')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'ceo'
                  ? 'bg-th-accent text-white'
                  : 'text-th-text-muted hover:bg-th-accent/10 hover:text-th-text'
              }`}
            >
              CEO View
            </button>
            <button
              type="button"
              onClick={() => setView('director')}
              className={`px-4 py-2 text-sm font-medium transition-colors ${
                view === 'director'
                  ? 'bg-th-accent text-white'
                  : 'text-th-text-muted hover:bg-th-accent/10 hover:text-th-text'
              }`}
            >
              Director View
            </button>
          </div>
        )}
      </div>

      {view === 'ceo' ? (
        <CeoDashboard
          data={ceoData}
          isLoading={isLoading}
          errorMessage={dashboardError}
          onRetry={refetchDashboard}
        />
      ) : (
        <DirectorDashboard
          data={directorData}
          isLoading={isLoading}
          errorMessage={dashboardError}
          onRetry={refetchDashboard}
        />
      )}
    </div>
  )
}

export default AdsDashboardPage
