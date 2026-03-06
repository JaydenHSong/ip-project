# UI Restructure Plan — 설정 간소화 + 대시보드 위젯화

## 목적

설정 페이지의 탭이 10개로 과다. 사용자 경험 개선을 위해:
1. Notices를 설정에서 분리하여 독립 페이지로
2. System Status를 설정에서 분리하여 대시보드 위젯으로
3. 대시보드를 커스터마이저블 위젯 시스템으로 전환

## 현재 상태

### 설정 탭 (Owner 기준 10개)
Monitoring | Extension | Crawler | SC Automation | Auto Approve | Templates | AI Learning | Notices | Users | System Status

### 대시보드 블록 (고정 레이아웃)
- Stats Grid (6개 카드)
- Report Trend Chart + Violation Distribution
- Status Pipeline + AI Performance
- Top Violations Chart
- Recent Reports + Active Campaigns

### Notices
- 설정 > Notices 탭: Admin/Owner가 CRUD
- 헤더 우측: NoticeDropdown (모든 역할, 최근 5개 열람)

## 변경 후

### 설정 탭 (Owner 기준 8개)
Monitoring | Extension | Crawler | SC Automation | Auto Approve | Templates | AI Learning | Users

### 대시보드 (위젯 시스템)
- 모든 블록이 독립 위젯
- 각 위젯: 표시/숨김 토글, 드래그 이동, 리사이즈
- 사용자별 레이아웃 DB 저장 (user_preferences)
- System Status 위젯 추가 (Owner만)

### Notices
- 사이드바에 독립 메뉴로 이동
- /notices 페이지: Admin/Owner는 CRUD, Editor/Viewer는 읽기 전용
- 헤더 드롭다운은 그대로 유지 (빠른 열람용)

## 태스크 분할

| Task | 내용 | 의존성 |
|------|------|--------|
| TASK-11 | Notices 독립 페이지 + 설정에서 제거 | 없음 |
| TASK-12 | 대시보드 위젯 시스템 + System Status 위젯 + 설정에서 제거 | 없음 |

두 태스크는 완전히 독립적이며 병렬 작업 가능.

## 위험 요소

- react-grid-layout 의존성 추가 (번들 사이즈)
- 위젯 레이아웃 DB 저장 시 user_preferences 테이블 필요
- 모바일에서 드래그/리사이즈 UX 제한적 (모바일은 단일 컬럼 고정 권장)
