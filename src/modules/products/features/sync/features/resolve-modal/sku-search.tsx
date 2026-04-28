// Design Ref: products-sync.design.md §7.3 — SKU autocomplete for resolve modal
// Plan SC: SC-03 3-click resolve

'use client';

import { useEffect, useRef, useState } from 'react';

type Props = {
  value: string;
  onChange: (sku: string) => void;
};

type SkuResult = { sku: string; productName: string };

export function SkuSearch({ value, onChange }: Props) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SkuResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => { setQuery(value); }, [value]);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/products/sku-search?q=${encodeURIComponent(query.trim())}&limit=10`, {
          cache: 'no-store',
        });
        if (res.ok) {
          const body = await res.json();
          setResults((body.data ?? []) as SkuResult[]);
        }
      } catch { /* swallow */ } finally {
        setLoading(false);
      }
    }, 250);
    return () => { if (timer.current) clearTimeout(timer.current); };
  }, [query]);

  const select = (sku: string) => {
    onChange(sku);
    setQuery(sku);
    setOpen(false);
  };

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="ACS06... (최소 2자)"
        className="w-full rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] px-3 py-2 text-sm"
      />
      {open && query.trim().length >= 2 && (
        <div className="absolute z-10 mt-1 w-full max-h-60 overflow-auto rounded-md border border-[var(--border-primary)] bg-[var(--surface-card)] shadow-lg">
          {loading && <div className="px-3 py-2 text-xs text-[var(--text-muted)]">검색 중…</div>}
          {!loading && results.length === 0 && (
            <div className="px-3 py-2 text-xs text-[var(--text-muted)]">결과 없음</div>
          )}
          {results.map((r) => (
            <button
              key={r.sku}
              type="button"
              onMouseDown={() => select(r.sku)}
              className="block w-full text-left px-3 py-2 text-sm hover:bg-[var(--bg-hover)]"
            >
              <div className="font-medium text-[var(--text-primary)]">{r.sku}</div>
              <div className="text-[10px] text-[var(--text-muted)] truncate">{r.productName}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
