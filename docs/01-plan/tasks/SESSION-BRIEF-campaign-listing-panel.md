# Session Brief: Campaign Listing Detail Panel Redesign

## Status: DONE
## Assigned Session: 2026-03-06
## Completed At: 2026-03-06

---

## Goal
캠페인 상세에서 리스팅 클릭 시 열리는 SlidePanel을 리포트 유무에 관계없이 보기 좋게 디자인.
현재 리포트 없는 리스팅 클릭하면 "No reports" 한 줄만 나와서 빈 패널처럼 보임.

## Priority: MEDIUM

---

## 현재 문제

### 파일: `src/app/(protected)/campaigns/[id]/CampaignDetailContent.tsx`

**Line 249-253**:
```tsx
{selectedReports.length === 0 ? (
  <p className="text-sm text-th-text-muted">{t('reports.noReports')}</p>
) : (
  // 리포트 카드들...
)}
```

- 리포트 없을 때: 큰 패널에 텍스트 한 줄 → 빈 느낌
- 크롤러 수집 리스팅 대부분은 리포트 미생성 상태 → 이 화면이 가장 많이 보임

---

## 변경 사항

### Case 1: 리포트 없는 리스팅 (주요 개선 대상)

깔끔하고 시각적으로 풍부한 리스팅 정보 카드 + 액션 버튼:

```
┌─ SlidePanel ─────────────────────────────┐
│                                          │
│  ┌─ Listing Info Card ────────────────┐  │
│  │                                    │  │
│  │  🏷️ B0XXXXXXXX          [Suspect] │  │
│  │                                    │  │
│  │  Spigen Ultra Hybrid Case for      │  │
│  │  iPhone 16 Pro Max - Crystal...    │  │
│  │                                    │  │
│  │  ─────────────────────────────     │  │
│  │  Seller    SomeStore               │  │
│  │  Source    Crawler                  │  │
│  │  Market    US                      │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Amazon Link ──────────────────────┐  │
│  │  🔗 View on Amazon  →             │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Status ───────────────────────────┐  │
│  │                                    │  │
│  │  📋 No report filed yet           │  │
│  │                                    │  │
│  │  This listing was collected by     │  │
│  │  the crawler and flagged as        │  │
│  │  suspect. Create a violation       │  │
│  │  report to start the review        │  │
│  │  process.                          │  │
│  │                                    │  │
│  │  ┌──────────────────────────────┐  │  │
│  │  │   📝 Create Report           │  │  │
│  │  └──────────────────────────────┘  │  │
│  │                                    │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

**디자인 포인트**:
- ASIN을 큰 font-mono로 강조 + Suspect/Normal 배지
- 리스팅 타이틀 2줄까지 표시 (line-clamp-2)
- Seller, Source, Marketplace를 깔끔한 dl/grid로 표시
- Amazon 링크 카드 (marketplace별 URL, `getAmazonUrl()` 재사용)
- "No report filed yet" 영역을 빈 상태 일러스트처럼 디자인
  - 아이콘 (FileWarning 또는 ClipboardList) + 설명 텍스트
  - accent 컬러 "Create Report" 버튼 (variant="primary")
- 버튼 클릭 → `/reports/new?asin={asin}&listing_id={listing_id}&marketplace={marketplace}`

**is_suspect가 false인 경우**:
- "Create Report" 버튼 대신 "This listing appears normal" 메시지
- 그래도 "Create Report" 링크는 텍스트로 제공 (혹시 수동 신고 원할 때)

### Case 2: 리포트 있는 리스팅 (기존 + 개선)

기존 리포트 카드 레이아웃 유지하되, 상단에 동일한 리스팅 정보 카드 추가:

```
┌─ SlidePanel ─────────────────────────────┐
│                                          │
│  ┌─ Listing Info (동일) ──────────────┐  │
│  │  B0XXXXXXXX  [Suspect]             │  │
│  │  Spigen Ultra Hybrid...            │  │
│  │  Seller: ... / Source: ...         │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Report #1 ────────────────────────┐  │
│  │  Status: [Draft]                   │  │
│  │  Violation: V01 Trademark...       │  │
│  │  ...기존 리포트 카드 내용...       │  │
│  └────────────────────────────────────┘  │
│                                          │
│  ┌─ Report #2 (있으면) ──────────────┐  │
│  │  ...                               │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

---

## 구현 가이드

### 리스팅 정보 카드 컴포넌트 분리

