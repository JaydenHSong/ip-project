# AI Analysis Pipeline — Plan Document

> Sentinel MS2 핵심 기능: 크롤러/Extension으로 수집된 리스팅을 Claude AI가 자동 분석하고 신고서 드래프트를 생성하는 파이프라인

## 1. Feature Overview

### 목적
수집된 아마존 리스팅 데이터(텍스트 + 이미지 + 스크린샷)를 Claude API로 자동 분석하여:
1. 위반 여부 판단 (V01~V19)
2. 위반 심각도 + AI 확신도 산출
3. 신고서 드래프트 자동 생성
4. 스크린샷 기반 크롤링 데이터 검증 (신규)

### 대상 사용자
- **시스템** (자동): 크롤러/Extension에서 리스팅 도착 → AI 자동 분석 트리거
- **Editor/Admin** (수동): 대기열에서 AI 분석 결과 확인 + 드래프트 검토/승인

### 의존성
- **MS1 완료 필수**: Crawler (95%), Extension (91%), Web 기본 (Auth, Queue, Reports)
- **외부**: Anthropic Claude API 키, Monday.com API (특허 동기화), Supabase Storage (스크린샷)

---

## 2. Requirements

### F11 — AI 신고서 드래프트 자동 생성
- 리스팅 도착 시 자동 분석 트리거 (BullMQ 잡)
- Sonnet이 Skill 문서 참조하여 신고서 드래프트 작성
- 위반 유형, 심각도, AI 확신도 산출
- 드래프트를 `reports` 테이블에 저장 (status: `draft`)
- **우선순위**: P0

### F23 — AI 이미지 위반 분석
- Claude Vision으로 리스팅 이미지 분석
- 로고 무단 사용, 이미지 도용, 이미지 정책 위반(V08) 탐지
- 텍스트 + 이미지 결합 분석 (멀티모달)
- **우선순위**: P0

### F24 — AI 특허 유사도 분석
- 특허 레지스트리(patents 테이블) 대비 유사도 판정
- 디자인 특허: 이미지 비교, 유틸리티 특허: 기능 설명 비교
- V03(특허 침해) 전용 분석 파이프라인
- **우선순위**: P0

### F25 — Monday.com 특허 데이터 동기화
- Monday.com GraphQL API에서 특허 데이터 자동 동기화
- 하루 1회 자동 + 수동 트리거
- patents 테이블 upsert (단방향)
- **우선순위**: P0

### F37 — AI Skill 시스템
- 위반유형별 학습 문서(Skill) 관리
- Opus(Teacher)가 에디터 수정 diff 분석 → Skill 업데이트
- Sonnet(Worker)이 Skill 참조하여 드래프트 작성
- 시간 경과 → Skill 성숙 → 품질 향상 + 비용 감소
- **우선순위**: P0

### F-NEW — 스크린샷 기반 크롤링 데이터 검증
- 크롤러 파싱 데이터와 스크린샷을 AI가 크로스체크
- 불일치 시 알림 + AI가 스크린샷에서 읽은 값으로 보정
- 셀렉터 오류 자동 감지 (아마존 DOM 변경 대응)
- Haiku 사용 (비용 효율)
- **우선순위**: P0

---

## 3. Teacher-Student AI Architecture

### 모델별 역할

| 모델 | 역할 | 담당 업무 | 호출 시점 |
|------|------|----------|----------|
| **Sonnet** (Worker) | 드래프트 작성 | Skill 참조 + 리스팅 데이터 → 위반 분석 + 신고서 생성 | 매 리스팅 (100%) |
| **Opus** (Teacher) | AI 학습 | 에디터 수정 diff 분석 → 패턴 추출 → Skill 업데이트 | Re-write 건만 (~30% 초기) |
| **Haiku** (Monitor) | 검증/모니터링 | 스크린샷 크로스체크 + 팔로업 변화 감지 | 크롤링 완료 시 + 모니터링 주기 |

### 파이프라인 흐름

