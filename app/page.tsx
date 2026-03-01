'use client';

import Header from '@/components/Header';
import LiveStreamers from '@/components/LiveStreamers';
import { useMinecraftServer } from '@/hooks/useMinecraftServer';

export default function Home() {
  const { status } = useMinecraftServer();

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header serverStatus={{ 
        isOnline: status.online,
        maintenance: status.maintenance,
        players: status.players
      }} />

      <div className="max-w-[1920px] mx-auto p-5">
        <main>
          <LiveStreamers />
        </main>
      </div>
    </div>
  );
}
