import { Badge } from '@/components/ui/Badge'

type ReportStatus =
  | 'draft'
  | 'pending_review'
  | 'approved'
  | 'rejected'
  | 'cancelled'
  | 'sc_submitting'
  | 'br_submitting'
  | 'submitted'
  | 'monitoring'
  | 'resolved'
  | 'unresolved'
  | 'resubmitted'
  | 'escalated'
  | 'archived'

type CampaignStatus = 'active' | 'paused' | 'completed' | 'scheduled'

const REPORT_STATUS_MAP = {
  draft: { label: 'Draft', variant: 'default' },
  pending_review: { label: 'Pending', variant: 'warning' },
  approved: { label: 'Approved', variant: 'success' },
  rejected: { label: 'Rejected', variant: 'danger' },
  cancelled: { label: 'Cancelled', variant: 'default' },
  sc_submitting: { label: 'SC Submitting', variant: 'info' },
  br_submitting: { label: 'BR Submitting', variant: 'info' },
  submitted: { label: 'Submitted', variant: 'info' },
  monitoring: { label: 'Monitoring', variant: 'violet' },
  resolved: { label: 'Resolved', variant: 'success' },
  unresolved: { label: 'Unresolved', variant: 'danger' },
  resubmitted: { label: 'Resubmitted', variant: 'info' },
  escalated: { label: 'Escalated', variant: 'danger' },
  archived: { label: 'Archived', variant: 'default' },
} as const

const CAMPAIGN_STATUS_MAP = {
  active: { label: 'Active', variant: 'success' },
  paused: { label: 'Paused', variant: 'warning' },
  completed: { label: 'Completed', variant: 'default' },
  scheduled: { label: 'Scheduled', variant: 'info' },
} as const

type StatusBadgeProps = {
  status: ReportStatus | CampaignStatus
  type?: 'report' | 'campaign'
  size?: 'sm' | 'md'
  className?: string
}

export const StatusBadge = ({ status, type = 'report', size = 'sm', className }: StatusBadgeProps) => {
  const map = type === 'campaign' ? CAMPAIGN_STATUS_MAP : REPORT_STATUS_MAP
  const config = (map as Record<string, { label: string; variant: string }>)[status]

  if (!config) return <Badge className={className}>{status}</Badge>

  return (
    <Badge
      variant={config.variant as 'default' | 'success' | 'warning' | 'danger' | 'info' | 'violet'}
      size={size}
      className={className}
    >
      {config.label}
    </Badge>
  )
}
