# Session Brief: IP Registry Sync UX Improvement

## Status: DONE
## Assigned Session:
## Completed At: 2026-03-06

---

## Goal
Sync 버튼 누른 후 진행 상태와 결과를 명확하게 보여주고, 새로 추가된 아이템에 "NEW" 뱃지 표시.

## Priority: MEDIUM

---

## 현재 문제

1. Sync 진행 중 — 버튼 스피너만 표시, 무슨 일이 일어나는지 모름
2. Sync 결과 — `text-xs text-th-text-muted`로 작게 표시, 모바일에서 `hidden`
3. 6초 후 자동 사라짐 — 놓치기 쉬움
4. 새로 추가된 아이템이 어떤 건지 구분 불가

---

## Task 1: Sync 결과를 Toast로 표시

### 파일: `src/app/(protected)/patents/PatentsContent.tsx`

**현재** (line 152-182):
```tsx
const handleSync = useCallback(async () => {
  setSyncing(true)
  setSyncMessage(null)
  try {
    const res = await fetch('/api/patents/sync', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      setSyncMessage(data.error?.message ?? t('patents.syncNotConfigured'))
    } else {
      // 작은 텍스트로 표시, 6초 후 사라짐
      setSyncMessage(`Sync complete — ${data.total} items (...)`)
      router.refresh()
    }
  } catch {
    setSyncMessage(t('patents.syncNotConfigured'))
  } finally {
    setSyncing(false)
    setTimeout(() => setSyncMessage(null), 6000)
  }
}, [router, t])
```

**변경**:
- `syncMessage` state 제거 (더 이상 인라인 텍스트 불필요)
- `useToast` 훅 사용 (이미 import 가능: `import { useToast } from '@/hooks/useToast'`)
- 성공/실패 모두 Toast로 표시

```tsx
const { addToast } = useToast()

const handleSync = useCallback(async () => {
  setSyncing(true)
  try {
    const res = await fetch('/api/patents/sync', { method: 'POST' })
    const data = await res.json()
    if (!res.ok) {
      addToast({
        type: 'error',
        title: 'Sync Failed',
        message: data.error?.message ?? 'Monday.com sync is not configured',
      })
    } else {
      const parts: string[] = []
      if (data.created) parts.push(`${data.created} new`)
      if (data.updated) parts.push(`${data.updated} updated`)
      if (data.errors) parts.push(`${data.errors} errors`)

      addToast({
        type: data.errors ? 'warning' : 'success',
        title: 'Sync Complete',
        message: `${data.total} items synced${parts.length > 0 ? ` (${parts.join(', ')})` : ''}`,
      })

      // 새로 생긴 아이템 ID 저장 (Task 2에서 사용)
      if (data.created_ids?.length) {
        const existing = JSON.parse(localStorage.getItem('patent_new_ids') ?? '[]')
        const merged = [...new Set([...existing, ...data.created_ids])]
        localStorage.setItem('patent_new_ids', JSON.stringify(merged))
      }

      router.refresh()
    }
  } catch {
    addToast({
      type: 'error',
      title: 'Sync Failed',
      message: 'Failed to connect to Monday.com',
    })
  } finally {
    setSyncing(false)
  }
}, [router, addToast])
```

**제거할 것**:
- `syncMessage` state (line 134)
- `setSyncMessage(...)` 모든 호출
- 헤더의 `{syncMessage && (<span>...)}` (line 309-311)

---

## Task 2: Sync API에 created_ids 반환 추가

### 파일: `src/app/api/patents/sync/route.ts`

**현재 응답** (line 84-93):
```json
{
  "synced": 8,
  "total": 120,
  "created": 5,
  "updated": 3,
  "errors": 0
}
```

**변경 — created_ids 추가**:
```json
{
  "synced": 8,
  "total": 120,
  "created": 5,
  "created_ids": ["uuid1", "uuid2", "uuid3", "uuid4", "uuid5"],
  "updated": 3,
  "errors": 0
}
```

이를 위해 `runMondaySync()` 함수의 반환값에 `createdIds: string[]` 추가 필요.

### 파일: `src/lib/patents/monday-sync.ts`

`runMondaySync` 함수에서 새로 insert한 아이템의 ID를 수집해서 반환하도록 수정.

