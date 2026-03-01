# 버챔스 지휘통제실

Next.js 15 + TypeScript + Tailwind CSS + Firebase로 만든 마인크래프트 야구 서버 관리 대시보드

## 시작하기

### 1. 의존성 설치
```bash
npm install
```

### 2. Firebase 설정

1. [Firebase Console](https://console.firebase.google.com/)에서 새 프로젝트 생성
2. Authentication 활성화
   - 로그인 방법에서 "이메일/비밀번호" 활성화
3. Firestore Database 생성
   - 테스트 모드로 시작
4. 프로젝트 설정에서 웹 앱 추가
5. Firebase 설정 정보 복사

### 3. 환경 변수 설정

`.env.local` 파일을 생성하고 Firebase 설정을 추가하세요:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
```

### 4. 관리자 계정 생성

Firebase Console > Authentication > Users에서 관리자 계정을 수동으로 추가하세요.

### 5. 개발 서버 실행

```bash
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 열기

## 주요 기능

- ✅ SSR (Server-Side Rendering)
- ✅ TypeScript
- ✅ Tailwind CSS
- ✅ Font Awesome 아이콘
- ✅ Firebase Authentication (관리자 로그인)
- ✅ 실시간 시계
- ✅ 크루별 스트리머 필터링
- ✅ 검색 기능
- ✅ 경기 일정 관리
- ✅ 반응형 디자인

## 프로젝트 구조

```
minecraft-control-center/
├── app/
│   ├── page.tsx              # 메인 페이지 (스트리머 목록)
│   ├── schedule/page.tsx     # 일정 페이지
│   ├── admin/page.tsx        # 관리자 페이지
│   ├── layout.tsx            # 레이아웃
│   └── globals.css           # 글로벌 스타일
├── components/
│   ├── Header.tsx            # 헤더 컴포넌트
│   ├── StreamerGrid.tsx      # 스트리머 그리드
│   ├── ScheduleCalendar.tsx  # 일정 캘린더
│   └── AdminLogin.tsx        # 관리자 로그인
├── lib/
│   ├── firebase.ts           # Firebase 설정
│   └── fontawesome.ts        # Font Awesome 설정
└── .env.local                # 환경 변수 (생성 필요)
```

## 페이지

- `/` - 메인 페이지 (스트리머 목록)
- `/schedule` - 경기 일정
- `/admin` - 관리자 페이지 (로그인 필요)

## 기술 스택

- **Framework**: Next.js 15
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Font Awesome
- **Authentication**: Firebase Auth
- **Database**: Firestore (예정)
