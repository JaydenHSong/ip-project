# Settings v2 Improvement — Design

> **Feature**: settings-v2-improvement
> **Created**: 2026-03-14
> **Phase**: Design
> **Plan Reference**: `docs/01-plan/features/settings-v2-improvement.plan.md`

---

## 1. Implementation Order

```
Phase A: AI Prompts 구조 변경 (S2 + S4)
  A1. prompt-manager.ts — PromptType union 변경
  A2. AiPromptsTab.tsx — PROMPT_TYPES 배열 변경
  A3. draft.ts → tone-suggest.ts 리네임 + 프롬프트 재설계
  A4. draft.ts (lib/ai/draft.ts) — generateDraft 업데이트
  A5. DB — ai_prompts 레코드 업데이트
    ↓
Phase B: Auto Draft 전환 (S3)
  B1. AutoApproveSettings.tsx → AutoDraftSettings.tsx 리네임 + UI 변경
  B2. /api/settings/auto-approve → /api/settings/auto-draft 리네임
  B3. /api/ai/analyze — auto-approve 로직 → auto-draft 로직
  B4. DB — system_configs key 변경, reports 컬럼 추가
  B5. SettingsContent.tsx — 탭 이름 변경
  B6. ReportDetailContent.tsx — 톤 제안 표시 UI
    ↓
Phase C: Monitoring 리디자인 (S1) — 독립
  C1. MonitoringSettings.tsx — 3개 필드로 UI 변경
  C2. /api/settings/monitoring — 새 키 지원
  C3. /api/monitoring/pending — 새 키 기반 로직
  C4. DB — system_configs 키 마이그레이션
```

---

## 2. Phase A: AI Prompts 구조 변경

### A1. prompt-manager.ts

**현재:**
```typescript
type PromptType = 'system' | 'analyze' | 'draft' | 'crawler-violation-scan' | 'crawler-thumbnail-scan'
```

**변경:**
```typescript
type PromptType = 'system' | 'tone-suggest' | 'crawler-violation-scan' | 'crawler-thumbnail-scan'
```

- `analyze` 제거
- `draft` → `tone-suggest`
- 캐시 키도 자동으로 따라감 (Map key가 PromptType)

### A2. AiPromptsTab.tsx

**현재 PROMPT_TYPES (5개):**
```typescript
[system, analyze, draft, crawler-violation-scan, crawler-thumbnail-scan]
```

**변경 PROMPT_TYPES (4개):**
```typescript
[
  { type: 'system', icon: Bot, label: 'System Prompt', description: 'Base context for all AI calls' },
  { type: 'tone-suggest', icon: FileText, label: 'Tone Suggest', description: 'Template tone/manner refinement prompt' },
  { type: 'crawler-violation-scan', icon: Sparkles, label: 'Crawler Violation Scan', description: '...' },
  { type: 'crawler-thumbnail-scan', icon: Image, label: 'Crawler Thumbnail Scan', description: '...' },
]
```

### A3. tone-suggest 프롬프트 (draft.ts → 리네임)

**파일**: `src/lib/ai/prompts/draft.ts` (내용 변경, 파일명은 유지하되 export 이름 변경)

**현재 buildDraftPrompt**: 분석 결과 기반으로 전체 드래프트 생성
**변경 buildToneSuggestPrompt**: 템플릿 원본을 받아 톤/매너만 다듬기

```typescript
const TONE_SUGGEST_TEMPLATE = `Refine the tone and manner of this BR report template text.
You are improving an Amazon Brand Registry violation report.

## Original Template Text
{{templateText}}

## Listing Context
- ASIN: {{asin}}
- Title: {{title}}
- Seller: {{seller}}
- BR Form Type: {{brFormType}}

## Format Rules (CRITICAL)
1. Preserve ALL line breaks from the original exactly as they are
2. Preserve ALL spacing and indentation
3. Preserve ALL paragraph structure and blank lines
4. Do NOT modify bracket variables: [ASIN], [SELLER], [BRAND], [TITLE], etc.
5. Do NOT add or remove lines — output must have the SAME line count as input
6. Only modify: word choice, tone, grammar, phrasing clarity
7. Keep the professional, assertive tone suitable for Amazon Brand Registry

## What to Improve
- Fix grammar and spelling errors
- Make phrasing more professional and direct
- Strengthen evidence language where appropriate
- Ensure policy references are clear
- Remove filler words or redundant phrases

## Response Format (JSON only)
{
  "suggested_text": "The refined template text with same formatting...",
  "changes": [
    { "original": "phrase before", "suggested": "phrase after", "reason": "why" }
  ]
}
`
```

**핵심**: `suggested_text`는 원본과 같은 줄 수, 같은 구조. `changes` 배열로 뭘 바꿨는지 명시.

### A4. lib/ai/draft.ts — generateDraft 업데이트

