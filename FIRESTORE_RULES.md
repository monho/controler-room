# Firebase 보안 규칙 설정

## Firestore 보안 규칙

Firebase Console > Firestore Database > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // 스트리머 컬렉션 - 읽기는 모두 가능, 쓰기는 인증된 사용자만
    match /streamers/{streamerId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 크루 컬렉션 - 읽기는 모두 가능, 쓰기는 인증된 사용자만
    match /teams/{teamId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 경기 일정 컬렉션
    match /games/{gameId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // 일정 컬렉션 (추후 사용)
    match /schedules/{scheduleId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    
    // Analytics 컬렉션 - 읽기는 인증된 사용자만, 쓰기는 모두 가능
    match /analytics/{analyticsId} {
      allow read: if request.auth != null;
      allow write: if true;
    }
    
        // 서버 설정 컬렉션 - 읽기는 모두 가능, 쓰기는 인증된 사용자만
        match /settings/{settingId} {
          allow read: if true;
          allow write: if request.auth != null;
        }

        // 크루 공격 기록 컬렉션 - 읽기는 모두 가능, 쓰기는 인증된 사용자만
        match /teamOffensiveStats/{teamId} {
          allow read: if true;
          allow write: if request.auth != null;
        }

        // 크루 수비 기록 컬렉션 - 읽기는 모두 가능, 쓰기는 인증된 사용자만
        match /teamDefensiveStats/{teamId} {
          allow read: if true;
          allow write: if request.auth != null;
        }

        // 유저 컬렉션 - 읽기는 인증된 사용자만, 쓰기는 인증된 사용자만
        match /users/{userId} {
          allow read: if request.auth != null;
          allow write: if request.auth != null;
        }
      }
    }
```

## Storage 보안 규칙

Firebase Console > Storage > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // 크루 로고 이미지
    match /teams/{teamId}/{allPaths=**} {
      // 읽기는 모두 가능
      allow read: if true;
      // 쓰기(업로드/삭제)는 인증된 사용자만
      allow write: if request.auth != null
                   && request.resource.size < 5 * 1024 * 1024  // 5MB 제한
                   && request.resource.contentType.matches('image/.*');
    }
    
    // 기타 파일들
    match /{allPaths=**} {
      // 읽기는 모두 가능
      allow read: if true;
      // 쓰기는 인증된 사용자만
      allow write: if request.auth != null;
    }
  }
}
```

## 설정 방법:

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. 프로젝트 선택: `mcbl-stremmer`
3. Firestore Database 메뉴 클릭
4. 상단의 "규칙" 탭 클릭
5. 위의 규칙 복사하여 붙여넣기
6. "게시" 버튼 클릭

## 주의사항:

- `allow read: if true` - 모든 사용자가 스트리머 목록을 볼 수 있음
- `allow write: if request.auth != null` - 로그인한 사용자만 추가/수정/삭제 가능