```
리스팅 도착 (Crawler/Extension/수동)
  ↓
[Step 0] Haiku: 스크린샷 vs 파싱 데이터 크로스체크 ← 신규!
  ├─ 일치 → 파싱 데이터 사용
  └─ 불일치 → AI 보정값 사용 + 셀렉터 오류 알림
  ↓
[Step 1] 의심 리스팅 필터 (키워드 플래그 + 규칙 기반)
  ├─ 의심 아님 → DB 저장만 (AI 미호출, 비용 절약)
  └─ 의심됨 → AI 분석 진행
  ↓
[Step 2] Sonnet: 위반 분석 + 드래프트 생성
  - 입력: 텍스트 + 이미지 + 특허 데이터 + Skill 문서
  - 출력: { violationType, severity, confidence, draft }
  ↓
[Step 3] Disagreement 체크 (Extension 경유 시)
  - user_violation_type vs ai_violation_type 비교
  - 불일치 시 disagreement_flag = true
  ↓
[Step 4] Auto-approve 체크
  ├─ ON + 확신도 ≥ 임계값 → 바로 SC 제출 (MS2 후반)
  └─ OFF 또는 미충족 → Report Queue (Editor 검토)
  ↓
[Step 5] Editor 검토
  ├─ [Approve] → SC 제출 + Opus 학습 트리거
  └─ [Re-write] → 피드백 + Sonnet 재작성 → 다시 검토
  ↓
[Step 6] Opus: 수정 diff 분석 → Skill 업데이트
  - 승인된 수정 사항에서 패턴 추출
  - 해당 위반유형 Skill 문서 자동 업데이트
```

---

## 4. Scope

### In Scope (이번 PDCA)

| # | 항목 | 설명 |
|---|------|------|
| A1 | AI 분석 API 라우트 | `POST /api/ai/analyze` — 리스팅 분석 트리거 |
| A2 | AI 분석 잡 프로세서 | BullMQ 잡 — Sonnet 호출 + 결과 저장 |
| A3 | Claude API 클라이언트 | Anthropic SDK 래퍼 (Sonnet/Opus/Haiku) |
| A4 | 프롬프트 매니저 | 위반유형별 시스템 프롬프트 + Prompt Caching |
| A5 | 스크린샷 검증 모듈 | Haiku로 파싱 데이터 vs 스크린샷 크로스체크 |
| A6 | Skill 시스템 (기본) | 위반유형별 Skill 파일 CRUD + Sonnet 참조 |
| A7 | Opus 학습 모듈 | 에디터 수정 diff → Skill 업데이트 |
| A8 | Monday.com 동기화 | 특허 데이터 자동/수동 동기화 API |
| A9 | 특허 유사도 분석 | 특허 레지스트리 대비 V03 분석 |
| A10 | 의심 리스팅 필터 | 키워드 플래그 + 규칙 기반 사전 필터링 |
| A11 | Google Chat 알림 (AI) | 드래프트 생성 완료 → 검토 필요 알림 |
| A12 | AI 분석 결과 UI 연동 | 기존 Report 상세 페이지에 AI 분석 결과 표시 |

### Out of Scope (MS2 후반 또는 MS3)

| 항목 | 이유 |
|------|------|
| SC 자동 신고 (F13a/b) | 법무 검토 대기, 별도 PDCA |
| 팔로업 모니터링 (F19/F20b) | MS3 범위 |
| Auto-approve 설정 (F34) | Skill 성숙 후 도입 |
| 대시보드 AI 통계 (F15) | MS3 범위 |

---

## 5. 스크린샷 검증 모듈 상세 (신규 기능)

### 배경
크롤링 테스트에서 확인된 문제:
- 아마존 DOM 변경 시 CSS 셀렉터가 깨져서 타이틀/가격 오류 발생
- 파싱 데이터만으로는 정확도를 보장할 수 없음
- 스크린샷은 항상 "사람이 보는 것"과 동일 → Ground Truth

### 동작 방식

