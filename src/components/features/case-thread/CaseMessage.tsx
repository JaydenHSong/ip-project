'use client'

type CaseMessageProps = {
  direction: 'inbound' | 'outbound'
  sender: string
  body: string
  sentAt: string
}

export const CaseMessage = ({ direction, sender, body, sentAt }: CaseMessageProps) => {
  const isInbound = direction === 'inbound'
  const formattedDate = new Date(sentAt).toLocaleString()

  return (
    <div className={`flex ${isInbound ? 'justify-start' : 'justify-end'}`}>
      <div
        className={`max-w-[80%] rounded-xl px-4 py-3 ${
          isInbound
            ? 'bg-surface-card border border-th-border'
            : 'bg-th-accent/10 border border-th-accent/20'
        }`}
      >
        <div className="mb-1 flex items-center gap-2">
          <span className="text-xs font-medium text-th-text-secondary">
            {isInbound ? '📥' : '📤'} {sender}
          </span>
          <span className="text-xs text-th-text-muted">{formattedDate}</span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-th-text">{body}</p>
      </div>
    </div>
  )
}
