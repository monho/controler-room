/**
 * bjapi.afreecatv.com 비공식 API 타입 정의
 * (비문서화 API이므로 실제 응답과 필드명이 변경될 수 있음)
 */
/** BJ 방송 정보 한 건 (방송 중일 때) */
export interface LiveInfo {
    isLive: true;
    broadNo: string;
    title: string;
    thumbnail: string;
    viewers: number;
    category: string;
    startTime: string;
}
/** 방송 중이 아닐 때 */
export interface OfflineInfo {
    isLive: false;
}
export type LiveStatusResult = LiveInfo | OfflineInfo;
/** 검색 결과 한 건 */
export interface StreamItem {
    bjId: string;
    bjNick: string;
    broadNo: string;
    title: string;
    thumbnail: string;
    viewers: number;
    category: string;
    startTime: string;
    isLive: true;
}
export interface SearchResult {
    success: true;
    total: number;
    hasMore: boolean;
    streams: StreamItem[];
}
/** 옵션: 기본 fetch 옵션 확장 */
export interface AfreecaBjApiOptions {
    baseUrl?: string;
    userAgent?: string;
    /** Node 18+ / 브라우저 기본 fetch 사용 시 생략 */
    fetch?: (input: string | URL | Request, init?: RequestInit) => Promise<Response>;
}
