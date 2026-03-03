// Common selectors used across test files

export const SIDEBAR = {
  container: 'aside',
  logo: 'aside >> text=Sentinel',
  navLinks: {
    dashboard: 'aside >> a[href="/dashboard"]',
    campaigns: 'aside >> a[href="/campaigns"]',
    reportQueue: 'aside >> a[href="/reports"]',
    completedReports: 'aside >> a[href="/reports/completed"]',
    archivedReports: 'aside >> a[href="/reports/archived"]',
  },
  collapseButton: 'aside >> button[aria-label]',
  accountButton: 'aside >> button:has(div)',
}

export const HEADER = {
  container: 'header',
  versionBadge: 'header >> text=v0.1.0',
  themeToggle: 'header >> button[aria-label*="mode"], header >> button[aria-label*="Mode"]',
  languageToggle: 'header >> button[aria-label="Toggle language"]',
  auditLogButton: 'header >> button:has(span)',
  notificationBell: 'header >> button:last-child',
}

export const MOBILE_TAB_BAR = 'nav.fixed.bottom-0'

export const SLIDE_PANEL = {
  backdrop: 'div.fixed.inset-0.bg-black\\/50',
  panel: 'div.fixed.inset-y-0.right-0',
  closeButton: 'button[aria-label="닫기"]',
}

// Demo data constants for assertions
export const DEMO = {
  campaignCount: 4,
  reportCount: 5,
  nonArchivedReportCount: 4,
  archivedReportCount: 1,
  auditLogCount: 6,
  activeCampaignCount: 2,
  campaigns: {
    first: 'spigen iphone 16 case',
    second: 'spigen galaxy s25 ultra',
  },
  reports: {
    pending: 'rpt-001',
    draft: 'rpt-002',
    approved: 'rpt-003',
    rejected: 'rpt-004',
    archived: 'rpt-007',
  },
}
