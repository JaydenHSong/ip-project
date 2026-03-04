# Extension Distribution Design Document

> **Summary**: Settings에 Extension 설치 가이드 탭 추가 + Web Store 등록 준비
>
> **Project**: Sentinel
> **Author**: Claude
> **Date**: 2026-03-04
> **Status**: Draft
> **Planning Doc**: [extension-distribution.plan.md](../../01-plan/features/extension-distribution.plan.md)

---

## 1. Overview

### 1.1 Design Goals

1. 비개발자 오퍼레이터가 5분 내 Extension 설치 완료할 수 있는 비주얼 가이드
2. Settings 내 "Extension" 탭으로 모든 사용자(Viewer/Editor/Admin)가 접근 가능
3. Web Store 승인 후 가이드 자동 전환 (직접 설치 → 스토어 링크)

### 1.2 Design Principles

- 기존 Settings 탭 패턴과 동일한 구조 (CrawlerSettings.tsx 참고)
- 스텝 바이 스텝 위자드 UI (한 번에 한 단계만 집중)
- i18n 완전 지원 (EN/KO)

---

## 2. Architecture

### 2.1 Component Diagram

```
Settings Page
├── SettingsContent.tsx (탭 라우팅)
│   ├── MonitoringSettings
│   ├── CrawlerSettings
│   ├── ScAutomationSettings
│   ├── AutoApproveSettings
│   ├── TemplatesTab
│   ├── UserManagement (Admin only)
│   └── ExtensionGuide ★ NEW (모든 사용자)
│
└── API
    └── /api/settings/extension-download/route.ts ★ NEW
```

### 2.2 Data Flow

```
User clicks "Extension" tab
  → ExtensionGuide 렌더링
  → 4단계 스텝 위자드 표시
  → "Download" 클릭 시 → /api/settings/extension-download → .zip 스트리밍
  → Web Store URL 설정된 경우 → 스토어 링크 표시
```

---

## 3. UI/UX Design

### 3.1 Extension 탭 레이아웃

