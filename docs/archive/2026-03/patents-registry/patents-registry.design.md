# IP Registry Design Document (v2)

> **Feature**: patents-registry
> **Plan**: `docs/01-plan/features/patents-registry.plan.md`
> **Date**: 2026-03-02
> **Status**: v2 — Monday.com 실제 데이터 구조 반영
> **Previous**: v1 (가상 patent_number 기반 → 실 데이터와 불일치 확인)

---

## 0. v2 변경 배경

Monday.com에서 내보낸 6개 Excel 파일 분석 결과:

| 보드 # | 이름 | 성격 | 파일 |
|:------:|------|------|------|
| - | Patents | 특허 검토 **요청** 트래커 | `Patents_1772507949.xlsx` |
| - | Trademark | 상표 검토 **요청** 트래커 | `Trademark_1772507927.xlsx` |
| 3 | **기술특허** | 특허 자산 DB (레지스트리) | `3_1772508977.xlsx` |
| 5 | **✅상표DB** | 상표 자산 DB (70+ 컬럼) | `Copyright sample.xlsx` |
| 6 | **저작권** | 저작권 자산 DB | `6_1772509000.xlsx` |
| 8 | **온라인 플랫폼 IP신고(HQ)** | HQ IP 신고 기록 | `8_IP_HQ_1772509036.xlsx` |

**핵심 발견**:
- 기존 v1 설계는 `patent_number` (USD901234 등) 기반이었으나, 실제 Monday.com에는 **관리번호** (HQUPAT, HQTMA, HQCRA) 체계 사용
- 특허/상표/저작권 3종이 별도 보드로 관리됨 → "Patents" 페이지를 **"IP Registry"** 로 확장
- 보드 8 (온라인 플랫폼 IP신고)은 Sentinel의 Report 시스템과 기능적으로 유사 → 향후 연동 가능

---

## 1. DB Schema

### 1.1 ip_assets 테이블 (신규 — patents 테이블 대체)

```sql
CREATE TABLE ip_assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- 분류
  ip_type TEXT NOT NULL DEFAULT 'patent'
    CHECK (ip_type IN ('patent', 'trademark', 'copyright')),
  management_number TEXT UNIQUE NOT NULL,   -- HQUPAT001-E-US, HQTMA13001-US, HQCRA25011-A-KR

  -- 기본 정보
  name TEXT NOT NULL,                       -- 프로젝트명/표장/제호
  description TEXT,                         -- 권리 범위 요약 / 상품류 / 컨셉
  country TEXT NOT NULL DEFAULT 'US',
  status TEXT NOT NULL DEFAULT 'filed'
    CHECK (status IN ('preparing', 'filed', 'oa', 'registered', 'transferred', 'disputed', 'expired', 'abandoned')),

  -- 출원/등록 정보
  application_number TEXT,                  -- 출원번호 (정규)
  application_date DATE,                    -- 출원일자 (정규)
  registration_number TEXT,                 -- 등록번호
  registration_date DATE,                   -- 등록일자
  expiry_date DATE,                         -- 존속만료일

  -- 부가 정보
  keywords JSONB DEFAULT '[]',              -- AI 검색용 키워드
  image_urls JSONB DEFAULT '[]',            -- 특허 도면/표장 이미지 URL
  related_products JSONB DEFAULT '[]',      -- 관련 제품 목록 (ex: "SSbfU Core Armor Mag Fit")
  report_url TEXT,                          -- 보고서 링크 (Google Docs 등)
  assignee TEXT,                            -- 담당자
  notes TEXT,                               -- 비고

  -- Monday.com 연동
  monday_item_id TEXT,
  monday_board_id TEXT,
  synced_at TIMESTAMPTZ,

  -- 메타
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_ip_assets_type ON ip_assets(ip_type);
CREATE INDEX idx_ip_assets_status ON ip_assets(status);
CREATE INDEX idx_ip_assets_country ON ip_assets(country);
CREATE INDEX idx_ip_assets_mgmt ON ip_assets(management_number);
```

