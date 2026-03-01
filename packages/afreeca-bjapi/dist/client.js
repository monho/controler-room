"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AfreecaBjApiClient = void 0;
const DEFAULT_BASE = 'https://bjapi.afreecatv.com';
const DEFAULT_UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
function defaultFetch(input, init) {
    if (typeof fetch === 'undefined') {
        throw new Error('afreeca-bjapi requires fetch (Node 18+ or browser)');
    }
    return fetch(input, init);
}
class AfreecaBjApiClient {
    baseUrl;
    userAgent;
    doFetch;
    constructor(options = {}) {
        this.baseUrl = options.baseUrl ?? DEFAULT_BASE;
        this.userAgent = options.userAgent ?? DEFAULT_UA;
        this.doFetch = options.fetch ?? defaultFetch;
    }
    async get(path) {
        const url = path.startsWith('http') ? path : `${this.baseUrl}${path}`;
        const res = await this.doFetch(url, {
            headers: { 'User-Agent': this.userAgent },
        });
        if (!res.ok) {
            throw new Error(`Afreeca BJ API error: ${res.status} ${res.statusText}`);
        }
        return res.json();
    }
    /**
     * BJ 방송 정보 조회 (라이브 여부, 제목, 시청자 수 등)
     */
    async getLiveStatus(bjId) {
        const data = await this.get(`/api/${encodeURIComponent(bjId)}/station`);
        return parseStationResponse(data);
    }
    /**
     * 방송 검색
     * @param keyword 검색어
     * @param page 페이지 (1부터)
     * @param perPage 페이지당 개수 (기본 60)
     */
    async searchStreams(keyword, page = 1, perPage = 60) {
        const path = `/api/main/broad/a_list?page=${page}&per_page=${perPage}&select_value=${encodeURIComponent(keyword)}`;
        const data = await this.get(path);
        return parseSearchResponse(data);
    }
}
exports.AfreecaBjApiClient = AfreecaBjApiClient;
function parseStationResponse(data) {
    const broad = data?.broad;
    if (!broad?.broad_no) {
        return { isLive: false };
    }
    const viewers = parseInt(broad.current_sum_viewer || broad.total_view_cnt || broad.current_view_cnt || '0', 10);
    const result = {
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
function parseSearchResponse(data) {
    if (data.RESULT !== '1' || !Array.isArray(data.REAL_BROAD)) {
        return { success: true, total: 0, hasMore: false, streams: [] };
    }
    const streams = data.REAL_BROAD.map((s) => ({
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
