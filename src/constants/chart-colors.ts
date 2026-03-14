export const CHART_COLORS = {
  // Category colors (ViolationCategory)
  intellectual_property: '#ef4444',
  listing_content: '#f59e0b',
  review_manipulation: '#8b5cf6',
  selling_practice: '#3b82f6',
  regulatory_safety: '#10b981',

  // Status colors (matching StatusBadge)
  draft: '#6b7280',
  pending_review: '#f59e0b',
  approved: '#3b82f6',
  br_submitting: '#0ea5e9',
  monitoring: '#06b6d4',
  resolved: '#10b981',
  rejected: '#ef4444',
  cancelled: '#6b7280',
  unresolved: '#f97316',
  archived: '#9ca3af',

  // BR Case Status colors
  br_open: '#6b7280',
  br_work_in_progress: '#3b82f6',
  br_answered: '#3b82f6',
  br_needs_attention: '#ef4444',
  br_closed: '#9ca3af',

  // Trend chart
  newReports: '#3b82f6',
  resolvedLine: '#10b981',
} as const