**현재**: `generateDraft()` → `buildDraftPrompt()` 호출
**변경**: `generateToneSuggestion()` 추가 (기존 generateDraft는 하위 호환용 유지)

```typescript
export const generateToneSuggestion = async (
  client: ClaudeClient,
  templateText: string,
  listing: { asin: string; title: string; seller_name: string | null; marketplace: string },
  brFormType: BrFormTypeCode,
  options: { skillContent: string; trademarks: string[] }
): Promise<ToneSuggestionResponse>
```

**ToneSuggestionResponse 타입:**
```typescript
type ToneSuggestionResponse = {
  suggested_text: string
  changes: { original: string; suggested: string; reason: string }[]
}
```

### A5. DB — ai_prompts 레코드

```sql
-- analyze 비활성화
UPDATE ai_prompts SET is_active = false WHERE prompt_type = 'analyze';

-- draft → tone-suggest 리네임
UPDATE ai_prompts SET prompt_type = 'tone-suggest' WHERE prompt_type = 'draft';
```

---

## 3. Phase B: Auto Draft 전환

### B1. AutoDraftSettings.tsx (리네임 + UI 변경)

**파일**: `AutoApproveSettings.tsx` → `AutoDraftSettings.tsx`

**현재 AutoApproveConfig:**
```typescript
{ enabled: boolean; threshold: number; types: Record<string, boolean> }
```

**변경 AutoDraftConfig:**
```typescript
{ enabled: boolean; types: Record<string, boolean> }
```

- `threshold` 제거 (데이터 완전성은 서버에서 체크, 설정 불필요)
- `types` 유지 (per-form-type 토글)
- 라벨: "Auto-Approve" → "Auto Draft"
- 설명: "Automatically generate AI tone suggestions for new reports"
- 데이터 완전성 조건 안내 텍스트 추가 (ASIN + form type + screenshot)

### B2. /api/settings/auto-draft (리네임)

**현재**: `/api/settings/auto-approve/route.ts`, DB key `auto_approve`
**변경**: `/api/settings/auto-draft/route.ts`, DB key `auto_draft`

- GET/PUT 핸들러 구조 동일
- threshold 관련 validation 제거
- DB key를 `auto_draft`로 변경
- 기존 `auto_approve` 키의 값을 `auto_draft`로 마이그레이션

### B3. /api/ai/analyze — auto-draft 로직

**현재 (lines 159-183)**: confidence >= threshold → status: approved
**변경**: 데이터 완전성 체크 → tone-suggest 호출 → ai_tone_suggestion 저장

```typescript
// Auto Draft logic
if (result.reportId) {
  const { data: autoDraftRow } = await supabase
    .from('system_configs')
    .select('value')
    .eq('key', 'auto_draft')
    .single()

  const config = autoDraftRow?.value as AutoDraftConfig | null
  if (config?.enabled) {
    const report = await supabase.from('reports').select('*').eq('id', result.reportId).single()
    const brFormType = report.data?.br_form_type
    const typeEnabled = brFormType ? config.types?.[brFormType] === true : false

    // Data completeness check
    const hasAsin = !!report.data?.listing_id
    const hasScreenshot = !!report.data?.screenshot_url
    const hasFormType = !!brFormType

    if (typeEnabled && hasAsin && hasFormType && hasScreenshot) {
      // Fire-and-forget tone suggestion generation
      generateToneSuggestion(...)
        .then((suggestion) => {
          supabase.from('reports')
            .update({ ai_tone_suggestion: suggestion })
            .eq('id', result.reportId)
        })
        .catch(() => {})
    }
  }
}
```

### B4. DB 변경

```sql
-- system_configs key 마이그레이션
UPDATE system_configs SET key = 'auto_draft' WHERE key = 'auto_approve';

-- reports에 톤 제안 컬럼 추가
ALTER TABLE reports ADD COLUMN IF NOT EXISTS ai_tone_suggestion JSONB;
```

### B5. SettingsContent.tsx

- import: `AutoApproveSettings` → `AutoDraftSettings`
- SettingsTab type: `'auto-approve'` → `'auto-draft'`
- NAV_GROUPS key: `'auto-approve'` → `'auto-draft'`
- tabLabel: `'Auto-Approve'` → `'Auto Draft'`

### B6. ReportDetailContent.tsx — 톤 제안 표시

Draft 편집 영역에서 `report.ai_tone_suggestion`이 있으면 표시:

```
┌─────────────────────────────────────────────┐
│ AI Tone Suggestion                    [Apply]│
│ ─────────────────────────────────────────── │
│ Changes:                                     │
│  • "the seller is selling" → "the seller     │
│    distributes" (more professional)          │
│  • "we want you to" → "we request that"     │
│    (formal tone)                             │
│                                              │
│ [View Full Suggested Text]                   │
└─────────────────────────────────────────────┘
```

