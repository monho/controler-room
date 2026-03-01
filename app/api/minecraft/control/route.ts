import { NextResponse } from 'next/server';
import { Rcon } from 'rcon-client';

export async function POST(request: Request) {
  try {
    const { action } = await request.json();

    if (!['stop', 'restart'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Only "stop" and "restart" are supported.'
      }, { status: 400 });
    }

    // RCON 설정 확인
    const rconHost = process.env.MINECRAFT_RCON_HOST || process.env.MINECRAFT_SERVER_HOST;
    const rconPort = process.env.MINECRAFT_RCON_PORT || '25575';
    const rconPassword = process.env.MINECRAFT_RCON_PASSWORD;

    if (!rconHost || !rconPassword) {
      return NextResponse.json({
        success: false,
        error: 'RCON이 설정되지 않았습니다. .env.local에 MINECRAFT_RCON_HOST와 MINECRAFT_RCON_PASSWORD를 설정해주세요.'
      }, { status: 500 });
    }

    // RCON 연결 및 명령 실행
    let rcon: Rcon | null = null;
    
    try {
      rcon = await Rcon.connect({
        host: rconHost,
        port: parseInt(rconPort),
        password: rconPassword,
        timeout: 5000
      });

      let response: string;
      
      switch (action) {
        case 'stop':
          response = await rcon.send('stop');
          break;
        case 'restart':
          // restart 플러그인 명령어: /restart 0 (즉시 재시작)
          response = await rcon.send('restart 0');
          break;
        default:
          throw new Error('Unknown action');
      }

      await rcon.end();

      return NextResponse.json({
        success: true,
        message: `서버 ${action === 'stop' ? '종료' : '재시작'} 명령이 전송되었습니다.`,
        response: response
      });

    } catch (rconError: any) {
      if (rcon) {
        try {
          await rcon.end();
        } catch (e) {
          // 연결 종료 실패는 무시
        }
      }

      console.error('RCON 오류:', rconError);
      
      return NextResponse.json({
        success: false,
        error: `RCON 연결 실패: ${rconError.message || '알 수 없는 오류'}. server.properties에서 enable-rcon=true로 설정되어 있는지 확인하세요.`
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('Server control error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Server control failed'
    }, { status: 500 });
  }
}
