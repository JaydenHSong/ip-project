# BR Form Enhancement — Design

> **Feature**: BR 템플릿 관리 UI + BR 폼 추가 필드 (신고 데이터 동기화)
> **Plan**: [br-form-enhancement.plan.md](../../01-plan/features/br-form-enhancement.plan.md)
> **Created**: 2026-03-10
> **Phase**: Design

---

## 1. Implementation Items

| # | Item | Files | Description |
|---|------|-------|-------------|
| D1 | 템플릿 생성/수정 모달 | `BrTemplateSettings.tsx` | 신규 생성 + 행 클릭 수정 모달 (code, category, title, body, br_form_type, violation_codes) |
| D2 | 템플릿 body 프리뷰 + 필터 | `BrTemplateSettings.tsx` | 테이블에 body 첫 줄 미리보기, category/form_type 필터 드롭다운 |
| D3 | BR 추가 필드 UI | `ReportDetailContent.tsx` | Draft 섹션 BR 드롭다운 아래 collapsible "Additional Fields" |
| D4 | 추가 필드 → approve 동기화 | `approve/route.ts`, `br-data.ts` | 사용자 입력 seller_storefront_url, policy_url, order_id → br_submit_data |

---

## 2. Detailed Design

### D1: 템플릿 생성/수정 모달

**File**: `src/app/(protected)/settings/BrTemplateSettings.tsx`

기존에 Import/Delete만 있음. 추가:

**State 추가**:
```typescript
const [editTarget, setEditTarget] = useState<BrTemplate | null>(null)  // null = 생성 모드
const [modalOpen, setModalOpen] = useState(false)
```

**모달 폼 필드**:
```typescript
type TemplateFormData = {
  code: string
  category: string
  title: string
  body: string
  br_form_type: string
  violation_codes: string  // comma-separated input, 저장 시 split
  instruction: string
}
```

**동작**:
1. "New Template" 버튼 클릭 → `setEditTarget(null)`, `setModalOpen(true)`
2. 테이블 행 클릭 → `setEditTarget(tmpl)`, `setModalOpen(true)`
3. 저장:
   - 생성: `POST /api/br-templates` (이미 존재)
   - 수정: `PATCH /api/br-templates/:id` (이미 존재)
4. 성공 시 모달 닫기 + fetchTemplates()

**UI**:
```
┌─────────────────────────────────────┐
│ [New Template]  헤더 우측에 추가     │
├─────────────────────────────────────┤
│ Modal:                              │
│ Code:       [MI-14          ]       │
│ Category:   [Main image     ▼]     │  ← 기존 카테고리에서 선택 or 자유입력
│ Title:      [Image overlay...  ]    │
│ Form Type:  [other_policy   ▼]     │  ← BR_FORM_OPTIONS (3개)
│ Violations: [V04, V05       ]       │  ← comma-separated
│ Instruction:[optional note  ]       │
│                                     │
│ Body:                               │
│ ┌─────────────────────────────────┐ │
│ │ textarea rows=10               │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Cancel]              [Save]        │
└─────────────────────────────────────┘
```

**카테고리 옵션**: 기존 템플릿에서 distinct category 추출 + 자유 입력 허용 (datalist)

---

### D2: 템플릿 body 프리뷰 + 필터

**File**: `src/app/(protected)/settings/BrTemplateSettings.tsx`

**필터 UI** (Stats row 아래):
```typescript
const [filterCategory, setFilterCategory] = useState<string>('')
const [filterFormType, setFilterFormType] = useState<string>('')
```

```
┌──────────────────────────────────────────────────┐
│ Category: [All ▼]  Form Type: [All ▼]  Status: [All ▼] │
└──────────────────────────────────────────────────┘
```

필터링은 클라이언트 사이드 (이미 전체 로드됨).

**테이블 body 프리뷰**:
- Title 컬럼 아래에 body 첫 줄을 truncate로 표시
- 행 클릭 시 수정 모달에서 전문 확인

```typescript
// 기존 Title <td> 변경
<td className="px-4 py-3">
  <p className="font-medium text-th-text">{tmpl.title}</p>
  <p className="mt-0.5 truncate text-xs text-th-text-muted max-w-xs">
    {tmpl.body?.substring(0, 80)}...
  </p>
</td>
```

**행 클릭**:
```typescript
<tr
  key={tmpl.id}
  onClick={() => { setEditTarget(tmpl); setModalOpen(true) }}
  className="group cursor-pointer transition-colors hover:bg-th-bg-hover"
>
```

---

### D3: BR 추가 필드 UI

**File**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

BR Form Type 드롭다운 + 가이드 배너 아래에 추가 필드 섹션.

**State 추가**:
```typescript
const [brFields, setBrFields] = useState<{
  seller_storefront_url: string
  policy_url: string
  order_id: string
}>({
  seller_storefront_url: '',
  policy_url: '',
  order_id: '',
})
const [brFieldsExpanded, setBrFieldsExpanded] = useState(false)
```

