import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');

  if (!code) {
    return NextResponse.redirect(new URL('/admin?error=no_code', request.url));
  }

  try {
    // 토큰 발급
    const tokenResponse = await fetch('https://openapi.sooplive.co.kr/auth/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        client_id: process.env.SOOP_CLIENT_ID!,
        client_secret: process.env.SOOP_CLIENT_SECRET!,
        redirect_uri: process.env.SOOP_REDIRECT_URI!,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenData.access_token) {
      return NextResponse.redirect(new URL('/admin?error=token_failed', request.url));
    }

    // 토큰을 쿼리 파라미터로 전달 (실제로는 세션이나 쿠키 사용 권장)
    return NextResponse.redirect(
      new URL(`/admin?soop_token=${tokenData.access_token}&refresh_token=${tokenData.refresh_token}`, request.url)
    );
  } catch (error) {
    console.error('SOOP 토큰 발급 에러:', error);
    return NextResponse.redirect(new URL('/admin?error=server_error', request.url));
  }
}
