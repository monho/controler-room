import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const host = searchParams.get('host') || process.env.MINECRAFT_SERVER_HOST || 'localhost';
  const port = searchParams.get('port') || process.env.MINECRAFT_SERVER_PORT || '25565';

  try {
    // mcstatus.io API 사용
    const response = await fetch(`https://api.mcstatus.io/v2/status/java/${host}:${port}`, {
      next: { revalidate: 30 } // 30초 캐시
    });

    if (!response.ok) {
      return NextResponse.json({
        online: false,
        error: 'Server not reachable'
      });
    }

    const data = await response.json();

    return NextResponse.json({
      online: data.online || false,
      players: {
        online: data.players?.online || 0,
        max: data.players?.max || 0,
      },
      version: data.version?.name_clean || 'Unknown',
      motd: data.motd?.clean || '',
      icon: data.icon || null,
    });
  } catch (error) {
    console.error('Minecraft server status check failed:', error);
    return NextResponse.json({
      online: false,
      error: 'Failed to check server status'
    });
  }
}
