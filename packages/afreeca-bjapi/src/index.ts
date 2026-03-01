/**
 * afreeca-bjapi
 * 아프리카TV 비공식 API (bjapi.afreecatv.com) 재사용 라이브러리
 *
 * - 출처: 비공식·비문서화 API. 공식 스펙 없음. 변경·중단 가능성 있음.
 * - 엔드포인트: /api/{bjId}/station, /api/main/broad/a_list
 */
export { AfreecaBjApiClient } from './client';
export type {
  LiveStatusResult,
  LiveInfo,
  OfflineInfo,
  SearchResult,
  StreamItem,
  AfreecaBjApiOptions,
} from './types';
