'use client';

import { useEffect, useState } from 'react';

interface HeaderProps {
  serverStatus?: {
    isOnline: boolean;
    maintenance?: boolean;
    players?: {
      online: number;
      max: number;
    };
  };
}

export default function Header({ serverStatus }: HeaderProps) {
  const [time, setTime] = useState('--:--:--');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const updateTime = () => {
      const now = new Date();
      const hours = String(now.getHours()).padStart(2, '0');
      const minutes = String(now.getMinutes()).padStart(2, '0');
      const seconds = String(now.getSeconds()).padStart(2, '0');
      setTime(`${hours}:${minutes}:${seconds}`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-[#001A35] shadow-lg mb-5">
      <div className="max-w-[1920px] mx-auto px-5 py-5 flex justify-between items-center">
        <div className="flex items-center gap-8">
          <h1 className="text-3xl text-white font-bold">
            버챔스 지휘통제실
          </h1>
          
          {/* 네비게이션 메뉴 - 홈, 일정, 관리자만 (기록 메뉴 제거됨) */}
          <nav className="flex gap-2">
            <a href="/" className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors">홈</a>
            <a href="/schedule" className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors">일정</a>
            <a href="/admin" className="px-4 py-2 text-white font-medium hover:bg-white/10 rounded-lg transition-colors">관리자</a>
          </nav>
        </div>
        
        <div className="flex gap-5 items-center">
          {/* 시계 */}
          <div className="text-xl text-white font-bold font-mono min-w-[100px]">
            {mounted ? time : '--:--:--'}
          </div>
        </div>
      </div>
    </header>
  );
}
