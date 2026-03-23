// A.R.C. Platform — Module Definitions

type MenuItem = {
  label: string
  labelKey: string
  path: string
  icon: string
}

type ModuleConfig = {
  key: string
  name: string
  icon: string
  path: string
  status: 'active' | 'coming_soon' | 'disabled'
  menuItems: MenuItem[]
}

const MODULES: ModuleConfig[] = [
  {
    key: 'ip',
    name: 'IP Protection',
    icon: 'shield',
    path: '/ip',
    status: 'active',
    menuItems: [
      { label: 'Dashboard', labelKey: 'nav.dashboard', path: '/dashboard', icon: 'layout-dashboard' },
      { label: 'Campaigns', labelKey: 'nav.campaigns', path: '/campaigns', icon: 'search' },
      { label: 'Report Queue', labelKey: 'nav.reportQueue', path: '/reports', icon: 'file-text' },
      { label: 'Completed Reports', labelKey: 'nav.completedReports', path: '/reports/completed', icon: 'check-circle' },
      { label: 'IP Registry', labelKey: 'nav.ipRegistry', path: '/patents', icon: 'copyright' },
      { label: 'Notices', labelKey: 'nav.notices', path: '/notices', icon: 'bell' },
    ],
  },
  {
    key: 'ads',
    name: 'AD Optimizer',
    icon: 'megaphone',
    path: '/ads',
    status: 'coming_soon',
    menuItems: [
      { label: 'Dashboard', labelKey: 'nav.dashboard', path: '/ads/dashboard', icon: 'layout-dashboard' },
      { label: 'Campaigns', labelKey: 'nav.campaigns', path: '/ads/campaigns', icon: 'target' },
      { label: 'Keywords', labelKey: 'nav.keywords', path: '/ads/keywords', icon: 'hash' },
      { label: 'Budget', labelKey: 'nav.budget', path: '/ads/budget', icon: 'wallet' },
      { label: 'Reports', labelKey: 'nav.reports', path: '/ads/reports', icon: 'bar-chart-3' },
    ],
  },
  {
    key: 'listings',
    name: 'Listing Management',
    icon: 'list',
    path: '/listings',
    status: 'coming_soon',
    menuItems: [],
  },
  {
    key: 'products',
    name: 'Product Library',
    icon: 'package',
    path: '/products',
    status: 'coming_soon',
    menuItems: [],
  },
  {
    key: 'planning',
    name: 'Product Planning',
    icon: 'lightbulb',
    path: '/planning',
    status: 'coming_soon',
    menuItems: [],
  },
  {
    key: 'finance',
    name: 'Finance',
    icon: 'calculator',
    path: '/finance',
    status: 'coming_soon',
    menuItems: [],
  },
  {
    key: 'logistics',
    name: 'Logistics',
    icon: 'truck',
    path: '/logistics',
    status: 'coming_soon',
    menuItems: [],
  },
]

export { MODULES }
export type { ModuleConfig, MenuItem }
