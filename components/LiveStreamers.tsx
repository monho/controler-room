'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import StreamerGrid from './StreamerGrid';

interface Streamer {
  id: string;
  name: string;
  thumbnail: string;
  viewers: number;
  isLive: boolean;
  title: string;
  platform: string;
  team: string;
  soopId?: string;
}

export default function LiveStreamers() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);

  useEffect(() => {
    loadStreamers();
    // 60초마다 방송 상태 업데이트 (30초 -> 60초로 변경)
    const interval = setInterval(loadStreamers, 60000);
    return () => clearInterval(interval);
  }, []);

  const loadStreamers = async () => {
    try {
      // Firestore에서 등록된 스트리머 목록 가져오기
      const streamersSnapshot = await getDocs(collection(db, 'streamers'));
      const registeredStreamers = streamersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // 첫 로딩 시 오프라인 상태로 먼저 표시 (빠른 초기 렌더링)
      if (initialLoad) {
        const offlineStreamers = registeredStreamers.map((streamer: any) => ({
          id: streamer.id,
          name: streamer.name,
          thumbnail: '',
          viewers: 0,
          isLive: false,
          title: '방송 확인 중...',
          platform: streamer.platform,
          team: streamer.team,
          soopId: streamer.soopId,
        }));
        setStreamers(offlineStreamers);
        setLoading(false);
        setInitialLoad(false);
      }

      // 백그라운드에서 실시간 방송 정보 가져오기
      const streamersPromises = registeredStreamers.map(async (streamer: any) => {
        if (streamer.platform === 'SOOP' && streamer.soopId) {
          try {
            const response = await fetch(`/api/afreeca/live?bj_id=${streamer.soopId}`);
            const liveData = await response.json();

            if (liveData.isLive) {
              return {
                id: streamer.id,
                name: streamer.name,
                thumbnail: liveData.thumbnail,
                viewers: liveData.viewers,
                isLive: true,
                title: liveData.title,
                platform: streamer.platform,
                team: streamer.team,
                soopId: streamer.soopId,
              };
            }
          } catch (error) {
            console.error(`[${streamer.name}] 방송 정보 로드 실패:`, error);
          }
        }
        
        // 방송 중이 아니거나 에러 발생 시 - 오프라인 상태로 표시
        return {
          id: streamer.id,
          name: streamer.name,
          thumbnail: '',
          viewers: 0,
          isLive: false,
          title: '방송 종료',
          platform: streamer.platform,
          team: streamer.team,
          soopId: streamer.soopId,
        };
      });

      const results = await Promise.all(streamersPromises);
      
      // 라이브 중인 스트리머를 앞으로 정렬
      const sortedResults = results.sort((a, b) => {
        // 라이브 중이면 1, 아니면 0
        const aLive = a.isLive ? 1 : 0;
        const bLive = b.isLive ? 1 : 0;
        
        // 라이브 중인 스트리머가 앞으로
        if (aLive !== bLive) {
          return bLive - aLive;
        }
        
        // 둘 다 라이브 중이면 시청자 수로 정렬
        if (a.isLive && b.isLive) {
          return b.viewers - a.viewers;
        }
        
        // 둘 다 오프라인이면 이름순
        return a.name.localeCompare(b.name);
      });
      
      setStreamers(sortedResults);
    } catch (error) {
      console.error('스트리머 로드 에러:', error);
      setLoading(false);
    }
  };

  if (loading && streamers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
          <div className="text-xl text-gray-600">스트리머 목록 로딩 중...</div>
        </div>
      </div>
    );
  }

  return <StreamerGrid streamers={streamers} />;
}
