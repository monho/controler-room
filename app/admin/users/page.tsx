'use client';

import { useState, useEffect } from 'react';
import { auth } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUser, faBan, faCheckCircle, faSearch, faRefresh } from '@fortawesome/free-solid-svg-icons';

interface User {
  uuid: string; // 마인크래프트 UUID
  name?: string; // 마인크래프트 사용자명
  lastLogin?: string; // 최근 로그인 정보
  coins?: number; // 보유 LC (게임 내 화폐)
  banned?: number; // 벤 여부 (0 또는 1)
  banTime?: number; // 벤 시간
  banDuration?: number; // 벤 기간
  banReason?: string; // 벤 사유
  createdAt?: string;
  updatedAt?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterBanned, setFilterBanned] = useState<'all' | 'banned' | 'active'>('all');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/users`);
      const result = await response.json();
      
      if (result.success) {
        setUsers(result.data || []);
      } else {
        console.error('유저 정보 로드 실패:', result.error);
        alert('유저 정보를 불러오는데 실패했습니다: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('유저 정보 로드 실패:', error);
      alert('유저 정보를 불러오는데 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    } finally {
      setLoading(false);
    }
  };

  const toggleBan = async (uuid: string, currentBanned: number) => {
    if (!auth.currentUser) {
      alert('로그인이 필요합니다.');
      return;
    }

    const isBanned = currentBanned === 1;
    if (!confirm(isBanned ? '벤을 해제하시겠습니까?' : '이 유저를 벤하시겠습니까?')) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/users/${uuid}/ban`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          isBanned: !isBanned,
        }),
      });

      const result = await response.json();
      
      if (result.success) {
        await loadUsers();
        alert(result.message || (isBanned ? '벤이 해제되었습니다.' : '유저가 벤되었습니다.'));
      } else {
        alert('벤 상태 변경에 실패했습니다: ' + (result.error || '알 수 없는 오류'));
      }
    } catch (error: any) {
      console.error('벤 상태 변경 실패:', error);
      alert('벤 상태 변경에 실패했습니다: ' + (error.message || '알 수 없는 오류'));
    }
  };

  // 마인크래프트 플레이어 헤드 이미지 URL 생성
  const getPlayerHeadUrl = (uuid: string) => {
    // UUID에서 하이픈 제거
    const cleanUuid = uuid.replace(/-/g, '');
    return `https://crafatar.com/avatars/${cleanUuid}?size=64&overlay`;
  };

  // 필터링된 유저 목록
  const filteredUsers = users.filter(user => {
    // 검색 필터
    const matchesSearch = !searchQuery || 
      user.uuid.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (user.name && user.name.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // 벤 필터
    const isBanned = user.banned === 1;
    const matchesBanFilter = 
      filterBanned === 'all' ||
      (filterBanned === 'banned' && isBanned) ||
      (filterBanned === 'active' && !isBanned);
    
    return matchesSearch && matchesBanFilter;
  });

  // 날짜 포맷팅
  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('ko-KR', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
          <div className="text-xl text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#001A35] mb-2">유저 관리</h1>
        <p className="text-gray-600">마인크래프트 서버 유저 정보를 관리합니다.</p>
      </div>

      {/* 검색 및 필터 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 검색 */}
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="UUID 또는 사용자명으로 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
            />
            <FontAwesomeIcon
              icon={faSearch}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400"
            />
          </div>

          {/* 벤 필터 */}
          <select
            value={filterBanned}
            onChange={(e) => setFilterBanned(e.target.value as 'all' | 'banned' | 'active')}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
          >
            <option value="all">전체</option>
            <option value="banned">벤된 유저</option>
            <option value="active">활성 유저</option>
          </select>

          {/* 새로고침 */}
          <button
            onClick={loadUsers}
            className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002a4f] transition-colors flex items-center gap-2"
          >
            <FontAwesomeIcon icon={faRefresh} />
            새로고침
          </button>
        </div>
      </div>

      {/* 유저 목록 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b-2 border-gray-200">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">플레이어</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase">UUID</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">최근 로그인</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">보유 LC</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">상태</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-gray-600 uppercase">작업</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    {searchQuery || filterBanned !== 'all' 
                      ? '검색 결과가 없습니다.' 
                      : '등록된 유저가 없습니다.'}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.uuid} className="hover:bg-gray-50 transition-colors">
                    {/* 플레이어 정보 */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={getPlayerHeadUrl(user.uuid)}
                          alt={user.name || 'Player'}
                          className="w-10 h-10 rounded-full border border-gray-200"
                          onError={(e) => {
                            // 이미지 로드 실패 시 기본 아이콘 표시
                            (e.target as HTMLImageElement).style.display = 'none';
                            const parent = (e.target as HTMLImageElement).parentElement;
                            if (parent && !parent.querySelector('.fallback-icon')) {
                              const fallback = document.createElement('div');
                              fallback.className = 'fallback-icon w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center';
                              fallback.innerHTML = '<svg class="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clip-rule="evenodd" /></svg>';
                              parent.appendChild(fallback);
                            }
                          }}
                        />
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.name || 'Unknown'}
                          </div>
                          {user.name && (
                            <div className="text-sm text-gray-500">{user.uuid.substring(0, 8)}...</div>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* UUID */}
                    <td className="px-6 py-4">
                      <code className="text-xs text-gray-600 font-mono bg-gray-100 px-2 py-1 rounded">
                        {user.uuid}
                      </code>
                    </td>

                    {/* 최근 로그인 */}
                    <td className="px-6 py-4 text-center text-sm text-gray-600">
                      {formatDate(user.lastLogin)}
                    </td>

                    {/* 보유 LC */}
                    <td className="px-6 py-4 text-center">
                      <span className="text-lg font-bold text-blue-600">
                        {user.coins?.toLocaleString() || 0}
                      </span>
                      <span className="text-sm text-gray-500 ml-1">LC</span>
                    </td>

                    {/* 상태 */}
                    <td className="px-6 py-4 text-center">
                      {user.banned === 1 ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
                          <FontAwesomeIcon icon={faBan} />
                          벤됨
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                          <FontAwesomeIcon icon={faCheckCircle} />
                          활성
                        </span>
                      )}
                    </td>

                    {/* 작업 */}
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleBan(user.uuid, user.banned || 0)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                          user.banned === 1
                            ? 'bg-green-600 text-white hover:bg-green-700'
                            : 'bg-red-600 text-white hover:bg-red-700'
                        }`}
                      >
                        {user.banned === 1 ? '벤 해제' : '벤하기'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 통계 */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-sm text-gray-600">
            <div>
              총 <span className="font-bold text-gray-900">{users.length}</span>명의 유저
            </div>
            <div>
              활성: <span className="font-bold text-green-600">{users.filter(u => u.banned !== 1).length}</span>명 | 
              벤됨: <span className="font-bold text-red-600">{users.filter(u => u.banned === 1).length}</span>명
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