### 1.2 Status 매핑 (Monday.com → Sentinel)

| Sentinel Status | 한국어 | Monday.com 원본 (특허) | Monday.com 원본 (상표) | Monday.com 원본 (저작권) |
|:---------------:|--------|----------------------|----------------------|----------------------|
| `preparing` | 준비 | 준비 | 대기중 | 출원준비 |
| `filed` | 출원 | 출원, 출원(심사청구X) | 출원 | 출원(심사중) |
| `oa` | OA 대응 | NFOA 통지, 등록 예정 | Action필요(OA) | OA 필요 |
| `registered` | 등록 | 등록 | 등록 | 등록 |
| `transferred` | 양도 | 양도(NPE) | - | - |
| `disputed` | 분쟁 | 분쟁(진행 중) | 이의/심판 | - |
| `expired` | 만료 | 만료 | 갱신대기, 존속만료 | 만료 |
| `abandoned` | 포기/거절 | 포기, 거절 | 포기, 거절(종결) | 거절 |

### 1.3 관리번호 체계 (Monday.com 기준)

| IP Type | Prefix | Example | 구조 |
|---------|--------|---------|------|
| Patent | `HQUPAT` | HQUPAT023-A-US | HQUPAT{년도}{순번}-{버전}-{국가} |
| Trademark | `HQTMA` | HQTMA25056-AR | HQTMA{년도}{순번}-{국가} |
| Copyright | `HQCRA` | HQCRA26004-A-KR | HQCRA{년도}{순번}-{버전}-{국가} |

### 1.4 report_patents 테이블 (유지 — 향후)

```sql
-- 기존 설계 유지, FK만 ip_assets로 변경
CREATE TABLE report_ip_links (
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,
  ip_asset_id UUID NOT NULL REFERENCES ip_assets(id),
  similarity_score INTEGER CHECK (similarity_score BETWEEN 0 AND 100),
  ai_reasoning TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (report_id, ip_asset_id)
);
```

---

## 2. API Design

### 2.1 IP Assets CRUD API

| Method | Path | Description | Auth | Role |
|--------|------|-------------|:----:|:----:|
| GET | `/api/patents` | IP 자산 목록 (검색/필터/페이지네이션) | Required | viewer+ |
| GET | `/api/patents/[id]` | IP 자산 상세 | Required | viewer+ |
| POST | `/api/patents` | IP 자산 등록 | Required | admin |
| PUT | `/api/patents/[id]` | IP 자산 수정 | Required | admin |
| DELETE | `/api/patents/[id]` | IP 자산 삭제 | Required | admin |

> API 경로는 `/api/patents`를 유지 (하위 호환성). 실제로는 ip_assets 테이블 조회.

### 2.2 GET /api/patents Query Parameters

| Param | Type | Default | Description |
|-------|------|---------|-------------|
| `type` | string | - | patent / trademark / copyright 필터 |
| `search` | string | - | 관리번호, 이름, 키워드 통합 검색 |
| `status` | string | - | preparing / filed / oa / registered / ... |
| `country` | string | - | US, KR, JP 등 |
| `page` | number | 1 | 페이지 번호 |
| `limit` | number | 20 | 페이지당 항목 수 |
| `sort` | string | created_at | 정렬 기준 |
| `order` | string | desc | asc / desc |

### 2.3 POST /api/patents Request Body

```typescript
type CreateIpAssetRequest = {
  ip_type: IpType                  // 필수
  management_number: string        // 필수
  name: string                     // 필수
  description?: string
  country: string                  // 기본 'US'
  status: IpAssetStatus            // 기본 'filed'
  application_number?: string
  application_date?: string        // ISO date
  registration_number?: string
  registration_date?: string
  expiry_date?: string
  keywords?: string[]
  image_urls?: string[]
  related_products?: string[]
  report_url?: string
  assignee?: string
  notes?: string
}
```

---

