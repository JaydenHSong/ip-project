import type { Role } from '@/types/users'

export type WidgetSize = 'full' | 'medium' | 'standard'

export type WidgetConfig = {
  id: string
  title: string
  size: WidgetSize
  minRole?: Role
  order: number
}

export const WIDGET_CONFIGS: WidgetConfig[] = [
  { id: 'stats', title: 'Stats Overview', size: 'full', order: 0 },
  { id: 'report-trend', title: 'Report Trend', size: 'medium', order: 1 },
  { id: 'violation-dist', title: 'Violation Distribution', size: 'medium', order: 2 },
  { id: 'status-pipeline', title: 'Status Pipeline', size: 'medium', order: 3 },
  { id: 'ai-performance', title: 'AI Performance', size: 'medium', order: 4 },
  { id: 'top-violations', title: 'Top Violations', size: 'full', order: 5 },
  { id: 'recent-reports', title: 'Recent Reports', size: 'standard', order: 6 },
  { id: 'active-campaigns', title: 'Active Campaigns', size: 'standard', order: 7 },
  { id: 'ai-accuracy', title: 'AI Accuracy', size: 'medium', minRole: 'admin', order: 9 },
  { id: 'system-status', title: 'System Status', size: 'standard', minRole: 'owner', order: 10 },
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

export const getDefaultOrder = (role: Role): string[] =>
  getAvailableWidgets(role).sort((a, b) => a.order - b.order).map((w) => w.id)

export type UserDashboardLayout = {
  order: string[]
  hidden: string[]
}
