'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTimes, faEye, faTv } from '@fortawesome/free-solid-svg-icons';

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

interface StreamerGridProps {
  streamers: Streamer[];
}

export default function StreamerGrid({ streamers }: StreamerGridProps) {
  const [selectedTeam, setSelectedTeam] = useState<string>('전체');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleTeamFilter = (team: string) => {
    setSelectedTeam(team);
    
    // Google Analytics 크루 필터 추적
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'team_filter', {
        event_category: 'engagement',
        event_label: team,
        team_name: team,
      });
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    
    // Google Analytics 검색 추적 (2글자 이상일 때만)
    if (query.length >= 2 && typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'search', {
        event_category: 'engagement',
        event_label: query,
        search_term: query,
      });
    }
  };

  const filteredStreamers = streamers.filter(s => {
    const matchesTeam = selectedTeam === '전체' || s.team === selectedTeam;
    const matchesSearch = searchQuery === '' || 
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTeam && matchesSearch;
  });

  if (streamers.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <FontAwesomeIcon icon={faTv} className="text-6xl text-gray-300 mb-4" />
          <p className="text-2xl text-gray-400 font-medium">등록된 스트리머가 없습니다</p>
        </div>
      </div>
    );
  }

  // Firestore에서 등록된 스트리머들의 크루 목록 추출
  const uniqueTeams = Array.from(new Set(streamers.map(s => s.team))).sort();

  return (
    <div>
      {/* 크루 필터 */}
      {uniqueTeams.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-3 overflow-x-auto pb-2">
            <button
              onClick={() => handleTeamFilter('전체')}
              className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                selectedTeam === '전체'
                  ? 'bg-[#001A35] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              전체 ({streamers.length})
            </button>
            {uniqueTeams.map((team) => {
            const teamCount = streamers.filter(s => s.team === team).length;
            return (
              <button
                key={team}
                onClick={() => handleTeamFilter(team)}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedTeam === team
                    ? 'bg-[#001A35] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {team} ({teamCount})
              </button>
            );
            })}
          </div>
        </div>
      )}

      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-[#001A35]">
          LIVE <span className="text-gray-400">({filteredStreamers.length})</span>
        </h2>
        <div className="flex gap-2 items-center">
          {/* 검색창 */}
          <div className={`overflow-hidden transition-all duration-300 ${
            searchOpen ? 'w-64 opacity-100' : 'w-0 opacity-0'
          }`}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="스트리머 검색..."
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
            />
          </div>
          
          {/* 검색 버튼 */}
          <button 
            onClick={() => {
              setSearchOpen(!searchOpen);
              if (searchOpen) {
                setSearchQuery('');
              }
            }}
            className={`px-4 py-2 border rounded-lg font-medium transition-all flex items-center gap-2 ${
              searchOpen 
                ? 'bg-[#001A35] text-white border-[#001A35]' 
                : 'border-gray-300 hover:bg-gray-50'
            }`}
          >
            <FontAwesomeIcon icon={searchOpen ? faTimes : faSearch} />
            검색
          </button>
        </div>
      </div>

      {/* 스트리머 그리드 */}
      {filteredStreamers.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="text-center">
            <FontAwesomeIcon icon={faTv} className="text-5xl text-gray-300 mb-3" />
            <p className="text-xl text-gray-400">해당 크루의 라이브 방송이 없습니다</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
          {filteredStreamers.map((streamer) => (
            <StreamerCard key={streamer.id} streamer={streamer} />
          ))}
        </div>
      )}
    </div>
  );
}

function StreamerCard({ streamer }: { streamer: Streamer }) {
  const handleClick = async () => {
    // Google Analytics 이벤트 추적
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', 'streamer_click', {
        event_category: 'engagement',
        event_label: `${streamer.team} - ${streamer.name}`,
        streamer_name: streamer.name,
        team: streamer.team,
        is_live: streamer.isLive,
        viewers: streamer.viewers,
      });
    }
    
    // Firestore에 클릭 데이터 저장
    try {
      await fetch('/api/analytics/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'streamer_click',
          streamerId: streamer.id,
          streamerName: streamer.name,
          team: streamer.team,
          isLive: streamer.isLive,
          viewers: streamer.viewers,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      console.error('통계 저장 실패:', error);
    }
    
    // 방송 페이지로 이동 (SOOP ID가 있는 경우)
    if (streamer.isLive && streamer.soopId) {
      window.open(`https://play.afreecatv.com/${streamer.soopId}`, '_blank');
    }
  };

  return (
    <div 
      onClick={handleClick}
      className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden hover:border-[#001A35] transition-all hover:shadow-lg cursor-pointer group"
    >
      {/* 썸네일 */}
      <div className="relative aspect-video bg-gray-200 overflow-hidden">
        {streamer.isLive ? (
          <>
            <img 
              src={streamer.thumbnail} 
              alt={streamer.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs font-bold">
              LIVE
            </div>
            <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
              <FontAwesomeIcon icon={faEye} />
              {streamer.viewers.toLocaleString()}
            </div>
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gray-300">
            <div className="text-center">
              <FontAwesomeIcon icon={faTv} className="text-4xl text-gray-500 mb-2" />
              <p className="text-gray-600 font-bold">방송 종료</p>
            </div>
          </div>
        )}
      </div>

      {/* 정보 */}
      <div className="p-3">
        <div className="flex items-start gap-2">
          <div className="w-10 h-10 rounded-full bg-[#001A35] flex items-center justify-center text-white font-bold flex-shrink-0">
            {streamer.name.charAt(0)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 truncate">{streamer.name}</h3>
              <span className="text-xs bg-[#001A35] text-white px-2 py-0.5 rounded font-bold flex-shrink-0">
                {streamer.team}
              </span>
            </div>
            <p className={`text-sm line-clamp-2 mt-1 ${streamer.isLive ? 'text-gray-600' : 'text-gray-400'}`}>
              {streamer.title}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {streamer.platform}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
