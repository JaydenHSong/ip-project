// Design Ref: §3.4 P3 — Shared keyword input component
'use client'

import { useState } from 'react'
import type { MatchType } from '@/modules/ads/shared/types'
import type { KeywordEntry } from './create-steps/types'

type KeywordInputProps = {
  keywords: KeywordEntry[]
  onChange: (keywords: KeywordEntry[]) => void
}

export const KeywordInput = ({ keywords, onChange }: KeywordInputProps) => {
  const [newKeyword, setNewKeyword] = useState('')
  const [newMatchType, setNewMatchType] = useState<MatchType>('broad')
  const [newBid, setNewBid] = useState(0.75)

  const addKeyword = () => {
    if (!newKeyword.trim()) return
    onChange([...keywords, { text: newKeyword.trim(), match_type: newMatchType, bid: newBid }])
    setNewKeyword('')
  }

  const removeKeyword = (index: number) => {
    onChange(keywords.filter((_, i) => i !== index))
  }

  return (
    <>
      <div className="flex gap-2 mb-2">
        <input
          type="text"
          value={newKeyword}
          onChange={(e) => setNewKeyword(e.target.value)}
          placeholder="Enter keyword..."
          onKeyDown={(e) => e.key === 'Enter' && addKeyword()}
          className="flex-1 rounded-md border border-th-border px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none"
        />
        <select
          value={newMatchType}
          onChange={(e) => setNewMatchType(e.target.value as MatchType)}
          className="rounded-md border border-th-border px-2 py-1.5 text-xs"
        >
          <option value="broad">Broad</option>
          <option value="phrase">Phrase</option>
          <option value="exact">Exact</option>
        </select>
        <input
          type="number"
          value={newBid}
          onChange={(e) => setNewBid(Number(e.target.value))}
          step={0.01} min={0.02}
          className="w-16 rounded-md border border-th-border px-2 py-1.5 text-xs"
        />
        <button
          type="button"
          onClick={addKeyword}
          className="rounded-md bg-th-text px-3 py-1.5 text-xs font-medium text-white hover:bg-th-text"
        >
          Add
        </button>
      </div>
      {keywords.length > 0 && (
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {keywords.map((kw, i) => (
            <div key={i} className="flex items-center justify-between rounded border border-th-border bg-th-bg-hover px-3 py-1">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-th-text-secondary">{kw.text}</span>
                <span className="rounded bg-th-bg-tertiary px-1 py-0.5 text-[10px] text-th-text-secondary">{kw.match_type}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono text-th-text-muted">${kw.bid.toFixed(2)}</span>
                <button type="button" onClick={() => removeKeyword(i)} className="text-th-text-muted hover:text-red-500 text-xs">&times;</button>
              </div>
            </div>
          ))}
        </div>
      )}
      <p className="mt-1 text-[11px] text-th-text-muted">{keywords.length} keywords</p>
    </>
  )
}
