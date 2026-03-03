# Supabase Setup Guide

Sentinel 프로젝트의 Supabase 실 연동을 위한 단계별 설정 가이드.

---

## Step 1: Supabase 프로젝트 생성

1. https://supabase.com/dashboard 접속
2. **New Project** 클릭
3. 설정:
   - **Organization**: 선택 또는 신규 생성
   - **Project Name**: `sentinel`
   - **Database Password**: 강력한 비밀번호 (별도 저장)
   - **Region**: `Northeast Asia (Tokyo)` — ap-northeast-1
   - **Plan**: Free (개발용) 또는 Pro (운영용)
4. 프로젝트 생성 완료까지 약 2분 대기

## Step 2: 환경변수 복사

Supabase Dashboard에서:

1. **Settings** > **API** 메뉴 이동
2. 아래 값들을 `.env.local`에 입력:

| Dashboard 위치 | 환경변수 |
|---------------|---------|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| anon public key | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| service_role key (Show 클릭) | `SUPABASE_SERVICE_ROLE_KEY` |

> **주의**: `service_role` 키는 RLS를 우회합니다. 절대 클라이언트에 노출하지 마세요.

## Step 3: 마이그레이션 실행

Supabase Dashboard > **SQL Editor** 에서 순서대로 실행:

| 순서 | 파일 | 내용 |
|:----:|------|------|
| 1 | `001_initial_schema.sql` | 테이블 16개 + 인덱스 + 트리거 |
| 2 | `002_rls_policies.sql` | Row Level Security 정책 |
| 3 | `003_seed_data.sql` | 상품 카테고리 + 상표 + 시스템 설정 |
| 4 | `004_add_archived_status.sql` | archived 상태 + 모니터링 시드 |
| 5 | `005_add_screenshot_url.sql` | 스크린샷 URL 컬럼 |
| 6 | `005_report_templates.sql` | 리포트 템플릿 테이블 |
| 7 | `006_seed_templates.sql` | 73개 템플릿 시드 데이터 |
| 8 | `007_fix_schema_mismatches.sql` | sc_submit_data, details JSONB, audit CHECK 확장 |
| 9 | `008_auto_create_public_user.sql` | auth.users → public.users 자동 생성 트리거 |

각 파일의 전체 내용을 복사하여 SQL Editor에 붙여넣고 **Run** 클릭.

> 실행 순서가 중요합니다. 번호 순서를 반드시 지켜주세요.

## Step 4: Google OAuth 설정

### 4-1. GCP Console에서 OAuth Client ID 생성

1. https://console.cloud.google.com/apis/credentials 접속
2. **Create Credentials** > **OAuth client ID**
3. Application type: **Web application**
4. Name: `Sentinel`
5. Authorized redirect URIs 추가:
   ```
   https://YOUR_PROJECT.supabase.co/auth/v1/callback
   ```
   (`YOUR_PROJECT`을 실제 Supabase 프로젝트 ID로 대체)
6. **Create** 클릭
7. Client ID와 Client Secret을 `.env.local`에 입력

### 4-2. Supabase에서 Google Provider 활성화

1. Supabase Dashboard > **Authentication** > **Providers**
2. **Google** 찾아서 **Enable** 토글
3. Client ID와 Client Secret 입력
4. **Save**

## Step 5: Storage 버킷 생성

1. Supabase Dashboard > **Storage**
2. **New Bucket** 클릭
3. 설정:
   - **Name**: `monitoring`
   - **Public**: No (Private)
   - **File size limit**: 5MB
   - **Allowed MIME types**: `image/png, image/jpeg, image/webp`
4. **Create bucket**

## Step 6: 로컬 테스트

```bash
# 1. .env.local에서 DEMO_MODE 변경
DEMO_MODE=false

# 2. 개발 서버 실행
pnpm dev

# 3. 브라우저에서 접속
# http://localhost:3000
# → Google 로그인 (@spigen.com 계정)
# → Dashboard 페이지 확인
```

### 확인 사항

- [ ] Google 로그인 성공 (로그인 후 Dashboard 표시)
- [ ] Dashboard에 실 데이터 표시 (또는 빈 상태)
- [ ] Campaigns 페이지 접근 가능
- [ ] Reports 페이지 접근 가능
- [ ] Audit Logs 페이지 접근 가능 (Admin 전용)

## Step 7: Vercel 배포

1. Vercel Dashboard > 프로젝트 Settings > Environment Variables
2. 아래 변수들 추가 (Production + Preview 환경):

| Variable | Value |
|----------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJ...` |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJ...` |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `xxx` |
| `NEXT_PUBLIC_APP_URL` | `https://ip-project-khaki.vercel.app` |

3. **Redeploy** (Settings 변경 후 재배포 필요)

> `DEMO_MODE`는 Vercel에 추가하지 않으면 자동으로 `false` (실 연동 모드).

---

## Troubleshooting

### "Invalid login credentials" 에러
- Supabase Auth > Providers > Google이 활성화되어 있는지 확인
- GCP Console의 redirect URI가 정확한지 확인 (`YOUR_PROJECT.supabase.co/auth/v1/callback`)

### "Row Level Security" 관련 에러
- `002_rls_policies.sql` 마이그레이션이 실행되었는지 확인
- API Route에서 `createAdminClient()`를 사용하는지 확인 (RLS 우회 필요한 경우)

### 데이터가 안 보이는 경우
- `.env.local`에서 `DEMO_MODE=false` 확인
- Supabase Table Editor에서 테이블에 데이터 존재 여부 확인
- 브라우저 개발자 도구 > Network 탭에서 API 응답 확인

### 첫 사용자 Admin 권한 부여
- Supabase Dashboard > Table Editor > `users` 테이블
- 본인 행의 `role` 컬럼을 `admin`으로 직접 변경
