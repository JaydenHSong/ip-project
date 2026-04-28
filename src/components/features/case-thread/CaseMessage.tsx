'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/date'

type CaseMessageProps = {
  direction: 'inbound' | 'outbound'
  sender: string
  body: string
  sentAt: string
  collapsed?: boolean
}

export const CaseMessage = ({ direction, sender, body, sentAt, collapsed = false }: CaseMessageProps) => {
  const [isCollapsed, setIsCollapsed] = useState(collapsed)
  const isInbound = direction === 'inbound'
  const formattedDate = formatDateTime(sentAt)

  // 첫 줄 또는 첫 100자
  const firstLine = body.split('\n').filter(Boolean)[0] ?? ''
  const preview = firstLine.length > 100 ? `${firstLine.slice(0, 100)}...` : firstLine

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isInbound
            ? 'bg-surface-card border border-th-border'
            : 'bg-th-accent/10 border border-th-accent/20'
        }`}
      >
        <button
          type="button"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="mb-1 flex w-full items-center gap-2 text-left"
        >
          <span className="text-xs font-medium text-th-text-secondary">
            {isInbound ? '📥' : '📤'} {sender}
          </span>
          <span className="text-xs text-th-text-muted">{formattedDate}</span>
          {body.length > 100 && (
            isCollapsed
              ? <ChevronRight className="ml-auto h-3.5 w-3.5 shrink-0 text-th-text-muted" />
              : <ChevronDown className="ml-auto h-3.5 w-3.5 shrink-0 text-th-text-muted" />
          )}
        </button>
        {isCollapsed ? (
          <p className="text-sm text-th-text-muted">{preview}</p>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-th-text">{body}</p>
        )}
      </div>
    </div>
  )
}