## 3. Type Definitions

### 3.1 src/types/ip-assets.ts (신규 — patents.ts 대체)

```typescript
export const IP_TYPES = ['patent', 'trademark', 'copyright'] as const
export type IpType = (typeof IP_TYPES)[number]

export const IP_ASSET_STATUSES = [
  'preparing', 'filed', 'oa', 'registered',
  'transferred', 'disputed', 'expired', 'abandoned'
] as const
export type IpAssetStatus = (typeof IP_ASSET_STATUSES)[number]

export type IpAsset = {
  id: string
  ip_type: IpType
  management_number: string
  name: string
  description: string | null
  country: string
  status: IpAssetStatus
  application_number: string | null
  application_date: string | null
  registration_number: string | null
  registration_date: string | null
  expiry_date: string | null
  keywords: string[]
  image_urls: string[]
  related_products: string[]
  report_url: string | null
  assignee: string | null
  notes: string | null
  monday_item_id: string | null
  monday_board_id: string | null
  synced_at: string | null
  created_at: string
  updated_at: string
}

// 하위 호환용 — 기존 Patent 타입은 IpAsset 별칭
export type Patent = IpAsset
export type PatentStatus = IpAssetStatus
```

---

## 4. UI Design

### 4.1 Page Structure (탭 기반 IP Registry)

```
/patents (Server Component → PatentsContent 클라이언트)
├── Header: "IP Registry" + "Add IP Asset" 버튼 (Admin만)
├── Type Tabs: All | Patents | Trademarks | Copyrights (카운트 표시)
├── Search Bar: 관리번호, 이름, 키워드 통합 검색
├── Status Filter Chips: All / Preparing / Filed / OA / Registered / Expired / ...
├── Desktop: 테이블 그리드
│   ├── 컬럼: Type Icon | Mgmt # | Name | Country | Status | Reg# | Expiry | Assignee
│   └── 행 클릭 → Quick View SlidePanel
├── Mobile: 카드 리스트
│   └── 탭 → Quick View SlidePanel
├── Pagination
├── Quick View SlidePanel (size="lg")
│   ├── 타입 배지 (Patent/Trademark/Copyright)
│   ├── 관리번호, 이름, 설명
│   ├── 출원/등록 정보 그리드
│   ├── 관련 제품 태그
│   ├── 키워드 태그
│   ├── 이미지/보고서 링크
│   └── Admin: 수정/삭제 버튼
├── Add/Edit SlidePanel (size="lg")
│   ├── IP Type 선택 (patent/trademark/copyright)
│   ├── 기본 정보 폼
│   ├── 출원/등록 정보 폼
│   └── 부가 정보 폼
└── Delete Confirm Modal
```

### 4.2 Type Badge

| Type | Icon | Color | Label (EN) | Label (KO) |
|------|------|-------|-----------|-----------|
| patent | Shield | blue | Patent | 특허 |
| trademark | Tag | purple | Trademark | 상표 |
| copyright | Copyright | orange | Copyright | 저작권 |

### 4.3 Status Badge Colors

| Status | Color | Label (EN) | Label (KO) |
|--------|-------|-----------|-----------|
| preparing | gray | Preparing | 준비 |
| filed | blue | Filed | 출원 |
| oa | yellow | OA Required | OA 대응 |
| registered | green | Registered | 등록 |
| transferred | indigo | Transferred | 양도 |
| disputed | orange | Disputed | 분쟁 |
| expired | red | Expired | 만료 |
| abandoned | gray-dark | Abandoned | 포기 |

### 4.4 Country Options (Monday.com 데이터 기반 확장)

| Code | Name | 비고 |
|------|------|------|
| US | United States | 가장 많은 건수 |
| KR | South Korea | 한국 출원 |
| JP | Japan | |
| DE | Germany | |
| CN | China | |
| EU | European Union | |
| AR | Argentina | 상표DB에서 발견 |
| AU | Australia | 상표DB에서 발견 |
| CA | Canada | 상표DB에서 발견 |
| GB | United Kingdom | 상표DB에서 발견 |
| TH | Thailand | 상표DB에서 발견 |
| IN | India | 기술특허에서 발견 |