```
크롤러가 저장: { parsedData, screenshotUrl }
  ↓
Haiku API 호출:
  - 이미지: 상세 페이지 스크린샷
  - 프롬프트: "이 스크린샷의 제품명, 가격, 판매자, 평점을 읽고
              아래 JSON과 비교해서 불일치 항목을 알려줘"
  - JSON: { title, price, seller, rating }
  ↓
결과:
  ├─ match: true → 파싱 데이터 그대로 사용
  └─ match: false → {
       corrections: { title: "스크린샷에서 읽은 값", ... },
       mismatchFields: ["title", "price"],
       confidence: 0.95
     }
     → 보정값으로 덮어쓰기 + 셀렉터 오류 알림 (Google Chat)
```

### 비용 추정
- Haiku Vision: ~$0.003/장 (입력 토큰 ~2K + 이미지)
- 하루 100개 리스팅 × $0.003 = **$0.30/일** (~$9/월)
- 매우 저렴 → 모든 리스팅에 적용 가능

---

## 6. 비용 추정

### 모델별 비용 (건당)

| 모델 | 용도 | 입력 토큰 | 출력 토큰 | 건당 비용 |
|------|------|----------|----------|----------|
| Sonnet | 위반 분석 + 드래프트 | ~4K (텍스트+이미지+Skill) | ~2K | ~$0.03 |
| Opus | Skill 학습 | ~6K (원본+수정+diff) | ~1K | ~$0.10 |
| Haiku | 스크린샷 검증 | ~2K (이미지+JSON) | ~500 | ~$0.003 |
| Haiku | 모니터링 (MS3) | ~2K (스크린샷 비교) | ~500 | ~$0.003 |

### 월간 비용 추정 (100건/일 기준)

| 항목 | 계산 | 월 비용 |
|------|------|--------|
| Sonnet 분석 | 100 × $0.03 × 30 | $90 |
| Opus 학습 (30%) | 30 × $0.10 × 30 | $90 |
| Haiku 검증 | 100 × $0.003 × 30 | $9 |
| **합계 (초기)** | | **~$189/월** |
| **6개월 후** (Skill 성숙) | Opus 15%, Re-write 5% | **~$110/월** |

> Prompt Caching으로 시스템 프롬프트 캐싱 시 추가 30% 절감 가능

---

## 7. Technical Approach

### API 설계

```
POST /api/ai/analyze          — 리스팅 AI 분석 트리거
POST /api/ai/verify-screenshot — 스크린샷 크로스체크
POST /api/ai/rewrite          — Re-write 요청 (피드백 포함)
POST /api/ai/learn            — Opus 학습 트리거 (승인 시 자동)

GET  /api/patents/sync         — Monday.com 동기화 (수동 트리거)
POST /api/patents/sync         — 동기화 실행

GET  /api/ai/skills            — Skill 목록
GET  /api/ai/skills/[type]     — 특정 위반유형 Skill 조회
PUT  /api/ai/skills/[type]     — Skill 수동 수정 (Admin)
```

### 파일 구조

```
src/
  lib/
    ai/
      client.ts              — Anthropic SDK 래퍼 (모델별 호출)
      prompts/
        system.ts            — 공통 시스템 프롬프트
        analyze.ts           — 위반 분석 프롬프트
        draft.ts             — 신고서 드래프트 프롬프트
        verify.ts            — 스크린샷 검증 프롬프트
        learn.ts             — Opus 학습 프롬프트
      skills/
        manager.ts           — Skill 파일 CRUD
        loader.ts            — Skill 로드 + Sonnet 프롬프트 주입
      analyze.ts             — 위반 분석 로직 (Sonnet)
      verify-screenshot.ts   — 스크린샷 검증 (Haiku)
      learn.ts               — 학습 로직 (Opus)
      rewrite.ts             — Re-write 로직 (Sonnet)
    patents/
      monday-sync.ts         — Monday.com GraphQL 클라이언트
      similarity.ts          — 특허 유사도 분석
    suspect-filter/
      index.ts               — 의심 리스팅 필터 로직
      rules.ts               — 키워드 플래그 규칙
  app/
    api/
      ai/
        analyze/route.ts     — 분석 트리거 API
        verify/route.ts      — 스크린샷 검증 API
        rewrite/route.ts     — Re-write API
        learn/route.ts       — 학습 트리거 API
        skills/route.ts      — Skill 목록 API
        skills/[type]/route.ts — Skill CRUD API
      patents/
        sync/route.ts        — Monday.com 동기화 API

skills/                       — Skill 문서 저장소 (프로젝트 루트)
  V01-trademark.md
  V02-copyright.md
  V03-patent.md
  V04-counterfeit.md
  V05-false-claims.md
  ...
  V19-expiration.md
```

