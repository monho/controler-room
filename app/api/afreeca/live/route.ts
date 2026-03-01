import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const bjId = searchParams.get('bj_id');

  if (!bjId) {
    return NextResponse.json({ error: 'Missing bj_id parameter' }, { status: 400 });
  }

  try {
    // 아프리카TV 비공식 API 호출
    const response = await fetch(
      `https://bjapi.afreecatv.com/api/${bjId}/station`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      }
    );

    const data = await response.json();
    
    // 방송 중인지 확인
    const isLive = data.broad && data.broad.broad_no;
    
    if (isLive) {
      // 시청자 수 우선순위: current_sum_viewer > total_view_cnt > current_view_cnt > 0
      const currentSumViewer = data.broad.current_sum_viewer;
      const totalViewCnt = data.broad.total_view_cnt;
      const currentViewCnt = data.broad.current_view_cnt;
      const viewers = parseInt(currentSumViewer || totalViewCnt || currentViewCnt || '0');
      
      return NextResponse.json({
        isLive: true,
        broadNo: data.broad.broad_no,
        title: data.broad.broad_title || '제목 없음',
        thumbnail: `https://liveimg.afreecatv.com/m/${data.broad.broad_no}`,
        viewers: viewers,
        category: data.broad.broad_cate_name || '',
        startTime: data.broad.broad_start || '',
      });
    } else {
      return NextResponse.json({
        isLive: false,
      });
    }
  } catch (error) {
    console.error('아프리카TV API 에러:', error);
    return NextResponse.json({ error: 'Failed to fetch stream data' }, { status: 500 });
  }
}