---

## 5. Demo Data

### 5.1 샘플 데이터 (DEMO_IP_ASSETS) — Monday.com 실제 데이터 기반

```typescript
export const DEMO_IP_ASSETS: IpAsset[] = [
  // === 특허 (Board 3 기반) ===
  {
    id: 'ip-001',
    ip_type: 'patent',
    management_number: 'HQUPAT023-A-US',
    name: 'iPhone MagSafe Metal Ring (SPCC)',
    description: 'SPCC 소재의 메탈 플레이트가 적용된 맥세이프 케이스에만 사용 가능',
    country: 'US',
    status: 'transferred',
    application_number: '18/768,599',
    application_date: '2024-07-10',
    registration_number: '12,191,902',
    registration_date: '2025-01-07',
    expiry_date: '2044-07-10',
    keywords: ['magsafe', 'metal ring', 'SPCC', 'magnetic plate'],
    image_urls: [],
    related_products: ['Core Armor Mag Fit', 'Crystal Hybrid Mag Fit', 'Ultra Hybrid Mag Fit', 'Slim Armor Mag Fit', 'Rugged Armor Mag Fit'],
    report_url: 'https://docs.google.com/spreadsheets/d/...',
    assignee: null,
    notes: '양도(NPE) 2025-12-19',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2024-07-10T00:00:00Z',
    updated_at: '2025-12-19T00:00:00Z',
  },
  {
    id: 'ip-002',
    ip_type: 'patent',
    management_number: 'HQUPAT011-B-US',
    name: 'Spigen EZ FIT H Film',
    description: null,
    country: 'US',
    status: 'oa',
    application_number: '18/965,850',
    application_date: '2024-12-02',
    registration_number: null,
    registration_date: null,
    expiry_date: null,
    keywords: ['ez fit', 'screen protector', 'H film'],
    image_urls: [],
    related_products: [],
    report_url: null,
    assignee: null,
    notes: 'OA 대응 기간: 8/12/25 ~ 11/12/25',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2024-12-02T00:00:00Z',
    updated_at: '2025-07-07T00:00:00Z',
  },
  {
    id: 'ip-003',
    ip_type: 'patent',
    management_number: 'HQUPAT010-A-KR',
    name: 'Apple Watch Ultra Lock Fit',
    description: '심사 중 (권리 범위 미확정)',
    country: 'KR',
    status: 'filed',
    application_number: '10-2023-0105644',
    application_date: '2023-08-11',
    registration_number: null,
    registration_date: null,
    expiry_date: null,
    keywords: ['apple watch', 'lock fit', 'ultra'],
    image_urls: [],
    related_products: [],
    report_url: null,
    assignee: null,
    notes: '심사청구X',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2023-08-11T00:00:00Z',
    updated_at: '2023-08-11T00:00:00Z',
  },

  // === 상표 (Board 5 기반) ===
  {
    id: 'ip-004',
    ip_type: 'trademark',
    management_number: 'HQTMA25002-US',
    name: 'Classic Fit',
    description: '9류 - smartwatch bands, straps, protective cases adapted for holding smartwatches',
    country: 'US',
    status: 'oa',
    application_number: '98953626',
    application_date: '2025-01-10',
    registration_number: null,
    registration_date: null,
    expiry_date: null,
    keywords: ['classic fit', 'smartwatch', 'band', 'strap'],
    image_urls: [],
    related_products: [],
    report_url: null,
    assignee: null,
    notes: 'FIT 권리불요구, Suspension inquiry / 한국등록증 제출지시 완료',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2025-01-10T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
  },
  {
    id: 'ip-005',
    ip_type: 'trademark',
    management_number: 'HQTMA13011-US',
    name: 'Tough Armor',
    description: '9류 - smartphone cases, covers, protective cases',
    country: 'US',
    status: 'registered',
    application_number: null,
    application_date: null,
    registration_number: null,
    registration_date: null,
    expiry_date: null,
    keywords: ['tough armor', 'phone case', 'protective'],
    image_urls: [],
    related_products: ['SSbf Tough Armor', 'SSbfU Tough Armor', 'SSbfE Tough Armor'],
    report_url: null,
    assignee: null,
    notes: '등록 완료',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2013-01-01T00:00:00Z',
    updated_at: '2024-04-03T00:00:00Z',
  },

  // === 저작권 (Board 6 기반) ===
  {
    id: 'ip-006',
    ip_type: 'copyright',
    management_number: 'HQCRA25011-A-KR',
    name: '스코츠맨 퍼 (Scotsman Fir)',
    description: 'Flying Scotsman 모티브 기관차 디자인 — 전면부 컬러 기관차, 후면부 흑백 도면 스타일',
    country: 'KR',
    status: 'registered',
    application_number: '2025-029722',
    application_date: '2025-06-26',
    registration_number: 'C-2025-025220',
    registration_date: '2025-07-07',
    expiry_date: null,
    keywords: ['scotsman fir', 'c11', 'iphone case design', '기관차'],
    image_urls: ['https://spigen.monday.com/protected_static/11165957/resources/2217791816/HQCRA25011-A.jpg'],
    related_products: ['iPhone 16 Pro UHTM Scotsman Fir Edition'],
    report_url: null,
    assignee: '박지선/지식재산팀/HQ',
    notes: '응용미술 > 디자인',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2025-05-27T00:00:00Z',
    updated_at: '2025-07-07T00:00:00Z',
  },
  {
    id: 'ip-007',
    ip_type: 'copyright',
    management_number: 'HQCRA26003-A-KR',
    name: '블라스트 (Blast)',
    description: '레트로 음악 아카이브 감성 - 붐박스 메인, 스피커/키보드/마이크/턴테이블 레이어 구성',
    country: 'KR',
    status: 'filed',
    application_number: '2026-010988',
    application_date: '2026-02-20',
    registration_number: null,
    registration_date: null,
    expiry_date: null,
    keywords: ['blast', 'c11', 'retro', 'boombox'],
    image_urls: ['https://spigen.monday.com/protected_static/11165957/resources/2757865011/HQCRA26003-A.png'],
    related_products: ['iPhone 25 UHMF Blast Edition'],
    report_url: null,
    assignee: '박지선/지식재산팀/HQ',
    notes: '1OA 보완제출 완료 (2026-02-27)',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2026-01-27T00:00:00Z',
    updated_at: '2026-02-27T00:00:00Z',
  },
  {
    id: 'ip-008',
    ip_type: 'patent',
    management_number: '7108PAT390-A-US',
    name: 'iPhone MagSafe Metal Ring (Magnetic or Plate)',
    description: null,
    country: 'US',
    status: 'registered',
    application_number: '15/989,033',
    application_date: '2018-05-24',
    registration_number: '10,469,119',
    registration_date: '2019-11-05',
    expiry_date: '2038-05-24',
    keywords: ['magsafe', 'metal ring', 'magnetic', 'plate'],
    image_urls: [],
    related_products: [],
    report_url: 'https://docs.google.com/spreadsheets/d/...',
    assignee: null,
    notes: '양도(NPE) 2025-12-19',
    monday_item_id: null,
    monday_board_id: null,
    synced_at: null,
    created_at: '2018-05-24T00:00:00Z',
    updated_at: '2025-12-19T00:00:00Z',
  },
]

// 하위 호환: 기존 DEMO_PATENTS로도 참조 가능
export const DEMO_PATENTS = DEMO_IP_ASSETS
```