```
┌─────────────────────────────────────────────────────────────┐
│ Settings                                                     │
├──────┬──────┬──────┬──────┬──────┬──────┬──────────────────┤
│ Mon. │ Craw.│ SC.. │ Auto │ Temp │ Users│ Extension ★      │
├──────┴──────┴──────┴──────┴──────┴──────┴──────────────────┤
│                                                              │
│  ┌─ Install Extension ─────────────────────────────────────┐ │
│  │                                                          │ │
│  │  Chrome Web Store (if available)                        │ │
│  │  ┌────────────────────────────────────────────────┐     │ │
│  │  │ [Chrome icon] Install from Chrome Web Store    │     │ │
│  │  │                [ Install Extension ]           │     │ │
│  │  └────────────────────────────────────────────────┘     │ │
│  │                                                          │ │
│  │  ── OR: Manual Install ──                               │ │
│  │                                                          │ │
│  │  ① ─────── ② ─────── ③ ─────── ④                       │ │
│  │  Download   Extract    Load       Verify                │ │
│  │  [active]   [dim]      [dim]      [dim]                 │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────┐       │ │
│  │  │  Step 1: Download Extension                  │       │ │
│  │  │                                              │       │ │
│  │  │  Download the Sentinel Extension package.    │       │ │
│  │  │                                              │       │ │
│  │  │  [ ↓ Download sentinel-extension-v1.0.0.zip ]│       │ │
│  │  │                                              │       │ │
│  │  │                       [← Back] [Next →]      │       │ │
│  │  └──────────────────────────────────────────────┘       │ │
│  └──────────────────────────────────────────────────────────┘ │
│                                                              │
│  ┌─ Extension Info ────────────────────────────────────────┐ │
│  │  Version: 1.0.0                                         │ │
│  │  Manifest: V3                                           │ │
│  │  Permissions: Amazon domains, Seller Central            │ │
│  └──────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Step Wizard — 4단계 상세

#### Step 1: Download
```
┌──────────────────────────────────────────────┐
│  Step 1: Download                            │
│                                              │
│  📥 Download the extension package file.     │
│                                              │
│  [ ↓ Download sentinel-extension-v1.0.0.zip ]│
│                                              │
│  File size: ~150KB                           │
│                              [Next →]        │
└──────────────────────────────────────────────┘
```

#### Step 2: Extract
```
┌──────────────────────────────────────────────┐
│  Step 2: Extract the ZIP file                │
│                                              │
│  Find the downloaded file and unzip it.      │
│                                              │
│  ┌────────────────────────────────────┐      │
│  │  📁 Downloads/                     │      │
│  │   └─ 📁 sentinel-extension/       │      │
│  │       ├─ manifest.json             │      │
│  │       ├─ background.js             │      │
│  │       ├─ content.js                │      │
│  │       └─ popup.html                │      │
│  └────────────────────────────────────┘      │
│                                              │
│  💡 Remember where you extracted it!         │
│                        [← Back] [Next →]     │
└──────────────────────────────────────────────┘
```

#### Step 3: Load in Chrome
```
┌──────────────────────────────────────────────┐
│  Step 3: Load in Chrome                      │
│                                              │
│  1. Open chrome://extensions                 │
│     (Type in address bar or click below)     │
│     [ Open Extensions Page ]                 │
│                                              │
│  2. Enable "Developer mode" (top right)      │
│     ┌─────────────────────────────────┐      │
│     │  [toggle illustration ○──●]     │      │
│     │  Developer mode                 │      │
│     └─────────────────────────────────┘      │
│                                              │
│  3. Click "Load unpacked"                    │
│     → Select the extracted folder            │
│                                              │
│  4. You should see "Sentinel" in the list    │
│                        [← Back] [Next →]     │
└──────────────────────────────────────────────┘
```

#### Step 4: Verify
```
┌──────────────────────────────────────────────┐
│  Step 4: Verify Installation                 │
│                                              │
│  ✅ Open any Amazon product page             │
│  ✅ Look for the Sentinel icon in toolbar    │
│  ✅ Click the icon to see the popup          │
│                                              │
│  🎉 You're all set!                          │
│                                              │
│  Having trouble?                             │
│  → Make sure you're on amazon.com            │
│  → Try refreshing the Amazon page            │
│  → Check that the extension is enabled       │
│                        [← Back] [Done ✓]     │
└──────────────────────────────────────────────┘
```

### 3.3 탭 접근 권한

| Tab | Viewer | Editor | Admin |
|-----|:------:|:------:|:-----:|
| Monitoring | ✅ | ✅ | ✅ |
| Extension ★ | ✅ | ✅ | ✅ |
| Crawler | ❌ | ❌ | ✅ |
| SC Auto Submit | ❌ | ❌ | ✅ |
| Auto-approve | ❌ | ❌ | ✅ |
| Templates | ✅ | ✅ | ✅ |
| Users | ❌ | ❌ | ✅ |

---

## 4. API Specification

### 4.1 Endpoint

| Method | Path | Description | Auth |
|--------|------|-------------|------|
| GET | `/api/settings/extension-download` | Extension .zip 다운로드 | Required (any role) |

### 4.2 GET /api/settings/extension-download

서버에서 `extension/dist/` 디렉토리를 zip으로 패키징하여 스트리밍 응답.

**Response:**
- Content-Type: `application/zip`
- Content-Disposition: `attachment; filename="sentinel-extension-v1.0.0.zip"`

**구현 방식:** 빌드 시 미리 생성된 .zip 파일을 public/에 두거나, API에서 동적 생성.
→ **선택: 빌드 스크립트로 미리 .zip 생성 → `public/sentinel-extension.zip`으로 서빙**이 가장 단순.

실제로는 API 라우트 없이 **정적 파일 서빙**으로 충분:
- `public/downloads/sentinel-extension-v1.0.0.zip`
- 다운로드 링크: `/downloads/sentinel-extension-v1.0.0.zip`

---

## 5. Component Design

### 5.1 ExtensionGuide.tsx

```typescript
type ExtensionGuideProps = {
  // 별도 props 불필요 — 모든 사용자 동일 UI
}

// State
// - currentStep: 0 | 1 | 2 | 3
// - webStoreUrl: string | null (환경변수 NEXT_PUBLIC_EXTENSION_STORE_URL)

