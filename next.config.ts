import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 같은 서버에서 NestJS 백엔드와 함께 실행될 때
  // NestJS 백엔드 API를 프록시하도록 rewrites 설정
  async rewrites() {
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
    
    return [
      // NestJS 백엔드로 프록시할 API 경로들
      // Next.js API 라우트와 충돌하지 않도록 주의
      {
        source: '/api/minecraft/control',
        destination: `${backendUrl}/api/minecraft/control`,
      },
      {
        source: '/api/users/:path*',
        destination: `${backendUrl}/api/users/:path*`,
      },
      {
        source: '/api/auth/soop/:path*',
        destination: `${backendUrl}/api/auth/soop/:path*`,
      },
      {
        source: '/api/analytics/:path*',
        destination: `${backendUrl}/api/analytics/:path*`,
      },
    ];
  },
};

export default nextConfig;