---

## 6. i18n Keys

### 6.1 English (추가/변경할 키)

```typescript
patents: {
  // 기본
  title: 'IP Registry',
  addAsset: 'Add IP Asset',
  editAsset: 'Edit IP Asset',

  // 타입 탭
  allTypes: 'All',
  patent: 'Patent',
  trademark: 'Trademark',
  copyright: 'Copyright',

  // 필드 라벨
  managementNumber: 'Mgmt Number',
  ipType: 'IP Type',
  name: 'Name',
  description: 'Description',
  country: 'Country',
  applicationNumber: 'Application #',
  applicationDate: 'Application Date',
  registrationNumber: 'Registration #',
  registrationDate: 'Registration Date',
  expiryDate: 'Expiry Date',
  keywords: 'Keywords',
  imageUrls: 'Images',
  relatedProducts: 'Related Products',
  reportUrl: 'Report Link',
  assignee: 'Assignee',
  notes: 'Notes',
  created: 'Created',

  // 상태
  preparing: 'Preparing',
  filed: 'Filed',
  oa: 'OA Required',
  registered: 'Registered',
  transferred: 'Transferred',
  disputed: 'Disputed',
  expired: 'Expired',
  abandoned: 'Abandoned',

  // 폼
  noAssets: 'No IP assets registered.',
  noExpiry: 'No expiry',
  deleteConfirm: 'Are you sure you want to delete this IP asset?',
  deleteWarning: 'This action cannot be undone.',
  form: {
    managementNumberPlaceholder: 'e.g. HQUPAT023-A-US',
    namePlaceholder: 'e.g. iPhone MagSafe Metal Ring',
    descriptionPlaceholder: 'Rights scope, product class, concept...',
    keywordsPlaceholder: 'Enter keywords separated by commas',
    imageUrlPlaceholder: 'Enter image URL',
    addImageUrl: 'Add Image URL',
    relatedProductsPlaceholder: 'Product names separated by commas',
    reportUrlPlaceholder: 'Google Docs or report URL',
    assigneePlaceholder: 'e.g. 박지선/지식재산팀/HQ',
    notesPlaceholder: 'Additional notes...',
  },

  // Monday.com
  syncStatus: 'Monday.com Sync',
  syncNotConfigured: 'Monday.com API not configured',
  syncLastAt: 'Last synced',
  totalCount: 'Total IP Assets',
  mondayItemId: 'Monday.com Item ID',
}
```