### 핵심 타입

```typescript
type AIAnalysisResult = {
  violationType: string | null       // V01~V19 또는 null (위반 아님)
  severity: 'high' | 'medium' | 'low'
  confidence: number                 // 0~100
  reasoning: string                  // 판단 근거
  draft: {
    title: string
    body: string
  } | null
  imageAnalysis?: {
    logoDetected: boolean
    copyrightConcerns: string[]
    policyViolations: string[]
  }
  patentSimilarity?: {
    patentId: string
    similarityScore: number
    matchedFeatures: string[]
  }
}

type ScreenshotVerification = {
  match: boolean
  corrections: Record<string, string> | null
  mismatchFields: string[]
  confidence: number
}

type SkillDocument = {
  violationType: string              // V01~V19
  version: number
  lastUpdatedBy: 'opus' | 'admin'
  lastUpdatedAt: string
  content: string                    // Markdown
  metadata: {
    totalDrafts: number
    approveRate: number
    rewriteRate: number
  }
}
```

---

## 8. 구현 순서

| 순서 | 항목 | 의존성 | 예상 복잡도 |
|------|------|--------|------------|
| 1 | Claude API 클라이언트 + 프롬프트 매니저 | 없음 | Medium |
| 2 | 스크린샷 검증 모듈 (Haiku) | #1 | Low |
| 3 | 의심 리스팅 필터 | 없음 | Low |
| 4 | 위반 분석 + 드래프트 생성 (Sonnet) | #1, #3 | High |
| 5 | Skill 시스템 (기본 CRUD + Sonnet 참조) | #4 | Medium |
| 6 | Monday.com 특허 동기화 | 없음 | Medium |
| 7 | 특허 유사도 분석 | #1, #6 | Medium |
| 8 | AI 분석 BullMQ 잡 + API 라우트 | #2, #4, #5, #7 | Medium |
| 9 | Opus 학습 모듈 | #5 | High |
| 10 | Google Chat 알림 (드래프트 준비) | #8 | Low |
| 11 | Report UI에 AI 분석 결과 표시 | #8 | Medium |

---

## 9. 성공 기준

| 기준 | 목표 |
|------|------|
| AI 분석 정상 동작 | 리스팅 입력 → 위반 판단 + 드래프트 생성 |
| 스크린샷 검증 | 파싱 데이터 vs 스크린샷 불일치 감지 |
| Skill 시스템 | 위반유형별 Skill 파일 로드 + Sonnet 참조 |
| Opus 학습 | 에디터 수정 diff → Skill 자동 업데이트 |
| 특허 동기화 | Monday.com → patents 테이블 동기화 |
| 비용 | 건당 $0.04 이하 (Sonnet + Haiku) |
| Match Rate | PDCA Check 90% 이상 |

---

## 10. 리스크

| 리스크 | 확률 | 영향 | 대응 |
|--------|------|------|------|
| Claude API 비용 초과 | Medium | Medium | Prompt Caching, 의심 필터로 호출 최소화 |
| AI 위반 판단 오류 | Medium | High | Editor 검토 필수, Auto-approve는 Skill 성숙 후 |
| Monday.com API 변경 | Low | Medium | GraphQL 스키마 버전 고정 |
| 아마존 정책 변경 | Medium | Medium | Skill 시스템으로 빠른 대응 |
| 스크린샷 해상도 부족 | Low | Low | 캡처 해상도 1440x900 고정 |

---

## 11. 참조 문서

- `Sentinel_Project_Context.md` — 전체 기획 (Teacher-Student AI, Skill 시스템, 위반 유형)
- `docs/archive/2026-03/crawler/` — Crawler PDCA (95%)
- `docs/archive/2026-03/extension/` — Extension PDCA (91%)
- `docs/archive/2026-03/sentinel/` — Web 기본 PDCA (97%)
