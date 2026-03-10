import type { ChangelogEntry } from '@/types/changelog'

export const DEMO_CHANGELOG: ChangelogEntry[] = [
  {
    id: 'cl-001',
    category: 'new',
    title: 'Crawler Engine v1.0 deployed to Railway',
    description: 'Automated keyword-based listing collection with Bright Data proxy integration and Redis job queue.',
    created_by: 'demo-user-001',
    created_at: '2026-03-03T10:00:00.000Z',
  },
  {
    id: 'cl-002',
    category: 'ai',
    title: 'AI auto-approve pipeline launched',
    description: 'Reports with confidence above threshold are automatically approved. Configurable per violation type in Settings.',
    created_by: 'demo-user-001',
    created_at: '2026-03-02T14:30:00.000Z',
  },
  {
    id: 'cl-003',
    category: 'fix',
    title: 'Fixed PD Case ID validation on submit',
    description: 'Resolved an issue where Seller Central case IDs with leading zeros were incorrectly trimmed.',
    created_by: 'demo-user-001',
    created_at: '2026-03-01T09:15:00.000Z',
  },
  {
    id: 'cl-004',
    category: 'policy',
    title: 'Added V18/V19 violation types for review manipulation',
    description: 'New violation categories for fake review incentivization and review manipulation detected by AI.',
    created_by: 'demo-user-001',
    created_at: '2026-02-28T16:00:00.000Z',
  },
  {
    id: 'cl-005',
    category: 'new',
    title: 'Chrome Extension passive collect mode',
    description: 'Extension now automatically collects listing data while operators browse Amazon product pages.',
    created_by: 'demo-user-001',
    created_at: '2026-02-27T11:00:00.000Z',
  },
  {
    id: 'cl-006',
    category: 'fix',
    title: 'Dashboard chart click-through filter corrected',
    description: null,
    created_by: 'demo-user-001',
    created_at: '2026-02-25T08:45:00.000Z',
  },
]
