'use client'

import { useRouter } from 'next/navigation'
import { StatusBadge } from '@/components/ui/StatusBadge'
import type { BrCaseStatus } from '@/types/br-case'

type ChainNode = {
  id: string
  status: string
  br_case_status: string | null
  escalation_level: number | null
  created_at: string
  user_violation_type: string
}

type CaseChainProps = {
  currentId: string
  parentChain: ChainNode[]
  children: ChainNode[]
}

export const CaseChain = ({ currentId, parentChain, children }: CaseChainProps) => {
  const router = useRouter()
  const allNodes: (ChainNode & { isCurrent?: boolean })[] = [
    ...parentChain,
    { id: currentId, isCurrent: true, status: '', br_case_status: null, escalation_level: null, created_at: '', user_violation_type: '' },
    ...children,
  ]

  if (parentChain.length === 0 && children.length === 0) return null

  return (
    <div className="flex items-center gap-1 overflow-x-auto py-1">
      {allNodes.map((node, idx) => {
        const isCurrent = node.id === currentId
        return (
          <div key={node.id} className="flex items-center">
            {idx > 0 && (
              <svg className="mx-1 h-4 w-4 shrink-0 text-th-text-muted" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            )}
            <button
              type="button"
              onClick={() => { if (!isCurrent) router.push(`/ip/reports/${node.id}`) }}
              disabled={isCurrent}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                isCurrent
                  ? 'border-th-accent/50 bg-th-accent/10 font-semibold text-th-accent-text'
                  : 'border-th-border bg-surface-card text-th-text-secondary hover:bg-th-bg-hover'
              }`}
            >
              <span className="font-mono">{node.id.substring(0, 8)}</span>
              {!isCurrent && node.status && (
                <StatusBadge status={node.status as Parameters<typeof StatusBadge>[0]['status']} type="report" size="sm" />
              )}
              {!isCurrent && node.br_case_status && (
                <StatusBadge status={node.br_case_status as BrCaseStatus} type="br_case" size="sm" />
              )}
            </button>
          </div>
        )
      })}
    </div>
  )
}