// 렌더링
// 1. Web Store 섹션 (URL 있으면 표시)
// 2. Manual Install 스텝 위자드
// 3. Extension Info 카드
```

### 5.2 Step 데이터 구조

```typescript
const STEPS = [
  { key: 'download', icon: '↓', number: 1 },
  { key: 'extract',  icon: '📁', number: 2 },
  { key: 'load',     icon: '🔧', number: 3 },
  { key: 'verify',   icon: '✓', number: 4 },
] as const
```

각 스텝의 제목/설명은 i18n 키로 관리.

---

## 6. i18n Keys

### EN (en.ts)
```typescript
extension: {
  title: 'Extension',
  install: {
    title: 'Install Extension',
    webStore: {
      title: 'Chrome Web Store',
      description: 'Install Sentinel Extension from the Chrome Web Store.',
      button: 'Install Extension',
      comingSoon: 'Coming soon — use manual install below.',
    },
    manual: {
      title: 'Manual Install',
      steps: {
        download: {
          title: 'Step 1: Download',
          description: 'Download the Sentinel Extension package.',
          button: 'Download sentinel-extension-v1.0.0.zip',
          size: 'File size: ~150KB',
        },
        extract: {
          title: 'Step 2: Extract',
          description: 'Find the downloaded file and unzip it.',
          tip: 'Remember where you extracted it!',
        },
        load: {
          title: 'Step 3: Load in Chrome',
          step1: 'Open chrome://extensions (or click the button below)',
          step2: 'Enable "Developer mode" toggle (top right corner)',
          step3: 'Click "Load unpacked"',
          step4: 'Select the extracted folder',
          openExtensions: 'Open Extensions Page',
        },
        verify: {
          title: 'Step 4: Verify',
          check1: 'Open any Amazon product page',
          check2: 'Look for the Sentinel icon in the toolbar',
          check3: 'Click the icon to see the popup',
          success: "You're all set!",
          troubleshoot: 'Having trouble?',
          tip1: 'Make sure you are on amazon.com',
          tip2: 'Try refreshing the Amazon page',
          tip3: 'Check that the extension is enabled',
        },
      },
      back: 'Back',
      next: 'Next',
      done: 'Done',
    },
  },
  info: {
    title: 'Extension Info',
    version: 'Version',
    manifest: 'Manifest',
    permissions: 'Permissions',
    permissionsDesc: 'Amazon domains, Seller Central',
  },
}
```

### KO (ko.ts)
```typescript
extension: {
  title: '익스텐션',
  install: {
    title: '익스텐션 설치',
    webStore: {
      title: 'Chrome 웹 스토어',
      description: 'Chrome 웹 스토어에서 Sentinel 익스텐션을 설치하세요.',
      button: '익스텐션 설치',
      comingSoon: '준비 중입니다 — 아래 수동 설치를 이용하세요.',
    },
    manual: {
      title: '수동 설치',
      steps: {
        download: {
          title: '1단계: 다운로드',
          description: 'Sentinel 익스텐션 패키지를 다운로드하세요.',
          button: 'sentinel-extension-v1.0.0.zip 다운로드',
          size: '파일 크기: ~150KB',
        },
        extract: {
          title: '2단계: 압축 해제',
          description: '다운로드한 파일의 압축을 해제하세요.',
          tip: '압축을 해제한 위치를 기억하세요!',
        },
        load: {
          title: '3단계: Chrome에 로드',
          step1: 'chrome://extensions 페이지를 열어주세요 (또는 아래 버튼 클릭)',
          step2: '오른쪽 상단의 "개발자 모드"를 켜세요',
          step3: '"압축해제된 확장 프로그램을 로드합니다" 클릭',
          step4: '압축 해제한 폴더를 선택하세요',
          openExtensions: '확장 프로그램 페이지 열기',
        },
        verify: {
          title: '4단계: 확인',
          check1: '아마존 상품 페이지를 열어보세요',
          check2: '툴바에서 Sentinel 아이콘을 확인하세요',
          check3: '아이콘을 클릭해서 팝업을 확인하세요',
          success: '설치 완료!',
          troubleshoot: '문제가 있나요?',
          tip1: 'amazon.com에 접속해 있는지 확인하세요',
          tip2: '아마존 페이지를 새로고침 해보세요',
          tip3: '익스텐션이 활성화 상태인지 확인하세요',
        },
      },
      back: '이전',
      next: '다음',
      done: '완료',
    },
  },
  info: {
    title: '익스텐션 정보',
    version: '버전',
    manifest: '매니페스트',
    permissions: '권한',
    permissionsDesc: '아마존 도메인, Seller Central',
  },
}
```

---

## 7. Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `NEXT_PUBLIC_EXTENSION_STORE_URL` | Chrome Web Store URL (비공개 링크) | Optional — 없으면 "Coming soon" 표시 |

---

## 8. Implementation Order

1. [x] Extension .zip 패키징 스크립트 (`scripts/package-extension.sh`)
2. [x] .zip → `public/downloads/` 배치
3. [x] `ExtensionGuide.tsx` 컴포넌트 생성
4. [x] `SettingsContent.tsx` 탭 추가 (모든 사용자 접근)
5. [x] i18n 키 추가 (en.ts, ko.ts)
6. [x] 빌드 확인 + typecheck
7. [ ] Web Store 등록 (별도 — 사용자 진행)

---

## 9. Web Store 등록 가이드 (Track B — 참고)

### 필요 에셋
| 항목 | 규격 |
|------|------|
| Extension icon | 128x128 PNG (이미 있음) |
| 스토어 아이콘 | 128x128 PNG |
| 스크린샷 | 1280x800 PNG, 최소 1장 (권장 3-5장) |
| 설명 | 영문 기본, 한국어 추가 가능 |

### 등록 절차
1. [Chrome 개발자 대시보드](https://chrome.google.com/webstore/devconsole) 접속
2. 개발자 등록 ($5 일회성)
3. "New Item" → .zip 업로드
4. Visibility: **Unlisted** (비공개 — 링크 아는 사람만 설치)
5. 심사 제출 → 2-5일 소요
6. 승인 후 → `NEXT_PUBLIC_EXTENSION_STORE_URL` 환경변수에 URL 추가

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial draft | Claude |
