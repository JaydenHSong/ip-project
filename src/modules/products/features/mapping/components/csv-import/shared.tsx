'use client';

// Shared sub-components for CSV import flow (steps + summary cards + badges)

export type Step = 1 | 2 | 3;

export function Steps({ step }: { step: Step }) {
  const items: Array<{ n: Step; label: string }> = [
    { n: 1, label: '파일 선택' },
    { n: 2, label: '미리보기 및 충돌 확인' },
    { n: 3, label: '결과' },
  ];
  return (
    <div className="border-b border-[var(--border-primary)] px-6 py-4 bg-[var(--bg-secondary)]">
      <ol className="flex items-center text-sm">
        {items.map((it, i) => (
          <span key={it.n} className="flex items-center">
            {i > 0 && <span className="mx-3 h-px w-8 bg-[var(--border-secondary)]" />}
            <StepDot n={it.n} state={step > it.n ? 'done' : step === it.n ? 'current' : 'todo'} />
            <span className={step >= it.n ? 'font-medium' : 'text-[var(--text-muted)]'}>
              {it.label}
            </span>
          </span>
        ))}
      </ol>
    </div>
  );
}

function StepDot({ n, state }: { n: Step; state: 'todo' | 'current' | 'done' }) {
  const base = 'size-6 rounded-full flex items-center justify-center text-[11px] font-bold mr-2';
  if (state === 'done') return <span className={`${base} badge-success`}>✓</span>;
  if (state === 'current') return <span className={`${base} badge-primary`}>{n}</span>;
  return <span className={`${base} badge-neutral`}>{n}</span>;
}

export function SummaryCard({
  label,
  value,
  tone = 'neutral',
}: {
  label: string;
  value: number;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral';
}) {
  const bg =
    tone === 'success' ? 'badge-success'
    : tone === 'warning' ? 'badge-warning'
    : tone === 'danger' ? 'badge-danger'
    : tone === 'info' ? 'badge-info'
    : 'badge-neutral';
  return (
    <div className={`${bg} rounded-xl p-4`}>
      <p className="text-xs font-medium">{label}</p>
      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
    </div>
  );
}

export function RowStatusBadge({ status }: { status: 'ok' | 'conflict' | 'invalid' }) {
  const map = {
    ok: { cls: 'badge-success', label: '✓ OK' },
    conflict: { cls: 'badge-warning', label: '⚠ Conflict' },
    invalid: { cls: 'badge-danger', label: '✕ Invalid' },
  } as const;
  const { cls, label } = map[status];
  return (
    <span className={`${cls} inline-flex rounded px-1.5 py-0.5 text-[11px] font-medium`}>
      {label}
    </span>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <div className="mb-4 badge-danger rounded-lg p-3 text-sm">{message}</div>;
}
