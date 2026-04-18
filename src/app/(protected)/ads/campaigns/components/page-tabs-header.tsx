'use client'

type PageTab = 'campaigns' | 'budget_planning'

type PageTabsHeaderProps = {
  pageTab: PageTab
  onTabChange: (tab: PageTab) => void
}

const PageTabsHeader = ({ pageTab, onTabChange }: PageTabsHeaderProps) => (
  <div>
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-lg font-semibold text-th-text">Campaigns</h1>
        <p className="mt-0.5 text-sm text-th-text-muted">
          Manage your Amazon ad campaigns across all brands and markets.
        </p>
      </div>
    </div>

    <div className="mt-4 flex border-b border-th-border">
      <button
        onClick={() => onTabChange('campaigns')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          pageTab === 'campaigns'
            ? 'border-b-2 border-orange-500 text-orange-600'
            : 'text-th-text-muted hover:text-th-text-secondary'
        }`}
      >
        Campaigns
      </button>
      <button
        onClick={() => onTabChange('budget_planning')}
        className={`px-4 py-2 text-sm font-medium transition-colors ${
          pageTab === 'budget_planning'
            ? 'border-b-2 border-orange-500 text-orange-600'
            : 'text-th-text-muted hover:text-th-text-secondary'
        }`}
      >
        Budget Planning
      </button>
    </div>
  </div>
)

export { PageTabsHeader }
export type { PageTab }
