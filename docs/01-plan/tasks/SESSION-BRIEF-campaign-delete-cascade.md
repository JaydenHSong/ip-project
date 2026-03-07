# Session Brief: Campaign Delete — Cascade with Listing Snapshot

## Status: DONE
## Assigned Session:
## Completed At: 2026-03-06

---

## Goal
캠페인 삭제 시 연결된 리스팅을 정리하되, 리포트가 있는 리스팅의 정보는 리포트에 스냅샷으로 복사하여 보존.

## Priority: HIGH (현재 캠페인 삭제 불가 버그)

---

## 현재 문제

캠페인 삭제 시 FK 제약 위반으로 실패:
```
campaigns ← listings.source_campaign_id (FK, CASCADE 없음)
listings ← reports.listing_id (FK NOT NULL, CASCADE 없음)
```
캠페인에 리스팅이 있으면 삭제 불가. 리스팅에 리포트가 있으면 리스팅도 삭제 불가.

---

## Solution Overview

```
캠페인 삭제 요청
  ↓
리포트가 있는 리스팅 → 리스팅 정보를 리포트의 listing_snapshot JSONB에 복사
  ↓
reports.listing_id = NULL (FK 끊기)
  ↓
listings 전부 삭제 (더 이상 참조 없음)
  ↓
캠페인 삭제
```

---

## Task 1: DB Migration

**파일**: `supabase/migrations/023_campaign_delete_cascade.sql`

```sql
-- 1. reports에 listing_snapshot 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS listing_snapshot JSONB;

-- 2. reports.listing_id NOT NULL 제약 해제
ALTER TABLE reports ALTER COLUMN listing_id DROP NOT NULL;

-- 3. listings.source_campaign_id에 ON DELETE SET NULL 추가
-- (기존 FK 삭제 후 재생성)
ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_source_campaign_id_fkey;
ALTER TABLE listings ADD CONSTRAINT listings_source_campaign_id_fkey
  FOREIGN KEY (source_campaign_id) REFERENCES campaigns(id) ON DELETE SET NULL;
```

**Supabase SQL Editor에서 먼저 실행** 후 코드 배포.

---

## Task 2: API Delete 로직 수정

**파일**: `src/app/api/campaigns/[id]/route.ts` — DELETE 핸들러 (line 112-138)

현재:
```typescript
const { error } = await supabase.from('campaigns').delete().eq('id', id)
```

변경:
```typescript
// Step 1: 이 캠페인에 연결된 리스팅 ID 조회
const { data: campaignListings } = await supabase
  .from('listings')
  .select('id')
  .eq('source_campaign_id', id)

const listingIds = (campaignListings ?? []).map(l => l.id)

if (listingIds.length > 0) {
  // Step 2: 리포트가 있는 리스팅 찾기
  const { data: linkedReports } = await supabase
    .from('reports')
    .select('id, listing_id, listings!reports_listing_id_fkey(asin, marketplace, title, description, bullet_points, images, price_amount, price_currency, seller_name, seller_id, brand, category, rating, review_count)')
    .in('listing_id', listingIds)

  // Step 3: 리포트에 listing_snapshot 복사 + listing_id NULL
  if (linkedReports && linkedReports.length > 0) {
    for (const report of linkedReports) {
      const listing = report.listings  // join 결과
      if (listing) {
        await supabase
          .from('reports')
          .update({
            listing_snapshot: listing,
            listing_id: null,
          })
          .eq('id', report.id)
      }
    }
  }

  // Step 4: 리스팅 삭제 (리포트 참조 끊었으므로 안전)
  await supabase.from('listings').delete().in('id', listingIds)
}

// Step 5: 캠페인 삭제 (campaign_results는 ON DELETE CASCADE)
const { error } = await supabase.from('campaigns').delete().eq('id', id)
```

**주의사항**:
- 리스팅이 수천 건일 수 있으므로 배치 처리 고려 (500건씩)
- 리포트 업데이트는 개별 건이므로 보통 수십 건 이내
- 전체를 트랜잭션으로 감싸는 게 이상적이지만, Supabase JS client는 트랜잭션 미지원
  → RPC 함수로 감싸거나, 실패 시 부분 삭제 상태가 될 수 있음을 감안

