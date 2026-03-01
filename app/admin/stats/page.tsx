'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartLine, faTrophy, faUsers, faEye } from '@fortawesome/free-solid-svg-icons';

interface AnalyticsData {
  type: string;
  streamerId: string;
  streamerName: string;
  team: string;
  isLive: boolean;
  viewers: number;
  timestamp: string;
}

interface StreamerStats {
  name: string;
  team: string;
  clicks: number;
  totalViewers: number;
}

export default function AdminStatsPage() {
  const [loading, setLoading] = useState(true);
  const [totalClicks, setTotalClicks] = useState(0);
  const [topStreamers, setTopStreamers] = useState<StreamerStats[]>([]);
  const [teamStats, setTeamStats] = useState<Record<string, number>>({});
  const [dateRange, setDateRange] = useState('7'); // 기본 7일

  useEffect(() => {
    loadStats();
    
    // 30초마다 자동 갱신
    const interval = setInterval(() => {
      loadStats();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [dateRange]);

  const loadStats = async () => {
    setLoading(true);
    try {
      // 날짜 범위 계산
      const daysAgo = new Date();
      daysAgo.setDate(daysAgo.getDate() - parseInt(dateRange));
      const cutoffTime = daysAgo.toISOString();

      // Firestore에서 분석 데이터 가져오기 (인덱스 없이)
      const querySnapshot = await getDocs(collection(db, 'analytics'));
      
      // 클라이언트에서 필터링
      const analyticsData = querySnapshot.docs
        .map(doc => doc.data() as AnalyticsData)
        .filter(data => 
          data.type === 'streamer_click' && 
          data.timestamp >= cutoffTime
        );

      // 총 클릭 수
      setTotalClicks(analyticsData.length);

      // 스트리머별 통계
      const streamerMap = new Map<string, StreamerStats>();
      analyticsData.forEach(data => {
        const existing = streamerMap.get(data.streamerId);
        if (existing) {
          existing.clicks += 1;
          existing.totalViewers += data.viewers;
        } else {
          streamerMap.set(data.streamerId, {
            name: data.streamerName,
            team: data.team,
            clicks: 1,
            totalViewers: data.viewers,
          });
        }
      });

      // 클릭 수로 정렬
      const sortedStreamers = Array.from(streamerMap.values())
        .sort((a, b) => b.clicks - a.clicks)
        .slice(0, 10);
      setTopStreamers(sortedStreamers);

      // 크루별 통계
      const teamMap: Record<string, number> = {};
      analyticsData.forEach(data => {
        teamMap[data.team] = (teamMap[data.team] || 0) + 1;
      });
      setTeamStats(teamMap);

    } catch (error) {
      console.error('통계 로드 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#001A35] mb-3"></div>
        <div className="text-gray-600">통계 로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#001A35]">통계</h1>
          <p className="text-sm text-gray-500 mt-1">30초마다 자동 갱신</p>
        </div>
        <div className="flex gap-3 items-center">
          <button
            onClick={() => loadStats()}
            disabled={loading}
            className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002447] transition-colors disabled:opacity-50"
          >
            {loading ? '갱신 중...' : '🔄 새로고침'}
          </button>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
          >
            <option value="1">최근 1일</option>
            <option value="7">최근 7일</option>
            <option value="30">최근 30일</option>
            <option value="90">최근 90일</option>
          </select>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">총 클릭 수</p>
              <p className="text-3xl font-bold text-[#001A35]">{totalClicks.toLocaleString()}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faChartLine} className="text-blue-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">인기 스트리머</p>
              <p className="text-3xl font-bold text-[#001A35]">{topStreamers.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faTrophy} className="text-green-600 text-xl" />
            </div>
          </div>
        </div>

        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm mb-1">활성 크루</p>
              <p className="text-3xl font-bold text-[#001A35]">{Object.keys(teamStats).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
              <FontAwesomeIcon icon={faUsers} className="text-purple-600 text-xl" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 인기 스트리머 TOP 10 */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#001A35] mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faTrophy} className="text-yellow-500" />
            인기 스트리머 TOP 10
          </h2>
          <div className="space-y-3">
            {topStreamers.length === 0 ? (
              <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
            ) : (
              topStreamers.map((streamer, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                      index === 0 ? 'bg-yellow-400 text-white' :
                      index === 1 ? 'bg-gray-400 text-white' :
                      index === 2 ? 'bg-orange-400 text-white' :
                      'bg-gray-200 text-gray-600'
                    }`}>
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-bold text-gray-900">{streamer.name}</div>
                      <div className="text-sm text-gray-500">{streamer.team}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#001A35]">{streamer.clicks}회</div>
                    <div className="text-xs text-gray-500">
                      <FontAwesomeIcon icon={faEye} /> {Math.round(streamer.totalViewers / streamer.clicks).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* 크루별 클릭 수 */}
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h2 className="text-xl font-bold text-[#001A35] mb-4 flex items-center gap-2">
            <FontAwesomeIcon icon={faUsers} />
            크루별 클릭 수
          </h2>
          <div className="space-y-3">
            {Object.keys(teamStats).length === 0 ? (
              <p className="text-gray-500 text-center py-8">데이터가 없습니다</p>
            ) : (
              Object.entries(teamStats)
                .sort(([, a], [, b]) => b - a)
                .map(([team, clicks]) => (
                  <div key={team} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="font-bold text-gray-900">{team}</div>
                    <div className="flex items-center gap-3">
                      <div className="w-full max-w-[200px] bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#001A35] h-2 rounded-full transition-all"
                          style={{ width: `${(clicks / totalClicks) * 100}%` }}
                        ></div>
                      </div>
                      <div className="font-bold text-[#001A35] min-w-[60px] text-right">
                        {clicks}회
                      </div>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
