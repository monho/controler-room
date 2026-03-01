/**
 * bjapi.afreecatv.com 비공식 API 클라이언트
 * - GET /api/{bjId}/station  : BJ 방송 정보(라이브 여부, 시청자 수 등)
 * - GET /api/main/broad/a_list : 방송 검색
 */
import type { LiveStatusResult, SearchResult, AfreecaBjApiOptions } from './types';
export declare class AfreecaBjApiClient {
    private baseUrl;
    private userAgent;
    private doFetch;
    constructor(options?: AfreecaBjApiOptions);
    private get;
    /**
     * BJ 방송 정보 조회 (라이브 여부, 제목, 시청자 수 등)
     */
    getLiveStatus(bjId: string): Promise<LiveStatusResult>;
    /**
     * 방송 검색
     * @param keyword 검색어
     * @param page 페이지 (1부터)
     * @param perPage 페이지당 개수 (기본 60)
     */
    searchStreams(keyword: string, page?: number, perPage?: number): Promise<SearchResult>;
}
