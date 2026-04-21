// Design Ref: products-sync.design.md §7.2 + FR-20 (매칭 이유 설명 툴팁)
// Plan SC: Kano Delight — 운영자가 "왜 실패했나" 5초 안에 이해

import { getReasonMessage, type ReasonKind } from '@/modules/products/features/sync/domain/reasons';

type Props = {
  reason: ReasonKind;
  candidates?: string[];
};

const COLOR: Record<ReasonKind, string> = {
  no_ean_no_prefix: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300',
  prefix_ambiguous: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300',
  invalid_sku_format: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
  schema_drift: 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300',
  manual_flag: 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300',
};

export function ReasonTooltip({ reason, candidates }: Props) {
  const msg = getReasonMessage(reason);
  const tooltip =
    `${msg.detail}\n\n${msg.actionHint}` +
    (candidates && candidates.length > 0 ? `\n\n후보 SKU: ${candidates.join(', ')}` : '');

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${COLOR[reason]}`}
      title={tooltip}
    >
      <span>⚠</span>
      <span>{msg.title}</span>
    </span>
  );
}
