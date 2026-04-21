// Design Ref: products-sync.design.md §7.2 — Unmapped list (RSC)
// Plan SC: SC-03 resolve ≤48h, FR-08 3-click resolve

import type { UnmappedQueueRow } from '@/modules/products/features/sync/domain/types';
import { ReasonTooltip } from './reason-tooltip';
import { ResolveButton } from './resolve-button';

type Props = {
  rows: UnmappedQueueRow[];
};

export function UnmappedTable({ rows }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-[var(--bg-secondary)] text-[var(--text-muted)]">
          <tr className="text-left">
            <Th>Channel</Th>
            <Th>Marketplace</Th>
            <Th>External ID</Th>
            <Th>seller_sku</Th>
            <Th>EAN</Th>
            <Th>Title</Th>
            <Th>Reason</Th>
            <Th>Detected</Th>
            <Th>Action</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-[var(--border-primary)] hover:bg-[var(--bg-hover)]">
              <Td mono>{r.channel}</Td>
              <Td mono>{r.marketplace ?? '-'}</Td>
              <Td mono>{r.externalId}</Td>
              <Td mono>{r.sourceSku ?? '-'}</Td>
              <Td mono>{r.sourceEan ?? '-'}</Td>
              <Td>
                <span className="line-clamp-2 max-w-xs text-[var(--text-primary)]">
                  {r.productName ?? '(no title)'}
                </span>
              </Td>
              <Td>
                <ReasonTooltip
                  reason={r.reason}
                  candidates={
                    Array.isArray((r.reasonDetail as { candidates?: string[] })?.candidates)
                      ? (r.reasonDetail as { candidates?: string[] }).candidates
                      : undefined
                  }
                />
              </Td>
              <Td mono>
                <time className="text-xs text-[var(--text-muted)]" dateTime={r.detectedAt}>
                  {new Date(r.detectedAt).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
                </time>
              </Td>
              <Td>
                {r.status === 'pending' && <ResolveButton row={r} />}
                {r.status === 'resolved' && (
                  <span className="text-xs text-green-700 dark:text-green-400">
                    ✅ {r.resolvedSku ?? r.resolvedAction ?? 'resolved'}
                  </span>
                )}
                {r.status === 'ignored' && (
                  <span className="text-xs text-[var(--text-muted)]">무시됨</span>
                )}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-3 py-2 text-xs font-medium uppercase tracking-wider">{children}</th>;
}

function Td({ children, mono }: { children?: React.ReactNode; mono?: boolean }) {
  return (
    <td className={`px-3 py-2 text-sm align-top ${mono ? 'font-mono text-xs' : ''}`}>{children}</td>
  );
}
