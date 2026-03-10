# Plan: Extension Violation Form Refactor

## Overview
익스텐션 팝업의 위반 신고 폼을 리팩토링. 카테고리 구조를 변경하고, 카테고리별 커스텀 입력 필드를 추가한다.

## Background
현재 5개 카테고리 → V01~V19 2단계 드롭다운 구조를 **IP는 2단계 유지, 나머지 5개 신규 카테고리는 1단계**로 변경.
관리자 요청에 따라 실제 Amazon 신고 폼에 맞는 필드를 카테고리별로 제공한다.

## Requirements

### REQ-1: 카테고리 드롭다운 변경
- **유지**: Intellectual Property
- **삭제**: Listing Content, Review Manipulation, Selling Practice, Regulatory / Safety
- **추가** (순서대로): Variation, Main Image, Wrong Category, Pre-announcement Listing, Review Violation

### REQ-2: 2단계 드롭다운 제거 (IP 제외)
- Intellectual Property 선택 시: 기존처럼 V01~V04 타입 선택 드롭다운 표시
- 나머지 5개 카테고리: 타입 선택 드롭다운 숨김, 바로 입력 필드 표시

### REQ-3: IP 하위 타입 수정
- V03 이름 변경: "Patent Infringement" → "Design Patent Infringement"

### REQ-4: 카테고리별 커스텀 입력 필드

| 카테고리 | 필드 1 (required) | 필드 2 (required) |
|---------|------------------|------------------|
| Variation | "Reason for Violation Report*" textarea | — |
| Main Image | "Reason for Violation Report*" textarea | — |
| Wrong Category | "Specify the Right Category*" textarea | — |
| Pre-announcement Listing | "Explain in detail*" textarea | — |
| Review Violation | "Explain in detail*" textarea | "Enter up to 10 review URLs to report, one per line.*" textarea |

### REQ-5: IP 타입별 커스텀 입력 필드 (Note 대체)

| IP 타입 | 필드 1 (required) | 필드 2 (required) |
|--------|------------------|------------------|
| V01 Trademark | "Reason for Violation Report*" textarea | — |
| V02 Copyright | "Reason for Violation Report*" textarea | "Please refer to the Spigen product link below*" textarea |
| V03 Design Patent | "Reason for Violation Report*" textarea | "Please refer to the Spigen product link below*" textarea |
| V04 Counterfeit | "Reason for Violation Report*" textarea | — |

### REQ-6: 필수 필드 Validation
- `*` 표시된 필드는 required — 비어있으면 Submit 버튼 비활성화
- 모든 required 필드가 채워져야 Submit 가능

### REQ-7: 데이터 저장 매핑

| Extension 선택 | DB user_violation_type | DB violation_category |
|---------------|----------------------|----------------------|
| IP → V01 | `V01` | `intellectual_property` |
| IP → V02 | `V02` | `intellectual_property` |
| IP → V03 | `V03` | `intellectual_property` |
| IP → V04 | `V04` | `intellectual_property` |
| Variation | `variation` | `variation` |
| Main Image | `main_image` | `main_image` |
| Wrong Category | `wrong_category` | `wrong_category` |
| Pre-announcement Listing | `pre_announcement` | `pre_announcement` |
| Review Violation | `review_violation` | `review_violation` |

- 추가 필드 데이터는 `note` 필드에 JSON 또는 구조화된 텍스트로 저장
- 2개 필드인 경우: `extra_fields` 키로 payload에 포함

## Scope

### In-Scope
1. Extension popup 카테고리/타입 드롭다운 구조 변경
2. 카테고리/타입별 동적 입력 필드 렌더링
3. Required 필드 validation + Submit 버튼 연동
4. V03 이름 변경 (Extension + Web 동기화)
5. 백엔드 API validation 업데이트 (새 카테고리 허용)
6. 웹 constants 동기화

### Out-of-Scope
- AI 분석 파이프라인 변경 (새 카테고리에 대한 AI 처리는 추후)
- BR 폼 매핑 (신규 카테고리의 BR 경로는 추후)
- 기존 V05~V19 리포트 마이그레이션

## Files to Modify

### Extension (extension/src/)
| File | Change |
|------|--------|
| `shared/constants.ts` | 카테고리 추가/삭제, V03 이름 변경 |
| `shared/types.ts` | ViolationCategory 타입 확장, SubmitReportPayload에 extra_fields |
| `popup/components/ViolationSelector.ts` | 1단계/2단계 분기, 새 카테고리 옵션 |
| `popup/components/NoteInput.ts` | → DynamicFields로 리팩토링: 카테고리/타입별 필드 렌더링 |
| `popup/components/SubmitButton.ts` | required 필드 validation 연동 |
| `popup/views/ReportFormView.ts` | FormState 확장, 동적 필드 state 관리 |
| `popup/views/PreviewView.ts` | 새 카테고리/필드 프리뷰 표시 |

### Web (src/)
| File | Change |
|------|--------|
| `constants/violations.ts` | 새 카테고리 추가, V03 이름 변경 |
| `app/api/ext/submit-report/route.ts` | 새 카테고리 validation, extra_fields 저장 |
| `components/ui/ViolationBadge.tsx` | 새 카테고리 뱃지 색상 |

### Build & Release
- Extension version: 1.6.5 → 1.7.0 (Minor: 카테고리/폼 구조 변경)
- `extension/manifest.json` + `extension/package.json` 버전 업
- 빌드 → zip → Supabase Storage 업로드 → DB 등록

## Implementation Order
1. `shared/constants.ts` + `shared/types.ts` — 데이터 모델 변경
2. `ViolationSelector.ts` — 드롭다운 구조 변경
3. `NoteInput.ts` → `DynamicFields` — 카테고리별 필드 렌더링
4. `SubmitButton.ts` + `ReportFormView.ts` — validation + state
5. `PreviewView.ts` — 프리뷰 업데이트
6. Web `constants/violations.ts` + `submit-report/route.ts` — 백엔드 동기화
7. `ViolationBadge.tsx` — UI 동기화
8. Extension 빌드 + 릴리스 (v1.7.0)

## Risks
- **기존 리포트 호환성**: 기존 V05~V19 리포트는 웹에서 정상 표시되어야 함 (constants에 기존 코드 유지)
- **카테고리 validation**: 백엔드에서 기존+신규 카테고리 모두 허용해야 함
- **Extension 배포**: zip이 git에 커밋되어 Vercel에 배포되어야 다운로드 가능