**폼 타입별 표시 필드**:
```typescript
const BR_FORM_FIELDS: Record<BrFormType, (keyof typeof brFields)[]> = {
  other_policy: ['seller_storefront_url', 'policy_url'],
  incorrect_variation: [],
  product_review: ['order_id'],
}

const BR_FIELD_LABELS: Record<string, string> = {
  seller_storefront_url: 'Seller Storefront URL',
  policy_url: 'Amazon Policy URL',
  order_id: 'Order ID',
}

const BR_FIELD_PLACEHOLDERS: Record<string, string> = {
  seller_storefront_url: 'https://www.amazon.com/stores/...',
  policy_url: 'https://sellercentral.amazon.com/...',
  order_id: '111-1234567-1234567',
}
```

**UI** (가이드 배너 아래):
```
┌─────────────────────────────────────────┐
│ ▾ Additional Fields                     │  ← 클릭으로 토글
├─────────────────────────────────────────┤
│ Seller Storefront URL:                  │
│ [https://amazon.com/stores/...      ]   │
│                                         │
│ Amazon Policy URL:                      │
│ [https://sellercentral.amazon...    ]   │
└─────────────────────────────────────────┘
```

**가시성**: `showBrFormType && BR_FORM_FIELDS[brFormType].length > 0` 일 때만 표시

**비어 있으면**: 접힌 상태 기본, 입력값 있으면 자동 펼침

---

### D4: 추가 필드 → approve 동기화

**File 1**: `src/app/(protected)/reports/[id]/ReportDetailContent.tsx`

handleSubmit에서 추가 필드 전달:
```typescript
body: JSON.stringify({
  ...(hasChanges ? { edited_draft_title: editTitle, edited_draft_body: editBody } : {}),
  ...(showBrFormType ? { br_form_type: brFormType } : {}),
  ...(showBrFormType ? { br_extra_fields: brFields } : {}),
})
```

**File 2**: `src/app/api/reports/[id]/approve/route.ts`

Request body 확장:
```typescript
const body = (await req.json().catch(() => ({}))) as ApproveReportRequest & {
  br_form_type?: BrFormType
  br_extra_fields?: {
    seller_storefront_url?: string
    policy_url?: string
    order_id?: string
  }
}
```

approve route listing 쿼리에 seller_storefront_url 추가:
```typescript
.select('asin, marketplace, title, url, seller_storefront_url')
```

buildBrSubmitData 호출 시 extra fields 전달:
```typescript
const brSubmitData = listing && isBrReportable(report.user_violation_type)
  ? buildBrSubmitData({
      report: { ... },
      listing: { asin, url, marketplace, seller_storefront_url: listing.seller_storefront_url },
      formTypeOverride: body.br_form_type,
      extraFields: body.br_extra_fields,
    })
  : null
```

**File 3**: `src/lib/reports/br-data.ts`

BuildBrDataInput 확장:
```typescript
type BuildBrDataInput = {
  report: { ... }
  listing: { ... }
  formTypeOverride?: BrFormType
  extraFields?: {
    seller_storefront_url?: string
    policy_url?: string
    order_id?: string
  }
}
```

buildBrSubmitData에서 병합:
```typescript
// 기존 listing 기반 자동 주입 후, extraFields로 오버라이드
if (extraFields?.seller_storefront_url) {
  data.seller_storefront_url = extraFields.seller_storefront_url
}
if (extraFields?.policy_url) {
  data.policy_url = extraFields.policy_url
}
if (extraFields?.order_id) {
  data.order_id = extraFields.order_id
}
```

우선순위: `extraFields` (사용자 입력) > `listing` (자동) > 없음

---

## 3. Implementation Order

```
1. D1: 템플릿 생성/수정 모달 (30분)
2. D2: body 프리뷰 + 필터 (15분)
3. D4: br-data.ts extraFields 확장 + approve route (10분)
4. D3: ReportDetailContent 추가 필드 UI (20분)
5. Build + Test
```

## 4. Data Flow

```
[Settings > BR Templates]
  ├──→ 행 클릭 → 수정 모달 → PATCH /api/br-templates/:id
  └──→ New Template → 생성 모달 → POST /api/br-templates

[Report Detail > Draft Section]
  ├──→ BR Form Type 드롭다운 (기존)
  ├──→ Additional Fields (새로 추가)
  │     ├── seller_storefront_url
  │     ├── policy_url
  │     └── order_id
  │
  └──→ Approve 클릭
        └──→ POST /api/reports/:id/approve {
               br_form_type,
               br_extra_fields: { seller_storefront_url, policy_url, order_id }
             }
        └──→ buildBrSubmitData({ ..., extraFields })
        └──→ br_submit_data에 모든 필드 포함 → 크롤러가 BR 폼 fill
```

---

**Next Phase**: `/pdca do br-form-enhancement`
