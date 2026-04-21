// Design Ref: products-sync.design.md §7.2

export function UnmappedEmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-5xl mb-3">✅</div>
      <div className="text-lg font-medium text-[var(--text-primary)]">매칭 실패 없음</div>
      <div className="text-sm text-[var(--text-muted)] mt-1 max-w-md">
        현재 기준으로 모든 채널 리스팅이 SKU 마스터에 자동 매핑되었습니다.
        새 리스팅이 들어오면 이곳에 표시됩니다.
      </div>
    </div>
  );
}