**더 안전한 방법 (RPC)**:
```sql
-- supabase/migrations/023에 함수 추가
CREATE OR REPLACE FUNCTION delete_campaign_cascade(p_campaign_id UUID)
RETURNS void AS $$
DECLARE
  v_listing_ids UUID[];
BEGIN
  -- 리스팅 ID 수집
  SELECT array_agg(id) INTO v_listing_ids
  FROM listings WHERE source_campaign_id = p_campaign_id;

  IF v_listing_ids IS NOT NULL THEN
    -- 리포트에 스냅샷 복사
    UPDATE reports r SET
      listing_snapshot = to_jsonb(l.*) - 'id' - 'created_at' - 'updated_at',
      listing_id = NULL
    FROM listings l
    WHERE r.listing_id = l.id
      AND l.id = ANY(v_listing_ids);

    -- 리스팅 삭제
    DELETE FROM listings WHERE id = ANY(v_listing_ids);
  END IF;

  -- 캠페인 삭제
  DELETE FROM campaigns WHERE id = p_campaign_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

API에서 호출:
```typescript
const { error } = await supabase.rpc('delete_campaign_cascade', {
  p_campaign_id: id
})
```

**권장: RPC 방식** — 트랜잭션 보장, 원자성 확보, API 코드 간결.

---

## Task 3: 프론트엔드 — listing_snapshot 대응

리포트 상세에서 리스팅 정보를 표시할 때, `listing_id`가 NULL이면 `listing_snapshot`에서 읽도록 수정.

### 파일: `src/app/api/reports/[id]/route.ts` (GET)

현재 (line 19-25):
```typescript
const { data } = await supabase
  .from('reports')
  .select('*, listings!reports_listing_id_fkey(*), users!reports_created_by_fkey(name, email)')
  .eq('id', id)
  .single()
```

변경:
```typescript
const { data } = await supabase
  .from('reports')
  .select('*, listings!reports_listing_id_fkey(*), users!reports_created_by_fkey(name, email)')
  .eq('id', id)
  .single()

// listing_id가 NULL이면 listing_snapshot 사용
if (data && !data.listings && data.listing_snapshot) {
  data.listings = data.listing_snapshot
}
```

### 파일: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

리스팅 정보 표시 부분은 이미 `report.listings`를 참조하므로, API에서 위 처리만 해주면 프론트는 변경 불필요할 수 있음. 단, `report.listings`가 null인 경우의 방어 코드 확인 필요.

### 파일: `src/app/(protected)/reports/ReportsContent.tsx`

리포트 목록에서 ASIN 표시할 때도 listing join을 사용하므로:
- `/api/reports` (목록 GET)에서도 같은 처리 필요

### 파일: `src/app/api/reports/route.ts` (GET 목록)

```typescript
// 목록 조회 후 listing_snapshot fallback 처리
const enriched = data.map(report => {
  if (!report.listings && report.listing_snapshot) {
    return { ...report, listings: report.listing_snapshot }
  }
  return report
})
```

---

## Task 4: 타입 업데이트

### 파일: `src/types/reports.ts`

```typescript
// 기존 Report 타입에 추가
listing_snapshot?: {
  asin: string
  marketplace: string
  title: string | null
  description: string | null
  seller_name: string | null
  seller_id: string | null
  brand: string | null
  price_amount: number | null
  price_currency: string
  images: unknown[]
  bullet_points: unknown[]
  // ... 필요한 필드
} | null
```

---

## Task 5: Campaign Delete UI 개선

### 파일: `src/app/(protected)/campaigns/[id]/CampaignActions.tsx`

삭제 모달에 연결 리스팅/리포트 수를 표시하면 좋음:

```tsx
<Modal open={showDeleteModal} onClose={...} title="Delete Campaign">
  <p>Are you sure you want to delete this campaign?</p>
  <div className="mt-2 rounded-lg bg-st-warning-bg p-3 text-xs text-st-warning-text">
    <p>• {listingCount} listings will be permanently deleted</p>
    <p>• {reportCount} reports will keep listing data as snapshot</p>
  </div>
  ...
</Modal>
```

이를 위해 삭제 전 통계를 가져오는 API 호출 필요 (또는 캠페인 상세 페이지에 이미 있는 stats 활용).

---

## RLS Policy 확인

campaigns_delete 정책이 서버에 적용되어 있는지 확인 필수:

```sql
-- Supabase SQL Editor에서 확인
SELECT * FROM pg_policies WHERE tablename = 'campaigns' AND cmd = 'DELETE';
```

없으면:
```sql
DROP POLICY IF EXISTS "campaigns_delete" ON campaigns;
CREATE POLICY "campaigns_delete" ON campaigns
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin'))
  );
```

---

## Implementation Order

```
1. Supabase SQL Editor에서 마이그레이션 실행 (Task 1 + RPC 함수)
2. RLS 정책 확인/적용
3. API DELETE 핸들러 수정 (Task 2 — RPC 호출)
4. 프론트 listing_snapshot fallback (Task 3)
5. 타입 업데이트 (Task 4)
6. UI 개선 (Task 5 — optional)
```

## Validation

1. `pnpm typecheck` PASS
2. 캠페인 삭제 → 성공 확인
3. 삭제된 캠페인의 리포트 상세 → 리스팅 정보 정상 표시
4. 리포트 목록에서 ASIN 표시 정상
5. 리포트 없는 캠페인 삭제 → 리스팅 전부 삭제 확인
6. 삭제 후 `/campaigns`로 정상 리다이렉트
