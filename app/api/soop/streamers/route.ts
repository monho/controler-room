import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const userId = searchParams.get('user_id');
  const token = searchParams.get('token');

  if (!userId || !token) {
    return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
  }

  try {
    // SOOP API로 스트리머 정보 조회
    const response = await fetch(`https://openapi.sooplive.co.kr/user/${userId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('SOOP API 에러:', error);
    return NextResponse.json({ error: 'Failed to fetch streamer data' }, { status: 500 });
  }
}