```typescript
// 기존 result에 추가
return {
  total: ...,
  created: createdIds.length,
  created_ids: createdIds,  // 추가
  updated: ...,
  ...
}
```

### route.ts 응답에 반영:
```typescript
return NextResponse.json({
  ...기존,
  created_ids: result.created_ids ?? [],
})
```

---

## Task 3: "NEW" 뱃지 표시

### 파일: `src/app/(protected)/patents/PatentsContent.tsx`

**localStorage에서 new IDs 로드**:
```tsx
const [newIds, setNewIds] = useState<Set<string>>(new Set())

useEffect(() => {
  const stored = localStorage.getItem('patent_new_ids')
  if (stored) {
    try {
      setNewIds(new Set(JSON.parse(stored)))
    } catch { /* ignore */ }
  }
}, [])
```

**아이템 클릭 시 해당 ID 제거**:
```tsx
// setSelectedAsset 호출하는 곳에 추가
const handleSelectAsset = useCallback((asset: IpAsset) => {
  setSelectedAsset(asset)

  // NEW 뱃지 제거
  if (newIds.has(asset.id)) {
    setNewIds((prev) => {
      const next = new Set(prev)
      next.delete(asset.id)
      // localStorage 업데이트
      localStorage.setItem('patent_new_ids', JSON.stringify([...next]))
      return next
    })
  }
}, [newIds])
```

기존 `onClick={() => setSelectedAsset(asset)}` 를 `onClick={() => handleSelectAsset(asset)}` 로 교체.
적용 위치:
- 모바일 카드 (line 407)
- 데스크톱 테이블 행 (line 457)

**뱃지 렌더링**:

모바일 카드 (line 413-416 부근):
```tsx
<div className="flex items-center gap-2">
  {renderTypeBadge(asset.ip_type)}
  {renderStatusBadge(asset.status)}
  {newIds.has(asset.id) && (
    <span className="rounded-full bg-th-accent px-2 py-0.5 text-[10px] font-bold text-white animate-pulse">
      NEW
    </span>
  )}
</div>
```

데스크톱 테이블 — 관리번호 셀 (line 460):
```tsx
<td className="px-4 py-3.5 font-mono text-sm text-th-text">
  <span className="inline-flex items-center gap-2">
    {asset.management_number}
    {newIds.has(asset.id) && (
      <span className="rounded-full bg-th-accent px-1.5 py-0.5 text-[10px] font-bold text-white">
        NEW
      </span>
    )}
  </span>
</td>
```

---

## Task 4: Sync 버튼 진행 상태 개선

### 파일: `src/app/(protected)/patents/PatentsContent.tsx`

현재 버튼 (line 312-321):
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={handleSync}
  loading={syncing}
  icon={<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />}
>
  <span className="hidden md:inline">{t('patents.syncStatus')}</span>
  <span className="md:hidden">Sync</span>
</Button>
```

**변경 — 진행 중 텍스트**:
```tsx
<Button
  size="sm"
  variant="outline"
  onClick={handleSync}
  loading={syncing}
  disabled={syncing}
  icon={<RefreshCw className={`h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />}
>
  {syncing ? (
    <>
      <span className="hidden md:inline">Syncing from Monday.com...</span>
      <span className="md:hidden">Syncing...</span>
    </>
  ) : (
    <>
      <span className="hidden md:inline">{t('patents.syncStatus')}</span>
      <span className="md:hidden">Sync</span>
    </>
  )}
</Button>
```

---

## Summary of Changes

| # | File | Change |
|---|------|--------|
| 1 | `PatentsContent.tsx` | syncMessage → Toast 교체, localStorage new IDs 관리, NEW 뱃지 |
| 2 | `src/app/api/patents/sync/route.ts` | 응답에 `created_ids` 추가 |
| 3 | `src/lib/patents/monday-sync.ts` | `createdIds` 수집 + 반환 |

---

## Validation

1. `pnpm typecheck` PASS
2. Sync 버튼 → Toast 표시 확인 (성공/실패/경고)
3. 새 아이템에 "NEW" 뱃지 표시
4. 아이템 클릭 → "NEW" 뱃지 사라짐
5. 브라우저 새로고침 → "NEW" 뱃지 유지 (localStorage)
6. 모바일에서 Toast + 뱃지 정상 표시