`CampaignDetailContent.tsx` 안에 인라인으로 만들거나, 재사용 가능하게 분리:

```tsx
const ListingInfoCard = ({ listing }: { listing: ListingRow }) => (
  <Card>
    <CardContent className="space-y-4">
      {/* ASIN + Badge */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-th-accent-text">
          {listing.asin}
        </span>
        {listing.is_suspect ? (
          <Badge variant="danger">Suspect</Badge>
        ) : (
          <Badge variant="success">Normal</Badge>
        )}
      </div>

      {/* Title */}
      <p className="text-sm leading-relaxed text-th-text line-clamp-2">
        {listing.title}
      </p>

      {/* Meta grid */}
      <div className="grid grid-cols-3 gap-3 border-t border-th-border pt-3">
        <div>
          <p className="text-xs text-th-text-tertiary">Seller</p>
          <p className="text-sm font-medium text-th-text truncate">
            {listing.seller_name ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-th-text-tertiary">Source</p>
          <p className="text-sm font-medium text-th-text">{listing.source}</p>
        </div>
        <div>
          <p className="text-xs text-th-text-tertiary">Market</p>
          <p className="text-sm font-medium text-th-text">
            {/* marketplace는 campaign에서 가져와야 함 */}
          </p>
        </div>
      </div>

      {/* Amazon Link */}
      <a
        href={getAmazonUrl(listing.asin, marketplace)}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 rounded-xl border border-th-border px-4 py-2.5 text-sm font-medium text-th-accent-text hover:bg-th-accent-soft transition-colors"
      >
        <ExternalLink className="h-4 w-4" />
        View on Amazon
      </a>
    </CardContent>
  </Card>
)
```

### Amazon URL 유틸

`src/lib/utils/amazon-url.ts` 또는 기존 `getAmazonUrl` 함수 재사용:
- `ReportDetailContent.tsx:87-90`에 이미 구현되어 있음
- import해서 사용하거나, 없으면 만들기

```typescript
const AMAZON_DOMAINS: Record<string, string> = {
  US: 'amazon.com', UK: 'amazon.co.uk', JP: 'amazon.co.jp',
  DE: 'amazon.de', FR: 'amazon.fr', IT: 'amazon.it',
  ES: 'amazon.es', CA: 'amazon.ca',
}

const getAmazonUrl = (asin: string, marketplace: string): string =>
  `https://www.${AMAZON_DOMAINS[marketplace] ?? 'amazon.com'}/dp/${asin}`
```

### ListingRow 타입에 marketplace 추가

현재 `ListingRow`에 marketplace가 없음. campaign.marketplace를 전달하거나 listings 쿼리에 marketplace 포함:

```typescript
// CampaignDetailContent.tsx의 ListingRow 타입
type ListingRow = {
  id: string
  asin: string
  title: string
  seller_name: string | null
  is_suspect: boolean
  source: string
  marketplace?: string  // 추가 (또는 campaign.marketplace 사용)
}
```

### /reports/new 페이지에서 query params 받기

"Create Report" 버튼이 `/reports/new?asin=xxx&listing_id=xxx&marketplace=US`로 이동하므로,
`NewReportForm.tsx`에서 URL params로 ASIN, listing_id를 초기값으로 채워주는 로직 확인/추가 필요.

---

## Design Tokens

- Card: `bg-surface-card`, `border-th-border`, `rounded-xl`
- ASIN: `font-mono text-lg font-bold text-th-accent-text`
- Meta labels: `text-xs text-th-text-tertiary`
- Meta values: `text-sm font-medium text-th-text`
- Empty state icon: `text-th-text-muted` 크기 h-12 w-12
- CTA button: `variant="primary"` (accent gradient)
- Amazon link: `text-th-accent-text hover:bg-th-accent-soft border border-th-border`

---

## Validation

1. `pnpm typecheck` PASS
2. 리포트 없는 리스팅 클릭 → 리스팅 정보 + Create Report 버튼 표시
3. 리포트 있는 리스팅 클릭 → 리스팅 정보 + 리포트 카드 표시
4. Create Report 버튼 → `/reports/new`로 이동 + ASIN 자동 채움
5. Amazon 링크 → 새 탭에서 정상 열림
6. 다크 모드에서 카드 가시성
7. 모바일에서 패널 레이아웃 정상

작업 시작하면 파일 상단의 Status를 IN_PROGRESS로, 완료하면 DONE으로 변경하고 Completed At에 날짜 적어줘.