### 6.2 Korean (추가/변경할 키)

```typescript
patents: {
  title: 'IP 레지스트리',
  addAsset: 'IP 자산 등록',
  editAsset: 'IP 자산 수정',

  allTypes: '전체',
  patent: '특허',
  trademark: '상표',
  copyright: '저작권',

  managementNumber: '관리번호',
  ipType: 'IP 유형',
  name: '명칭',
  description: '설명',
  country: '국가',
  applicationNumber: '출원번호',
  applicationDate: '출원일자',
  registrationNumber: '등록번호',
  registrationDate: '등록일자',
  expiryDate: '존속만료일',
  keywords: '키워드',
  imageUrls: '이미지',
  relatedProducts: '관련 제품',
  reportUrl: '보고서 링크',
  assignee: '담당자',
  notes: '비고',
  created: '등록일',

  preparing: '준비',
  filed: '출원',
  oa: 'OA 대응',
  registered: '등록',
  transferred: '양도',
  disputed: '분쟁',
  expired: '만료',
  abandoned: '포기',

  noAssets: '등록된 IP 자산이 없습니다.',
  noExpiry: '만료일 없음',
  deleteConfirm: '이 IP 자산을 삭제하시겠습니까?',
  deleteWarning: '이 작업은 되돌릴 수 없습니다.',
  form: {
    managementNumberPlaceholder: '예: HQUPAT023-A-US',
    namePlaceholder: '예: iPhone MagSafe Metal Ring',
    descriptionPlaceholder: '권리 범위, 상품류, 컨셉 등...',
    keywordsPlaceholder: '키워드를 쉼표로 구분하여 입력',
    imageUrlPlaceholder: '이미지 URL 입력',
    addImageUrl: '이미지 URL 추가',
    relatedProductsPlaceholder: '관련 제품명을 쉼표로 구분',
    reportUrlPlaceholder: 'Google Docs 또는 보고서 URL',
    assigneePlaceholder: '예: 박지선/지식재산팀/HQ',
    notesPlaceholder: '추가 메모...',
  },

  syncStatus: 'Monday.com 동기화',
  syncNotConfigured: 'Monday.com API 미설정',
  syncLastAt: '마지막 동기화',
  totalCount: '전체 IP 자산',
  mondayItemId: 'Monday.com 항목 ID',
}
```

