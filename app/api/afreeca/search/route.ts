import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const keyword = searchParams.get('keyword') || '';
  const page = searchParams.get('page') || '1';

  try {
    // 아프리카TV 검색 API 호출
    const response = await fetch(
      `https://bjapi.afreecatv.com/api/main/broad/a_list?page=${page}&per_page=60&select_value=${encodeURIComponent(keyword)}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const data = await response.json();
    
    if (data.RESULT === '1' && data.REAL_BROAD) {
      const streams = data.REAL_BROAD.map((stream: any) => ({
        bjId: stream.user_id,
        bjNick: stream.user_nick,
        broadNo: stream.broad_no,
        title: stream.broad_title,
        thumbnail: stream.broad_img || `https://liveimg.afreecatv.com/m/${stream.broad_no}`,
        viewers: parseInt(stream.total_view_cnt || '0'),
        category: stream.broad_cate_name,
        startTime: stream.broad_start,
        isLive: true,
      }));

      return NextResponse.json({
        success: true,
        total: parseInt(data.TOTAL_CNT || '0'),
        hasMore: data.HAS_MORE_LIST,
        streams,
      });
    } else {
      return NextResponse.json({
        success: true,
        total: 0,
        hasMore: false,
        streams: [],
      });
    }
  } catch (error) {
    console.error('아프리카TV 검색 API 에러:', error);
    return NextResponse.json({ error: 'Failed to search streams' }, { status: 500 });
  }
}
