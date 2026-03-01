# Firebase Storage 보안 규칙 설정

Firebase Console > Storage > 규칙 탭에서 다음 규칙을 설정하세요:

```javascript
rules_version = '2';

service firebase.storage {
  match /b/{bucket}/o {
    // 크루 로고 이미지
    match /teams/{teamId}/{fileName} {
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
2. 프로젝트 선택
3. Storage 메뉴 클릭
4. 상단의 "규칙" 탭 클릭
5. 위의 규칙 복사하여 붙여넣기
6. "게시" 버튼 클릭

## 규칙 설명:

- `allow read: if true` - 모든 사용자가 이미지를 볼 수 있음
- `allow write: if request.auth != null` - 로그인한 사용자만 업로드/삭제 가능
- `request.resource.size < 5 * 1024 * 1024` - 파일 크기 5MB 제한
- `request.resource.contentType.matches('image/.*')` - 이미지 파일만 허용

