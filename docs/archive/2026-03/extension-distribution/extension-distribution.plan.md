# Extension Distribution Planning Document

> **Summary**: Chrome 익스텐션 배포 — Web Store 등록 + Settings 내 설치 가이드 UI
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-04
> **Status**: Draft

---

## 1. Overview

### 1.1 Purpose

Sentinel Extension을 Spigen 오퍼레이터들이 쉽게 설치할 수 있도록:
1. Chrome Web Store에 비공개(Unlisted) 등록 (심사 기간 대비 선제 진행)
2. Settings에 즉시 사용 가능한 직접 설치 가이드 제공 (개발자 모드)

### 1.2 Background

- Extension 코드 완성, `extension/dist/` 빌드 완료 상태
- Chrome은 보안상 외부 .crx 설치 차단 → 개발자 모드 사이드로딩 또는 Web Store 필요
- Web Store 심사에 수일 소요 → 두 트랙 병행 필요
- 사용자는 비개발자 오퍼레이터 → 비주얼 설치 가이드 필수

### 1.3 Related Documents

- Extension Passive Collect (archived, 99%)
- `extension/manifest.json` — Manifest V3 설정

---

## 2. Scope

### 2.1 In Scope

- [x] **Track A**: Settings > "Extension" 탭 추가 — 직접 설치 가이드 (즉시 배포)
  - .zip 다운로드 링크 (extension/dist 패키징)
  - 단계별 비주얼 설치 가이드 (개발자 모드 활성화 → 로드)
  - 설치 완료 확인 방법 안내
- [x] **Track B**: Chrome Web Store 비공개(Unlisted) 등록 준비
  - 스토어 등록용 에셋 준비 (스크린샷, 설명, 아이콘)
  - 등록 절차 가이드 문서

### 2.2 Out of Scope

- Google Workspace 관리자 강제배포 (IT팀 협조 별도)
- 자동 업데이트 시스템
- Extension 기능 변경

---

## 3. Requirements

### 3.1 Functional Requirements

| ID | Requirement | Priority | Status |
|----|-------------|----------|--------|
| FR-01 | Settings에 "Extension" 탭 추가 (모든 사용자 접근 가능) | High | Pending |
| FR-02 | Extension .zip 다운로드 API (/api/settings/extension-download) | High | Pending |
| FR-03 | 단계별 비주얼 설치 가이드 UI (4단계) | High | Pending |
| FR-04 | Chrome Web Store 등록용 .zip 패키징 스크립트 | Medium | Pending |
| FR-05 | Web Store 승인 후 → 가이드에 스토어 링크 자동 전환 | Low | Pending |
| FR-06 | i18n 지원 (EN/KO) | High | Pending |

### 3.2 설치 가이드 4단계 (Track A)

```
Step 1: Download     → .zip 파일 다운로드 버튼
Step 2: Unzip        → 다운로드 폴더에서 압축 해제
Step 3: Load         → chrome://extensions → 개발자 모드 ON → "압축해제된 확장 프로그램 로드"
Step 4: Verify       → Amazon 페이지에서 Sentinel 아이콘 확인
```

각 단계에 일러스트/스크린샷 스타일의 비주얼 카드 제공

### 3.3 Non-Functional Requirements

| Category | Criteria |
|----------|----------|
| UX | 비개발자가 5분 내 설치 완료 가능 |
| Responsive | 모바일에서도 가이드 열람 가능 (설치는 데스크톱) |

---

## 4. Success Criteria

### 4.1 Definition of Done

- [x] Settings > Extension 탭에서 .zip 다운로드 가능
- [x] 4단계 비주얼 가이드 표시
- [x] EN/KO 다국어 지원
- [x] Web Store 등록용 .zip 패키징 스크립트 작성
- [x] 빌드 성공 + typecheck 통과

---

## 5. Implementation Plan

### 5.1 Track A: 직접 설치 가이드 (즉시 배포)

| 순서 | 작업 | 파일 |
|------|------|------|
| 1 | Extension 탭 컴포넌트 | `settings/ExtensionGuide.tsx` |
| 2 | .zip 다운로드 API | `/api/settings/extension-download/route.ts` |
| 3 | SettingsContent에 탭 추가 | `settings/SettingsContent.tsx` |
| 4 | i18n 키 추가 | `locales/en.ts`, `locales/ko.ts` |
| 5 | extension/dist → .zip 패키징 스크립트 | `scripts/package-extension.sh` |

### 5.2 Track B: Chrome Web Store 등록

| 순서 | 작업 | 담당 |
|------|------|------|
| 1 | Chrome 개발자 계정 등록 ($5) | 사용자 |
| 2 | 스토어 에셋 준비 (스크린샷 5장, 설명) | Claude |
| 3 | .zip 업로드 + 심사 제출 | 사용자 |
| 4 | 심사 승인 후 가이드에 스토어 링크 추가 | Claude |

### 5.3 UI 설계 (Extension 탭)

```
┌─────────────────────────────────────────────────────┐
│ Extension Install Guide                              │
├─────────────────────────────────────────────────────┤
│                                                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ │
│  │ 1        │ │ 2        │ │ 3        │ │ 4      │ │
│  │ Download │→│ Unzip    │→│ Load     │→│ Done!  │ │
│  │ [icon]   │ │ [icon]   │ │ [icon]   │ │ [icon] │ │
│  │          │ │          │ │          │ │        │ │
│  └──────────┘ └──────────┘ └──────────┘ └────────┘ │
│                                                      │
│  Current Step: Step 1                                │
│  ┌─────────────────────────────────────────────┐    │
│  │ Download the extension package              │    │
│  │                                             │    │
│  │ Click the button below to download          │    │
│  │ sentinel-extension-v1.0.0.zip               │    │
│  │                                             │    │
│  │ [ Download Extension (.zip) ]               │    │
│  │                                             │    │
│  │                          [ Next → ]         │    │
│  └─────────────────────────────────────────────┘    │
│                                                      │
│  ── OR ──                                            │
│  Chrome Web Store: (Coming soon / Link)              │
│                                                      │
└─────────────────────────────────────────────────────┘
```

---

## 6. Risks and Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Web Store 심사 거절 | Medium | Manifest 권한 최소화, 설명 충실히 작성 |
| 개발자 모드 보안 경고 | Low | 가이드에 "사내 도구" 안내 문구 |
| Chrome 정책 변경 | Low | Web Store 등록으로 장기 대비 |

---

## 7. Next Steps

1. [ ] Design 문서 작성 (`/pdca design extension-distribution`)
2. [ ] 구현 진행
3. [ ] Web Store 등록 병행

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | Claude |
