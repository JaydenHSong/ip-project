import type { LayoutItem } from 'react-grid-layout'
import type { Role } from '@/types/users'

export type WidgetConfig = {
  id: string
  title: string
  minRole?: Role
  defaultLayout: LayoutItem
}

export const WIDGET_CONFIGS: WidgetConfig[] = [
  {
    id: 'stats',
    title: 'Stats Overview',
    defaultLayout: { i: 'stats', x: 0, y: 0, w: 12, h: 2, minW: 6, minH: 2 },
  },
  {
    id: 'report-trend',
    title: 'Report Trend',
    defaultLayout: { i: 'report-trend', x: 0, y: 2, w: 8, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'violation-dist',
    title: 'Violation Distribution',
    defaultLayout: { i: 'violation-dist', x: 8, y: 2, w: 4, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'status-pipeline',
    title: 'Status Pipeline',
    defaultLayout: { i: 'status-pipeline', x: 0, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'ai-performance',
    title: 'AI Performance',
    defaultLayout: { i: 'ai-performance', x: 6, y: 6, w: 6, h: 4, minW: 4, minH: 3 },
  },
  {
    id: 'top-violations',
    title: 'Top Violations',
    defaultLayout: { i: 'top-violations', x: 0, y: 10, w: 12, h: 4, minW: 6, minH: 3 },
  },
  {
    id: 'recent-reports',
    title: 'Recent Reports',
    defaultLayout: { i: 'recent-reports', x: 0, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
  },
  {
    id: 'active-campaigns',
    title: 'Active Campaigns',
    defaultLayout: { i: 'active-campaigns', x: 6, y: 14, w: 6, h: 5, minW: 4, minH: 3 },
  },
  {
    id: 'system-status',
    title: 'System Status',
    minRole: 'owner',
    defaultLayout: { i: 'system-status', x: 0, y: 19, w: 12, h: 3, minW: 6, minH: 2 },
  },
]

const ROLE_HIERARCHY: Record<Role, number> = {
  owner: 4,
  admin: 3,
  editor: 2,
  viewer_plus: 1,
  viewer: 0,
}

export const getAvailableWidgets = (role: Role): WidgetConfig[] =>
  WIDGET_CONFIGS.filter(
    (w) => !w.minRole || ROLE_HIERARCHY[role] >= ROLE_HIERARCHY[w.minRole]
  )

export const getDefaultLayouts = (role: Role): LayoutItem[] =>
  getAvailableWidgets(role).map((w) => ({ ...w.defaultLayout }))

export type UserDashboardLayout = {
  layouts: LayoutItem[]
  hidden: string[]
}
