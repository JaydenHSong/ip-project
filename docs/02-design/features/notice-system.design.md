# Notice System — Design

> **Feature**: 사내 공지사항 시스템 (CRUD, 읽음 추적, 팝업, 검색/필터)
> **Plan**: [notice-system.plan.md](../../01-plan/features/notice-system.plan.md)
> **Created**: 2026-03-04
> **Completed**: 2026-03-11
> **Phase**: Completed

---

## 1. Implementation Items

| # | Item | Files | Description |
|---|------|-------|-------------|
| D1 | DB 스키마 | Supabase migration | `notices`, `notice_reads` 테이블 + RLS |
| D2 | Notice CRUD API | `src/app/api/notices/` | GET(목록), POST(생성), PUT(수정), DELETE(삭제) |
| D3 | 읽음 추적 API | `src/app/api/notices/[id]/read/`, `src/app/api/notices/unread/` | POST(읽음 기록), GET(미읽은 수) |
| D4 | 목록 페이지 | `src/app/(protected)/notices/` | 모바일 카드 + 데스크톱 pocket scroll 테이블 |
| D5 | 공지 폼 | `NoticeForm.tsx` | 생성/수정 모달 (title, content, category, is_pinned) |
| D6 | 상세 모달 | `NoticeDetail.tsx` | 클릭 시 상세 내용 표시 + 읽음 처리 |
| D7 | 미읽은 팝업 | `UnreadNoticePopup.tsx` | 로그인 후 미읽은 공지 팝업 |
| D8 | 헤더 드롭다운 | `NoticeDropdown.tsx` | 벨 아이콘 + 미읽은 배지 + 최근 공지 목록 |
| D9 | 권한 확장 | `NoticesContent.tsx`, `route.ts` | Editor에게 Edit/Delete 버튼 + API 권한 |
| D10 | 테이블 정렬 | `NoticesContent.tsx` | `table-fixed` + `<colgroup>` 동일 적용 |

---

## 2. Detailed Design

### D1: DB 스키마

**notices 테이블**:
```sql
CREATE TABLE notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(20) NOT NULL DEFAULT 'notice',  -- update, policy, notice, system
  is_pinned BOOLEAN DEFAULT false,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

**notice_reads 테이블**:
```sql
CREATE TABLE notice_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  notice_id UUID REFERENCES notices(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(notice_id, user_id)
);
```

### D2: API 구조

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/api/notices` | GET | all roles | 목록 (페이지네이션, 필터, 검색, 정렬) |
| `/api/notices` | POST | owner, admin, editor | 생성 |
| `/api/notices/[id]` | PUT | owner, admin, editor | 수정 |
| `/api/notices/[id]` | DELETE | owner, admin, editor | 삭제 |
| `/api/notices/[id]/read` | POST | all roles | 읽음 기록 |
| `/api/notices/unread` | GET | all roles | 미읽은 공지 목록 |

### D3: 목록 페이지 레이아웃

**모바일 (< md)**: 카드 리스트
- 미읽은 표시 (파란 점), 카테고리 배지, 시간, 작성자

**데스크톱 (>= md)**: Pocket scroll 테이블
- thead/tbody 별도 `<table>` → `table-fixed` + 동일 `<colgroup>` 적용
- 컬럼: Pin/Unread(48px) | Title(auto) | Category(100px) | Author(120px) | Date(80px) | Actions(48px)

### D4: 권한 모델

| Role | Create | Read | Edit | Delete |
|------|--------|------|------|--------|
| Owner | O | O | O | O |
| Admin | O | O | O | O |
| Editor | O | O | O | O |
| Viewer+ | X | O | X | X |
| Viewer | X | O | X | X |

### D5: 검색/필터

- **검색**: title 키워드 검색 (Enter 트리거)
- **카테고리 탭**: All / Update / Policy / Notice / System
- **정렬**: 최신순(desc) / 오래된순(asc) 토글
- **날짜 필터**: 프리셋 (전체, 오늘, 1주, 1개월)

---

## 3. 구현 파일 목록

```
src/app/(protected)/notices/
  page.tsx                  — Server Component (데이터 fetch)
  NoticesContent.tsx        — Client 목록 (모바일 카드 + 데스크톱 테이블)
  NoticeForm.tsx            — 생성/수정 모달
  NoticeDetail.tsx          — 상세 모달

src/app/api/notices/
  route.ts                  — GET(목록), POST(생성)
  [id]/route.ts             — PUT(수정), DELETE(삭제)
  [id]/read/route.ts        — POST(읽음 기록)
  unread/route.ts           — GET(미읽은 공지 목록)

src/components/features/
  UnreadNoticePopup.tsx     — 미읽은 공지 팝업

src/components/layout/
  NoticeDropdown.tsx        — 헤더 알림 드롭다운
  AppLayout.tsx             — 팝업 + 드롭다운 통합

src/types/notices.ts        — Notice, NoticeCategory 타입
src/lib/i18n/locales/       — en.ts, ko.ts 번역 키
```

---

## Version History

| Version | Date | Changes | Author |
|---------|------|---------|--------|
| 0.1 | 2026-03-04 | Initial implementation | Claude |
| 1.0 | 2026-03-11 | Completed — 전체 구현, 권한 확장, 테이블 정렬, 첫 공지 등록 | Claude |