---

## 7. Component Design

### 7.1 PatentsContent 구조 (v2)

```
PatentsContent
├── State: typeFilter, statusFilter, searchQuery, selectedAsset, showForm, editingAsset
├── Header: "IP Registry" + "Add IP Asset" 버튼 (Admin만)
├── Type Tabs (All / Patents / Trademarks / Copyrights)
│   └── 각 탭에 해당 건수 표시: "Patents (3)"
├── Search input
├── Status Filter Chips (확장: preparing → abandoned)
├── Desktop Table (md+)
│   ├── 컬럼: [Type Icon] | Mgmt # | Name | Country | Status | Reg # | Expiry | Assignee
│   └── 행 클릭 → Quick View
├── Mobile Card List
│   ├── Type 배지 (색상별)
│   ├── 관리번호, 이름
│   └── 상태 배지, 국가
├── Pagination
├── Quick View SlidePanel (size="lg")
│   ├── Type 배지 + 관리번호 + 이름
│   ├── 설명 (있을 경우)
│   ├── 2x3 Grid: 출원번호/출원일/등록번호/등록일/존속만료일/국가
│   ├── 관련 제품 태그
│   ├── 키워드 태그
│   ├── 보고서 링크 / 이미지 URL
│   ├── 담당자, 비고
│   └── Admin: 수정/삭제 버튼
├── Add/Edit SlidePanel (size="lg")
│   ├── IP Type 라디오 (patent/trademark/copyright)
│   ├── 관리번호 (text, required)
│   ├── 명칭 (text, required)
│   ├── 설명 (textarea)
│   ├── 국가 + 상태 (2-col select)
│   ├── 출원번호 + 출원일 (2-col)
│   ├── 등록번호 + 등록일 (2-col)
│   ├── 존속만료일 (date)
│   ├── 키워드 (text → comma split)
│   ├── 관련 제품 (text → comma split)
│   ├── 보고서 URL (text)
│   ├── 담당자 (text)
│   ├── 비고 (textarea)
│   └── Submit / Cancel
└── Delete Confirm Modal
```

### 7.2 Type Icon 컴포넌트

```typescript
const IP_TYPE_CONFIG = {
  patent: {
    icon: Shield,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    label: { en: 'Patent', ko: '특허' },
  },
  trademark: {
    icon: Tag,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    label: { en: 'Trademark', ko: '상표' },
  },
  copyright: {
    icon: Copyright,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    label: { en: 'Copyright', ko: '저작권' },
  },
} as const
```

---

## 8. File Structure

### 8.1 새로 생성할 파일

```
src/
  types/
    ip-assets.ts                    # IpAsset, IpType, IpAssetStatus 타입
  lib/
    demo/
      patents.ts                    # DEMO_IP_ASSETS (v2 데이터로 교체)
  app/
    (protected)/
      patents/
        page.tsx                    # Server Component (v2)
        PatentsContent.tsx          # Client Component (v2 — 타입 탭 + 확장 필드)
    api/
      patents/
        route.ts                    # GET/POST (v2 — ip_type 지원)
        [id]/
          route.ts                  # GET/PUT/DELETE (v2)
```

### 8.2 수정할 파일

