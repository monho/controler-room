# afreeca-bjapi

아프리카TV **비공식** API (`bjapi.afreecatv.com`)를 재사용하기 쉬운 형태로 감싼 클라이언트 라이브러리입니다.

- **출처**: 비공식·비문서화 API. 공식 스펙 없음. 변경·중단 가능성 있음.
- **필요 환경**: Node 18+ (또는 `fetch`가 있는 환경)

## 설치

```bash
# 로컬 패키지로 사용 (이 저장소 내 packages/afreeca-bjapi)
npm install ./packages/afreeca-bjapi

# 또는 npm 배포 후
npm install afreeca-bjapi
```

패키지 빌드:

```bash
cd packages/afreeca-bjapi && npm install && npm run build
```

## 사용법

### 클라이언트 인스턴스

```ts
import { AfreecaBjApiClient } from 'afreeca-bjapi';

const client = new AfreecaBjApiClient();

// BJ 방송 정보 (라이브 여부, 제목, 시청자 수 등)
const status = await client.getLiveStatus('bj_id_here');
if (status.isLive) {
  console.log(status.title, status.viewers, status.thumbnail);
} else {
  console.log('방송 중이 아님');
}

// 방송 검색
const result = await client.searchStreams('마인크래프트', 1, 60);
console.log(result.total, result.streams);
```

### 옵션 (커스텀 baseUrl / User-Agent / fetch)

```ts
const client = new AfreecaBjApiClient({
  baseUrl: 'https://bjapi.afreecatv.com',
  userAgent: 'MyBot/1.0',
  fetch: myFetch, // Node 18+에서는 생략 가능
});
```

### 타입

```ts
import type { LiveStatusResult, LiveInfo, SearchResult, StreamItem } from 'afreeca-bjapi';
```

## API 요약

| 메서드 | 설명 |
|--------|------|
| `getLiveStatus(bjId)` | BJ 방송 정보. `LiveInfo \| OfflineInfo` 반환 |
| `searchStreams(keyword, page?, perPage?)` | 방송 검색. `SearchResult` 반환 |

## 라이선스

MIT. 비공식 API 사용에 따른 책임은 사용자에게 있습니다.
