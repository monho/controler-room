'use client';

import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCalendar, faBaseball } from '@fortawesome/free-solid-svg-icons';

interface Team {
  id: string;
  name: string;
  logo: string;
}

interface Game {
  id: string;
  date: string;
  dayOfWeek?: string;
  time: string;
  homeStreamers?: string[];
  awayStreamers?: string[];
  homeTeam?: string;
  homeScore: number;
  awayTeam?: string;
  awayScore: number;
  status: string;
  stadium?: string;
}

interface ScheduleCalendarProps {
  currentMonth: number;
  currentYear: number;
  teams: Team[];
  games: Game[];
}

export default function ScheduleCalendar({
  currentMonth,
  currentYear,
  teams,
  games
}: ScheduleCalendarProps) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedTeam, setSelectedTeam] = useState('all');

  const months = [3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 1, 2];
  const monthNames = ['3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월', '1월', '2월'];

  const selectedTeamName = selectedTeam === 'all' ? null : teams.find(t => t.id === selectedTeam)?.name;
  const filteredGames = !selectedTeamName
    ? games
    : games.filter(g => g.homeTeam === selectedTeamName || g.awayTeam === selectedTeamName);

  const filteredGamesByDate = filteredGames.reduce((acc, game) => {
    if (!acc[game.date]) {
      acc[game.date] = [];
    }
    acc[game.date].push(game);
    return acc;
  }, {} as Record<string, Game[]>);

  return (
    <div>
      {/* 헤더 */}
      <div className="flex items-center justify-center mb-6">
        <div className="flex items-center gap-4">
          <button className="text-gray-400 hover:text-gray-600">
            최근
          </button>
          <button className="text-2xl text-gray-600 hover:text-gray-800">
            ‹
          </button>
          <h2 className="text-3xl font-bold text-gray-800">
            {selectedYear}
          </h2>
          <button className="text-2xl text-gray-600 hover:text-gray-800">
            ›
          </button>
          <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50">
            <FontAwesomeIcon icon={faCalendar} />
          </button>
        </div>
      </div>

      {/* 월 선택 */}
      <div className="flex items-center justify-center gap-2 mb-6 overflow-x-auto pb-2">
        {months.map((month, index) => (
          <button
            key={month}
            onClick={() => setSelectedMonth(month)}
            className={`px-4 py-2 whitespace-nowrap font-medium transition-colors ${selectedMonth === month
              ? 'text-[#001A35] border-b-2 border-[#001A35]'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            {monthNames[index]}
          </button>
        ))}
        <button className="px-4 py-2 whitespace-nowrap font-medium text-gray-500 hover:text-gray-700">
          포스트시즌
        </button>
      </div>

      {/* 크루 필터 */}
      <div className="flex items-center justify-center gap-3 mb-6 overflow-x-auto pb-2">
        {teams.map((team) => (
          <button
            key={team.id}
            onClick={() => setSelectedTeam(team.id)}
            className={`flex flex-col items-center gap-1 p-3 rounded-lg transition-all ${selectedTeam === team.id
              ? 'bg-[#001A35] text-white'
              : 'hover:bg-gray-100'
              }`}
          >
            <FontAwesomeIcon icon={faBaseball} className="text-xl" />
            <div className="text-xs font-medium whitespace-nowrap">{team.name}</div>
          </button>
        ))}
      </div>

      {/* 경기 목록 */}
      <div className="space-y-6">
        {Object.entries(filteredGamesByDate).map(([date, dateGames]) => {
          const firstGame = dateGames[0];
          return (
            <div key={date} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* 날짜 헤더 */}
              <div className="bg-gray-50 px-5 py-3 border-b border-gray-200">
                <h3 className="font-bold text-gray-800 text-center">
                  {selectedMonth}월 {date.split('-')[2]}일 ({firstGame.dayOfWeek})
                </h3>
              </div>

              {/* 경기 목록 */}
              <div className="divide-y divide-gray-200">
                {dateGames.map((game) => (
                  <div key={game.id} className="px-5 py-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-center gap-8">
                      <div className="text-sm text-gray-500 w-12">{game.time}</div>

                      {/* 경기 정보 */}
                      <div className="flex items-center gap-6">
                        {/* 원정 스트리머 */}
                        <div className="flex items-center gap-3 min-w-[80px] max-w-[160px] justify-end">
                          <span className="font-bold text-gray-800 truncate">
                            {game.awayStreamers?.length ? game.awayStreamers.join(', ') : (game.awayTeam ?? '-')}
                          </span>
                          <span className="text-2xl font-bold text-gray-800">{game.awayScore}</span>
                        </div>

                        <div className="text-gray-400">vs</div>

                        {/* 홈 스트리머 */}
                        <div className="flex items-center gap-3 min-w-[80px] max-w-[160px]">
                          <span className="text-2xl font-bold text-gray-800">{game.homeScore}</span>
                          <span className="font-bold text-gray-800 truncate">
                            {game.homeStreamers?.length ? game.homeStreamers.join(', ') : (game.homeTeam ?? '-')}
                          </span>
                        </div>
                      </div>

                      {/* 버튼 */}
                      <div className="flex gap-2">
                        <button className="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 text-sm">
                          기록
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 경기가 없을 때 */}
      {Object.keys(filteredGamesByDate).length === 0 && (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <FontAwesomeIcon icon={faCalendar} className="text-6xl text-gray-300 mb-4" />
            <p className="text-2xl text-gray-400 font-medium">예정된 경기가 없습니다</p>
          </div>
        </div>
      )}
    </div>
  );
}
