'use client';

import { useEffect, useState, useMemo } from 'react';
import { collection, getDocs, addDoc, deleteDoc, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSave, faTimes, faCalendar } from '@fortawesome/free-solid-svg-icons';

interface Game {
  id: string;
  date: string;
  time: string;
  headcount: number;
  homeStreamers: string[];
  awayStreamers: string[];
  status: string;
  homeScore?: number;
  awayScore?: number;
  // 레거시 호환
  homeTeam?: string;
  awayTeam?: string;
  stadium?: string;
}

interface Streamer {
  id: string;
  name: string;
}

const HEADCOUNT_OPTIONS = [1, 2, 3, 4];

const emptyStreamers = (n: number): string[] => Array(n).fill('');

function getDefaultFormData() {
  return {
    date: '',
    time: '',
    headcount: 1 as number,
    homeStreamers: [''] as string[],
    awayStreamers: [''] as string[],
    status: '예정',
    homeScore: 0,
    awayScore: 0
  };
}

export default function ScheduleManager() {
  const [games, setGames] = useState<Game[]>([]);
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState(getDefaultFormData);

  useEffect(() => {
    loadData();
  }, []);

  const loadStreamers = async () => {
    try {
      const snapshot = await getDocs(collection(db, 'streamers'));
      const list = snapshot.docs
        .map(d => ({
          id: d.id,
          name: (d.data().name as string) || ''
        }))
        .filter(s => s.name)
        .sort((a, b) => a.name.localeCompare(b.name)) as Streamer[];
      setStreamers(list);
    } catch (error) {
      console.error('스트리머 목록 로드 실패:', error);
    }
  };

  const loadData = async () => {
    try {
      await loadStreamers();
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

  const setHeadcount = (n: number) => {
    const prev = formData.headcount;
    const newHome = [...formData.homeStreamers];
    const newAway = [...formData.awayStreamers];
    if (n > prev) {
      while (newHome.length < n) newHome.push('');
      while (newAway.length < n) newAway.push('');
    } else {
      newHome.length = n;
      newAway.length = n;
    }
    setFormData({ ...formData, headcount: n, homeStreamers: newHome, awayStreamers: newAway });
  };

  const setHomeStreamer = (index: number, value: string) => {
    const next = [...formData.homeStreamers];
    next[index] = value;
    setFormData({ ...formData, homeStreamers: next });
  };

  const setAwayStreamer = (index: number, value: string) => {
    const next = [...formData.awayStreamers];
    next[index] = value;
    setFormData({ ...formData, awayStreamers: next });
  };

  const validateForm = (): string | null => {
    if (!formData.date || !formData.time) return '날짜와 시간을 입력해주세요.';
    const n = formData.headcount;
    for (let i = 0; i < n; i++) {
      if (!formData.homeStreamers[i]?.trim()) return `홈 스트리머 ${i + 1}을(를) 선택해주세요.`;
      if (!formData.awayStreamers[i]?.trim()) return `원정 스트리머 ${i + 1}을(를) 선택해주세요.`;
    }
    const homeSet = new Set(formData.homeStreamers.slice(0, n).map(s => s.trim()).filter(Boolean));
    const awaySet = new Set(formData.awayStreamers.slice(0, n).map(s => s.trim()).filter(Boolean));
    if (homeSet.size !== formData.homeStreamers.slice(0, n).filter(Boolean).length) return '홈 스트리머는 중복 선택할 수 없습니다.';
    if (awaySet.size !== formData.awayStreamers.slice(0, n).filter(Boolean).length) return '원정 스트리머는 중복 선택할 수 없습니다.';
    for (const name of homeSet) {
      if (awaySet.has(name)) return '홈과 원정에 같은 스트리머를 선택할 수 없습니다.';
    }
    return null;
  };

  const payload = useMemo(() => ({
    date: formData.date,
    time: formData.time,
    headcount: formData.headcount,
    homeStreamers: formData.homeStreamers.slice(0, formData.headcount),
    awayStreamers: formData.awayStreamers.slice(0, formData.headcount),
    status: formData.status,
    homeScore: formData.homeScore,
    awayScore: formData.awayScore
  }), [formData]);

  const handleAdd = async () => {
    const err = validateForm();
    if (err) {
      alert(err);
      return;
    }
    try {
      await addDoc(collection(db, 'games'), payload);
      setShowAddForm(false);
      setFormData(getDefaultFormData());
      loadData();
    } catch (error) {
      console.error('경기 추가 실패:', error);
      alert('경기 추가에 실패했습니다.');
    }
  };

  const handleEdit = (game: Game) => {
    setEditingId(game.id);
    const home = game.homeStreamers?.length ? game.homeStreamers : (game.homeTeam ? [game.homeTeam] : ['']);
    const away = game.awayStreamers?.length ? game.awayStreamers : (game.awayTeam ? [game.awayTeam] : ['']);
    const n = Math.max(1, game.headcount || home.length || 1, away.length || 1);
    const homeStreamers = [...home];
    const awayStreamers = [...away];
    while (homeStreamers.length < n) homeStreamers.push('');
    while (awayStreamers.length < n) awayStreamers.push('');
    setFormData({
      date: game.date,
      time: game.time,
      headcount: n,
      homeStreamers: homeStreamers.slice(0, n),
      awayStreamers: awayStreamers.slice(0, n),
      status: game.status,
      homeScore: game.homeScore ?? 0,
      awayScore: game.awayScore ?? 0
    });
  };

  const handleUpdate = async () => {
    if (!editingId) return;
    const err = validateForm();
    if (err) {
      alert(err);
      return;
    }
    try {
      await updateDoc(doc(db, 'games', editingId), payload);
      setEditingId(null);
      setFormData(getDefaultFormData());
      loadData();
    } catch (error) {
      console.error('경기 수정 실패:', error);
      alert('경기 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await deleteDoc(doc(db, 'games', id));
      loadData();
    } catch (error) {
      console.error('경기 삭제 실패:', error);
      alert('경기 삭제에 실패했습니다.');
    }
  };

  const cancelEdit = () => {
    setEditingId(null);
    setShowAddForm(false);
    setFormData(getDefaultFormData());
  };

  const gameDisplayHome = (game: Game) => {
    if (game.homeStreamers?.length) return game.homeStreamers.join(', ');
    return game.homeTeam ?? '-';
  };

  const gameDisplayAway = (game: Game) => {
    if (game.awayStreamers?.length) return game.awayStreamers.join(', ');
    return game.awayTeam ?? '-';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
          <div className="text-xl text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-[#001A35] mb-2">경기 일정 관리</h1>
          <div className="text-lg text-gray-600">
            총 <span className="font-bold text-[#001A35]">{games.length}</span>개의 경기
          </div>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002A55] transition-colors flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faPlus} />
          경기 추가
        </button>
      </div>

      {(showAddForm || editingId) && (
        <div className="bg-white border-2 border-[#001A35] rounded-xl p-6">
          <h3 className="text-xl font-bold text-[#001A35] mb-4">
            {editingId ? '경기 수정' : '새 경기 추가'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">날짜 *</label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">시간 *</label>
              <input
                type="time"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">경기 인원수 *</label>
              <select
                value={formData.headcount}
                onChange={(e) => setHeadcount(Number(e.target.value))}
                className="w-full max-w-[120px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
              >
                {HEADCOUNT_OPTIONS.map(n => (
                  <option key={n} value={n}>{n}명</option>
                ))}
              </select>
            </div>
            {Array.from({ length: formData.headcount }, (_, i) => (
              <div key={`home-${i}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  홈 스트리머 {i + 1} *
                </label>
                <select
                  value={formData.homeStreamers[i] ?? ''}
                  onChange={(e) => setHomeStreamer(i, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
                  disabled={streamers.length === 0}
                >
                  <option value="">{streamers.length === 0 ? '스트리머를 먼저 추가해주세요' : '선택하세요'}</option>
                  {streamers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
            {Array.from({ length: formData.headcount }, (_, i) => (
              <div key={`away-${i}`}>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  원정 스트리머 {i + 1} *
                </label>
                <select
                  value={formData.awayStreamers[i] ?? ''}
                  onChange={(e) => setAwayStreamer(i, e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
                  disabled={streamers.length === 0}
                >
                  <option value="">{streamers.length === 0 ? '스트리머를 먼저 추가해주세요' : '선택하세요'}</option>
                  {streamers.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
              </div>
            ))}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">상태</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
              >
                <option value="예정">예정</option>
                <option value="진행중">진행중</option>
                <option value="종료">종료</option>
                <option value="취소">취소</option>
              </select>
            </div>
            {formData.status === '종료' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">홈 스코어</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.homeScore}
                    onChange={(e) => setFormData({ ...formData, homeScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">원정 스코어</label>
                  <input
                    type="number"
                    min={0}
                    value={formData.awayScore}
                    onChange={(e) => setFormData({ ...formData, awayScore: parseInt(e.target.value, 10) || 0 })}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-[#001A35]"
                  />
                </div>
              </>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002A55] transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faSave} />
              {editingId ? '수정' : '추가'}
            </button>
            <button
              onClick={cancelEdit}
              className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faTimes} />
              취소
            </button>
          </div>
        </div>
      )}

      {games.length === 0 ? (
        <div className="flex items-center justify-center min-h-[300px] bg-gray-50 rounded-xl">
          <div className="text-center">
            <FontAwesomeIcon icon={faCalendar} className="text-6xl text-gray-300 mb-4" />
            <p className="text-xl text-gray-400">등록된 경기가 없습니다</p>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">날짜</th>
                <th className="px-4 py-3 text-left text-sm font-bold text-gray-700">시간</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">홈 스트리머</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">VS</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">원정 스트리머</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">상태</th>
                <th className="px-4 py-3 text-center text-sm font-bold text-gray-700">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {games.map((game) => (
                <tr key={game.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-800">{game.date}</td>
                  <td className="px-4 py-3 text-sm text-gray-800">{game.time}</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-3 py-1 bg-[#001A35] text-white rounded-full text-sm font-bold max-w-[200px] truncate" title={gameDisplayHome(game)}>
                      {gameDisplayHome(game)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-gray-400 font-bold">VS</td>
                  <td className="px-4 py-3 text-center">
                    <span className="inline-block px-3 py-1 bg-gray-600 text-white rounded-full text-sm font-bold max-w-[200px] truncate" title={gameDisplayAway(game)}>
                      {gameDisplayAway(game)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${
                      game.status === '예정' ? 'bg-blue-100 text-blue-800' :
                      game.status === '진행중' ? 'bg-green-100 text-green-800' :
                      game.status === '종료' ? 'bg-gray-100 text-gray-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {game.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex gap-2 justify-center">
                      <button
                        onClick={() => handleEdit(game)}
                        className="px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors text-sm"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleDelete(game.id)}
                        className="px-3 py-1 bg-red-500 text-white rounded hover:bg-red-600 transition-colors text-sm"
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
