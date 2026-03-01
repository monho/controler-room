/**
 * bjapi.afreecatv.com 비공식 API 클라이언트
 * - GET /api/{bjId}/station  : BJ 방송 정보(라이브 여부, 시청자 수 등)
 * - GET /api/main/broad/a_list : 방송 검색
 */
import type {
  LiveStatusResult,
  SearchResult,
  AfreecaBjApiOptions,
  LiveInfo,
  OfflineInfo,
  StreamItem,
} from './types';

const DEFAULT_BASE = 'https://bjapi.afreecatv.com';
const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

function defaultFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  if (typeof fetch === 'undefined') {
    throw new Error('afreeca-bjapi requires fetch (Node 18+ or browser)');
  }
  return fetch(input, init);
}

export class AfreecaBjApiClient {
  private baseUrl: string;
  private userAgent: string;
  private doFetch: typeof fetch;

  constructor(options: AfreecaBjApiOptions = {}) {
    this.baseUrl = options.baseUrl ?? DEFAULT_BASE;
    this.userAgent = options.userAgent ?? DEFAULT_UA;
    this.doFetch = options.fetch ?? defaultFetch;
  }

  private async get<T>(path: string): Promise<T> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
    const res = await this.doFetch(url, {
      headers: { 'User-Agent': this.userAgent },
    });
    if (!res.ok) {
      throw new Error(`Afreeca BJ API error: ${res.status} ${res.statusText}`);
    }
    return res.json() as Promise<T>;
  }

  /**
   * BJ 방송 정보 조회 (라이브 여부, 제목, 시청자 수 등)
   */
  async getLiveStatus(bjId: string): Promise<LiveStatusResult> {
    const data = await this.get<RawStationResponse>(`/api/${encodeURIComponent(bjId)}/station`);
    return parseStationResponse(data);
  }

  /**
   * 방송 검색
   * @param keyword 검색어
   * @param page 페이지 (1부터)
   * @param perPage 페이지당 개수 (기본 60)
   */
  async searchStreams(
    keyword: string,
    page: number = 1,
    perPage: number = 60
  ): Promise<SearchResult> {
    const path = `/api/main/broad/a_list?page=${page}&per_page=${perPage}&select_value=${encodeURIComponent(keyword)}`;
    const data = await this.get<RawSearchResponse>(path);
    return parseSearchResponse(data);
  }
}

/** Raw API 응답 (비문서화이므로 any에 가깝게) */
interface RawStationResponse {
  broad?: {
    broad_no: string;
    broad_title?: string;
    current_sum_viewer?: string;
    total_view_cnt?: string;
    current_view_cnt?: string;
    broad_cate_name?: string;
    broad_start?: string;
  };
}

interface RawSearchResponse {
  RESULT?: string;
  REAL_BROAD?: Array<{
    user_id: string;
    user_nick: string;
    broad_no: string;
    broad_title: string;
    broad_img?: string;
    total_view_cnt?: string;
    broad_cate_name?: string;
    broad_start?: string;
  }>;
  TOTAL_CNT?: string;
  HAS_MORE_LIST?: boolean;
}

function parseStationResponse(data: RawStationResponse): LiveInfo | OfflineInfo {
  const broad = data?.broad;
  if (!broad?.broad_no) {
    return { isLive: false };
  }
  const viewers = parseInt(
    broad.current_sum_viewer || broad.total_view_cnt || broad.current_view_cnt || '0',
    10
  );
  const result: LiveInfo = {
    isLive: true,
    broadNo: broad.broad_no,
    title: broad.broad_title ?? '제목 없음',
    thumbnail: `https://liveimg.afreecatv.com/m/${broad.broad_no}`,
    viewers: Number.isNaN(viewers) ? 0 : viewers,
    category: broad.broad_cate_name ?? '',
    startTime: broad.broad_start ?? '',
  };
  return result;
}

function parseSearchResponse(data: RawSearchResponse): SearchResult {
  if (data.RESULT !== '1' || !Array.isArray(data.REAL_BROAD)) {
    return { success: true, total: 0, hasMore: false, streams: [] };
  }
  const streams: StreamItem[] = data.REAL_BROAD.map((s) => ({
    bjId: s.user_id,
    bjNick: s.user_nick,
    broadNo: s.broad_no,
    title: s.broad_title,
    thumbnail: s.broad_img || `https://liveimg.afreecatv.com/m/${s.broad_no}`,
    viewers: parseInt(s.total_view_cnt || '0', 10) || 0,
    category: s.broad_cate_name ?? '',
    startTime: s.broad_start ?? '',
    isLive: true,
  }));
  return {
    success: true,
    total: parseInt(data.TOTAL_CNT || '0', 10) || 0,
    hasMore: Boolean(data.HAS_MORE_LIST),
    streams,
  };
}
