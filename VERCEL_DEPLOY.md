# Vercel 배포 가이드

## 1. 저장소 연결

1. [vercel.com](https://vercel.com) 로그인 후 **Add New** → **Project**
2. GitHub/GitLab/Bitbucket에서 이 저장소를 import
3. **Root Directory**는 그대로 `.` (프로젝트 루트)
4. **Framework Preset**: Next.js (자동 감지됨)
5. **Build Command**: `next build` (기본값)
6. **Output Directory**: `.next` (기본값)

## 2. 환경 변수 설정

Vercel 대시보드 → 프로젝트 → **Settings** → **Environment Variables**에서 아래 변수를 추가하세요.

### 필수 (Firebase)

| 이름 | 설명 | 예시 |
|------|------|------|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase API 키 | (Firebase 콘솔에서 복사) |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Auth 도메인 | `프로젝트ID.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase 프로젝트 ID | |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Storage 버킷 | `프로젝트ID.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | 메시징 Sender ID | |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase App ID | |

### 선택 (기능별)

| 이름 | 설명 |
|------|------|
| `NEXT_PUBLIC_GA_MEASUREMENT_ID` | Google Analytics (G-xxxx) |
| `NEXT_PUBLIC_BACKEND_URL` | NestJS 백엔드 URL (프록시용, 예: `https://api.도메인.com`) |
| `NEXT_PUBLIC_API_URL` | API 기본 URL (관리자 등에서 사용) |
| `NEXT_PUBLIC_MINECRAFT_SERVER_HOST` | 마인크래프트 서버 호스트 (표시용) |
| `NEXT_PUBLIC_MINECRAFT_SERVER_PORT` | 마인크래프트 서버 포트 (표시용) |

### API 라우트용 (서버 사이드, 선택)

SOOP 로그인/콜백을 Vercel에서 쓰는 경우에만 설정합니다.

| 이름 | 설명 |
|------|------|
| `SOOP_CLIENT_ID` | SOOP OAuth 클라이언트 ID |
| `SOOP_CLIENT_SECRET` | SOOP OAuth 시크릿 |
| `SOOP_REDIRECT_URI` | 콜백 URL (예: `https://도메인.vercel.app/api/auth/soop/callback`) |

- **Environment**: Production, Preview, Development 에 모두 체크하거나, Production만 체크해도 됩니다.

## 3. Firebase 설정 (배포 도메인 허용)

1. [Firebase Console](https://console.firebase.google.com) → 프로젝트 → **Authentication** → **Settings** → **Authorized domains**
2. Vercel 배포 도메인 추가 (예: `프로젝트이름.vercel.app`, 커스텀 도메인 있다면 그것도 추가)

## 4. 배포

- **Deploy** 버튼 클릭 후 빌드가 끝나면 URL로 접속 가능합니다.
- 이후 `main`(또는 연결한 브랜치)에 push할 때마다 자동으로 재배포됩니다.

## 5. 커스텀 도메인 (선택)

Vercel 프로젝트 → **Settings** → **Domains**에서 도메인을 추가하고 DNS에 안내된 레코드를 설정하면 됩니다.

## 참고

- **NestJS 백엔드(`/server`)** 는 Vercel에 포함되지 않습니다. 별도 서버(Railway, Render, AWS 등)에 배포한 뒤 `NEXT_PUBLIC_BACKEND_URL`로 연결하세요.
- Minecraft RCON/상태 API는 Next.js API 라우트(`/api/minecraft/*`)에서 동작하며, `MINECRAFT_*` 환경 변수를 Vercel에 넣으면 해당 API도 사용할 수 있습니다.
