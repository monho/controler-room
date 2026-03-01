'use client';

import { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faChevronRight, faCalendar } from '@fortawesome/free-solid-svg-icons';
import Header from '@/components/Header';
import { useMinecraftServer } from '@/hooks/useMinecraftServer';

interface Game {
  id: string;
  date: string;
  time: string;
  headcount?: number;
  homeStreamers?: string[];
  awayStreamers?: string[];
  status: string;
  homeScore?: number;
  awayScore?: number;
  homeTeam?: string;
  awayTeam?: string;
  stadium?: string;
}

export default function SchedulePage() {
  const { status } = useMinecraftServer();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStreamer, setSelectedStreamer] = useState<string>('전체');
  const [streamerNames, setStreamerNames] = useState<string[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const streamersSnapshot = await getDocs(collection(db, 'streamers'));
      const names = streamersSnapshot.docs
        .map(doc => doc.data().name as string)
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b));
      setStreamerNames([...new Set(names)]);

      const gamesSnapshot = await getDocs(collection(db, 'games'));
      const gamesData = gamesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Game[];
      
      gamesData.sort((a, b) => {
        const dateA = new Date(`${a.date} ${a.time}`);
        const dateB = new Date(`${b.date} ${b.time}`);
        return dateA.getTime() - dateB.getTime();
      });
      
      setGames(gamesData);
      setLoading(false);
    } catch (error) {
      console.error('데이터 로드 실패:', error);
      setLoading(false);
    }
  };

  const gameIncludesStreamer = (g: Game, name: string) => {
    if (g.homeStreamers?.includes(name) || g.awayStreamers?.includes(name)) return true;
    return g.homeTeam === name || g.awayTeam === name;
  };
  const filteredGames = selectedStreamer === '전체'
    ? games
    : games.filter(g => gameIncludesStreamer(g, selectedStreamer));

  const getWeekDates = () => {
    const dates: Date[] = [];
    const start = new Date(currentDate);
    start.setDate(start.getDate() - 7);
    
    for (let i = 0; i < 14; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      dates.push(date);
    }
    
    return dates;
  };

  const weekDates = getWeekDates();
  const weekDays = ['일', '월', '화', '수', '목', '금', '토'];

  const getGamesForDate = (dateStr: string) => {
    return filteredGames.filter(g => g.date === dateStr);
  };

  const selectedDateGames = getGamesForDate(selectedDate);

  const scrollDates = (direction: 'left' | 'right') => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + (direction === 'right' ? 7 : -7));
    setCurrentDate(newDate);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white text-gray-800">
        <Header serverStatus={{ 
          isOnline: status.online,
          maintenance: status.maintenance,
          players: status.players
        }} />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
            <div className="text-xl text-gray-600">로딩 중...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-gray-800">
      <Header serverStatus={{ 
        isOnline: status.online,
        maintenance: status.maintenance,
        players: status.players
      }} />
      
      <div className="max-w-[1400px] mx-auto p-5">
        <main className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold text-[#001A35]">경기 일정</h1>
          </div>

          {streamerNames.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                onClick={() => setSelectedStreamer('전체')}
                className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                  selectedStreamer === '전체'
                    ? 'bg-[#001A35] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                전체
              </button>
              {streamerNames.map((name) => (
                <button
                  key={name}
                  onClick={() => setSelectedStreamer(name)}
                  className={`px-4 py-2 rounded-lg font-bold whitespace-nowrap transition-all ${
                    selectedStreamer === name
                      ? 'bg-[#001A35] text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-6 py-4 border-b-2 border-gray-200 flex items-center justify-center gap-6">
              <button
                onClick={() => scrollDates('left')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-xl" />
              </button>
              <div className="text-2xl font-bold text-gray-800">
                {currentDate.getFullYear()}.{String(currentDate.getMonth() + 1).padStart(2, '0')}
              </div>
              <button
                onClick={() => scrollDates('right')}
                className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-xl" />
              </button>
            </div>

            <div className="flex items-center px-4 py-8 gap-2">
              <button
                onClick={() => scrollDates('left')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={faChevronLeft} className="text-gray-600 text-sm" />
              </button>
              
              <div className="flex-1">
                <div className="flex gap-2 justify-center px-2">
                  {weekDates.map((date) => {
                    const dateStr = date.toISOString().split('T')[0];
                    const dayOfWeek = weekDays[date.getDay()];
                    const isSelected = dateStr === selectedDate;
                    const isToday = date.toDateString() === new Date().toDateString();
                    const hasGames = getGamesForDate(dateStr).length > 0;

                    return (
                      <button
                        key={dateStr}
                        onClick={() => setSelectedDate(dateStr)}
                        className={`flex-shrink-0 w-16 py-3 rounded-lg text-center transition-all ${
                          isSelected 
                            ? 'bg-[#001A35] text-white shadow-lg scale-105' 
                            : hasGames
                            ? 'bg-blue-50 border-2 border-[#001A35] hover:bg-blue-100 hover:scale-105'
                            : 'bg-gray-50 hover:bg-gray-100 hover:scale-105'
                        }`}
                      >
                        <div className={`text-xs font-medium mb-2 ${
                          isSelected ? 'text-white' : 'text-gray-500'
                        }`}>
                          {dayOfWeek}
                        </div>
                        <div className={`text-xl font-bold ${
                          isSelected ? 'text-white' :
                          isToday ? 'text-[#001A35]' :
                          date.getDay() === 0 ? 'text-red-600' :
                          date.getDay() === 6 ? 'text-blue-600' :
                          'text-gray-800'
                        }`}>
                          {date.getDate()}
                        </div>
                        {hasGames && !isSelected && (
                          <div className="mt-2 flex justify-center gap-1">
                            {Array.from({ length: Math.min(getGamesForDate(dateStr).length, 3) }).map((_, i) => (
                              <div key={i} className="w-1.5 h-1.5 bg-[#001A35] rounded-full"></div>
                            ))}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <button
                onClick={() => scrollDates('right')}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
              >
                <FontAwesomeIcon icon={faChevronRight} className="text-gray-600 text-sm" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {selectedDateGames.length === 0 ? (
              <div className="flex items-center justify-center min-h-[300px] bg-gray-50 rounded-xl">
                <div className="text-center">
                  <FontAwesomeIcon icon={faCalendar} className="text-6xl text-gray-300 mb-4" />
                  <p className="text-xl text-gray-400">
                    {new Date(selectedDate).toLocaleDateString('ko-KR', {
                      month: 'long',
                      day: 'numeric',
                      weekday: 'long'
                    })}에 예정된 경기가 없습니다
                  </p>
                </div>
              </div>
            ) : (
              selectedDateGames.map((game) => (
                <div
                  key={game.id}
                  className="bg-white border-2 border-gray-200 rounded-xl p-6 hover:border-[#001A35] transition-all"
                >
                  <div className="flex items-center justify-center gap-12">
                    {/* 시간 */}
                    <div className="text-lg text-gray-600 w-20 text-center">{game.time}</div>
                    
                    {/* 경기 정보 */}
                    <div className="flex items-center gap-8">
                      {/* 홈 스트리머 */}
                      <div className="text-center min-w-[120px] max-w-[200px]">
                        <div className="text-sm text-gray-600 mb-1">홈</div>
                        <div className="text-lg font-bold text-gray-800">
                          {game.homeStreamers?.length ? game.homeStreamers.join(', ') : (game.homeTeam ?? '-')}
                        </div>
                        {game.status === '종료' && game.homeScore !== undefined && game.awayScore !== undefined && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className={`text-3xl font-bold ${
                              game.homeScore > game.awayScore ? 'text-blue-600' :
                              game.homeScore < game.awayScore ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {game.homeScore}
                            </div>
                            {game.homeScore > game.awayScore && (
                              <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">승</span>
                            )}
                            {game.homeScore < game.awayScore && (
                              <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded">패</span>
                            )}
                            {game.homeScore === game.awayScore && (
                              <span className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">무</span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* VS 또는 스코어 구분 */}
                      <div className="text-3xl font-bold text-gray-400">
                        {game.status === '종료' ? ':' : 'VS'}
                      </div>

                      {/* 원정 스트리머 */}
                      <div className="text-center min-w-[120px] max-w-[200px]">
                        <div className="text-sm text-gray-600 mb-1">원정</div>
                        <div className="text-lg font-bold text-gray-800">
                          {game.awayStreamers?.length ? game.awayStreamers.join(', ') : (game.awayTeam ?? '-')}
                        </div>
                        {game.status === '종료' && game.homeScore !== undefined && game.awayScore !== undefined && (
                          <div className="flex items-center justify-center gap-2 mt-2">
                            <div className={`text-3xl font-bold ${
                              game.awayScore > game.homeScore ? 'text-blue-600' :
                              game.awayScore < game.homeScore ? 'text-red-600' :
                              'text-gray-600'
                            }`}>
                              {game.awayScore}
                            </div>
                            {game.awayScore > game.homeScore && (
                              <span className="text-sm font-bold text-blue-600 bg-blue-100 px-2 py-1 rounded">승</span>
                            )}
                            {game.awayScore < game.homeScore && (
                              <span className="text-sm font-bold text-red-600 bg-red-100 px-2 py-1 rounded">패</span>
                            )}
                            {game.awayScore === game.homeScore && (
                              <span className="text-sm font-bold text-gray-600 bg-gray-100 px-2 py-1 rounded">무</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 상태 */}
                    <div className="w-24 text-center">
                      <span className={`inline-block px-4 py-2 rounded-lg text-sm font-bold ${
                        game.status === '예정' ? 'bg-blue-100 text-blue-800' :
                        game.status === '진행중' ? 'bg-green-100 text-green-800' :
                        game.status === '종료' ? 'bg-gray-100 text-gray-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {game.status}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