- `changes` 배열을 리스트로 표시
- "Apply" 클릭 → `suggested_text`를 draft body에 적용
- "View Full Suggested Text" → 전체 텍스트 모달

---

## 4. Phase C: Monitoring 리디자인

### C1. MonitoringSettings.tsx

**현재 필드 (2개):**
| Field | Type | Range | Default |
|-------|------|-------|---------|
| `intervalDays` | number input | 1-30 | 7 |
| `maxDays` | number input | 7-365 | 90 |

**변경 필드 (3개):**
| Field | Type | Range | Default | Label |
|-------|------|-------|---------|-------|
| `brChecksPerDay` | dropdown | 1/2/3/4 | 2 | "BR Case Checks Per Day" |
| `brMaxMonitoringDays` | number input | 7-365 | 90 | "Max Monitoring Days" |
| `cloneThresholdDays` | number input | 7-60 | 14 | "Clone Suggestion Threshold" |

- `brChecksPerDay`: 드롭다운 (1 = Once daily, 2 = Twice daily, 3 = Three times, 4 = Four times)
- `cloneThresholdDays`: 이 일수 이상 미해결 시 리포트 목록에서 "Clone suggested" 표시

### C2. /api/settings/monitoring

**현재 DB keys:**
```typescript
{ monitoring_interval_days: number, monitoring_max_days: number }
```

**변경 DB keys:**
```typescript
{ br_checks_per_day: number, br_max_monitoring_days: number, clone_threshold_days: number }
```

- GET: 새 키 읽기, 기존 키 fallback (마이그레이션 전 호환)
- PUT: 새 키로 저장, validation 변경

### C3. /api/monitoring/pending

**현재 로직:**
```
intervalDays 기반 → (now - lastCrawled) >= intervalDays → 재방문
```

**변경 로직:**
```
brChecksPerDay 기반 → 하루를 N등분 → 마지막 체크 이후 (24/N)시간 경과 → 재방문
```

예: `brChecksPerDay = 2` → 12시간 간격. 마지막 체크로부터 12시간 경과한 케이스만 반환.

`maxDays` → `brMaxMonitoringDays` (동일 로직, 키만 변경)

### C4. DB 마이그레이션

```sql
-- 기존 키 → 새 키
UPDATE system_configs SET key = 'br_checks_per_day', value = '2'
  WHERE key = 'monitoring_interval_days';
UPDATE system_configs SET key = 'br_max_monitoring_days'
  WHERE key = 'monitoring_max_days';
-- clone_threshold_days는 신규 (upsert로 처리)
```

---

## 5. Type Changes

### src/types/reports.ts

```typescript
// 추가
ai_tone_suggestion: ToneSuggestionResponse | null
```

### src/lib/ai/prompt-manager.ts

```typescript
// 변경
type PromptType = 'system' | 'tone-suggest' | 'crawler-violation-scan' | 'crawler-thumbnail-scan'
```

---

## 6. Files Summary

### Phase A (신규/수정)
| Action | File |
|--------|------|
| 수정 | `src/lib/ai/prompt-manager.ts` — PromptType 변경 |
| 수정 | `src/lib/ai/prompts/draft.ts` — buildToneSuggestPrompt 추가 |
| 수정 | `src/lib/ai/draft.ts` — generateToneSuggestion 추가 |
| 수정 | `src/app/(protected)/settings/AiPromptsTab.tsx` — PROMPT_TYPES 변경 |
| DB | `ai_prompts` — analyze 비활성화, draft → tone-suggest |

### Phase B (신규/수정/삭제)
| Action | File |
|--------|------|
| 리네임 | `AutoApproveSettings.tsx` → `AutoDraftSettings.tsx` |
| 리네임 | `api/settings/auto-approve/` → `api/settings/auto-draft/` |
| 수정 | `src/app/api/ai/analyze/route.ts` — auto-draft 로직 |
| 수정 | `src/app/(protected)/settings/SettingsContent.tsx` — 탭 변경 |
| 수정 | `src/app/(protected)/reports/[id]/ReportDetailContent.tsx` — 톤 제안 UI |
| 수정 | `src/types/reports.ts` — ai_tone_suggestion 추가 |
| DB | `system_configs` key rename, `reports` 컬럼 추가 |

### Phase C (수정)
| Action | File |
|--------|------|
| 수정 | `src/app/(protected)/settings/MonitoringSettings.tsx` — 3필드 UI |
| 수정 | `src/app/api/settings/monitoring/route.ts` — 새 키 |
| 수정 | `src/app/api/monitoring/pending/route.ts` — 새 로직 |
| DB | `system_configs` key 마이그레이션 |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | 2026-03-14 | Initial design — 3 phases, file-level detail |