```
src/lib/i18n/locales/en.ts          # patents 섹션 v2 키로 교체
src/lib/i18n/locales/ko.ts          # patents 섹션 v2 키로 교체
src/components/layout/Sidebar.tsx   # milestone gate 제거 (CURRENT_MILESTONE 또는 Patents entry)
src/types/patents.ts                # IpAsset re-export (하위 호환)
```

---

## 9. Implementation Order

| 순서 | 작업 | 파일 | 변경 유형 |
|:----:|------|------|:---------:|
| 1 | IpAsset 타입 정의 | `src/types/ip-assets.ts` | 신규 |
| 2 | Patent 타입 하위 호환 | `src/types/patents.ts` | 수정 |
| 3 | 데모 데이터 v2 | `src/lib/demo/patents.ts` | 교체 |
| 4 | i18n 키 v2 | `en.ts`, `ko.ts` | 교체 |
| 5 | API route v2 (목록 + 생성) | `src/app/api/patents/route.ts` | 교체 |
| 6 | API route v2 (상세/수정/삭제) | `src/app/api/patents/[id]/route.ts` | 교체 |
| 7 | Server Component v2 | `src/app/(protected)/patents/page.tsx` | 교체 |
| 8 | Client Component v2 | `src/app/(protected)/patents/PatentsContent.tsx` | 교체 |
| 9 | Sidebar 가시성 수정 | `Sidebar.tsx` | 수정 |
| 10 | 빌드 + 타입체크 검증 | - | - |

---

## 10. Monday.com 동기화 가이드 (2단계 — 참고용)

### 10.1 보드별 컬럼 매핑

**Board 3 (기술특허) → ip_assets**:

| Monday Column | ip_assets Field |
|---------------|----------------|
| Name (관리번호) | management_number |
| 프로젝트 | name |
| 비고(권리 범위 요약) | description |
| 국가 | country |
| 현황 | status (매핑 필요) |
| 출원번호(정규) | application_number |
| 출원일자(정규) | application_date |
| 등록번호 | registration_number |
| 등록일자 | registration_date |
| 존속만료일 | expiry_date |
| 보고서 | report_url |
| 양도 기록일 | notes에 포함 |

**Board 5 (✅상표DB) → ip_assets**:

| Monday Column | ip_assets Field |
|---------------|----------------|
| Name (관리번호) | management_number |
| 표장 | name |
| 🟩지정상품 | description |
| 국가(T) 텍스트 | country |
| 현황 | status (매핑 필요) |
| 🩷출원번호 | application_number |
| 출원일자 | application_date |
| 💚등록번호 | registration_number |
| 등록일자 | registration_date |
| 존속만료일🔷 | expiry_date |
| 지재담당 | assignee |
| 🚩비고 | notes |

**Board 6 (저작권) → ip_assets**:

| Monday Column | ip_assets Field |
|---------------|----------------|
| Name (관리번호) | management_number |
| 제호 (제목) | name |
| 내용(컨셉) | description |
| KR (한국 고정) | country |
| 현황 | status (매핑 필요) |
| ✨신청번호 | application_number |
| 신청일자 | application_date |
| ✨등록번호 | registration_number |
| 등록일자 | registration_date |
| 존속만료일 | expiry_date |
| 지재담당 | assignee |
| 🚩비고 | notes |

### 10.2 환경 변수 (2단계)

| Variable | Purpose | Scope |
|----------|---------|-------|
| `MONDAY_API_KEY` | Monday.com API 인증 | Server |
| `MONDAY_PATENT_BOARD_ID` | Board 3 (기술특허) ID | Server |
| `MONDAY_TRADEMARK_BOARD_ID` | Board 5 (상표DB) ID | Server |
| `MONDAY_COPYRIGHT_BOARD_ID` | Board 6 (저작권) ID | Server |

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-02 | Initial design — 가상 patent_number 기반 | Claude |
| 0.2 | 2026-03-02 | **v2 재설계** — Monday.com 실제 데이터 반영, IP Registry 확장 (patent+trademark+copyright), 관리번호 체계, 확장 상태값, 타입 탭 UI | Claude |
