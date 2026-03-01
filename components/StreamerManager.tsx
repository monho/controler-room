'use client';

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faTrash, faEdit, faSave, faTimes } from '@fortawesome/free-solid-svg-icons';

interface Streamer {
  id: string;
  name: string;
  soopId: string;
  team: string | { name: string } | undefined;
  platform: string;
  thumbnail?: string;
}

interface Team {
  id: string;
  name: string;
}

export default function StreamerManager() {
  const [streamers, setStreamers] = useState<Streamer[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    soopId: '',
    team: '',
    platform: 'SOOP',
  });

  useEffect(() => {
    loadTeams();
    loadStreamers();
  }, []);

  const loadTeams = async () => {
    try {
      const teamsQuery = query(collection(db, 'teams'), orderBy('name'));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        name: doc.data().name,
      })) as Team[];
      setTeams(teamsData);
      
      // 기본값 설정 (크루가 있을 경우 첫 번째 크루)
      if (teamsData.length > 0 && !formData.team) {
        setFormData(prev => ({ ...prev, team: teamsData[0].name }));
      }
    } catch (error) {
      console.error('크루 목록 로드 실패:', error);
    }
  };

  // 스트리머 추가 후 즉시 목록 업데이트 (리로드 없이)
  const addStreamerToList = (newStreamer: Streamer) => {
    setStreamers(prev => [...prev, newStreamer]);
  };

  const loadStreamers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'streamers'));
      const streamersData = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Streamer[];
      setStreamers(streamersData);
    } catch (error) {
      console.error('스트리머 로드 에러:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!formData.name || !formData.soopId) {
      alert('이름과 SOOP ID를 입력해주세요.');
      return;
    }

    if (!formData.team) {
      alert('크루를 선택해주세요.');
      return;
    }

    try {
      const docRef = await addDoc(collection(db, 'streamers'), {
        ...formData,
        createdAt: serverTimestamp(),
      });
      
      // 즉시 UI 업데이트 (Firestore 재조회 없이)
      const newStreamer: Streamer = {
        id: docRef.id,
        ...formData,
      };
      setStreamers(prev => [...prev, newStreamer]);
      
      // 기본 크루 설정 (크루 목록의 첫 번째 크루 또는 빈 문자열)
      const defaultTeam = teams.length > 0 ? teams[0].name : '';
      setFormData({ name: '', soopId: '', team: defaultTeam, platform: 'SOOP' });
      setShowAddForm(false);
      alert('스트리머가 추가되었습니다.');
    } catch (error) {
      console.error('스트리머 추가 에러:', error);
      alert('스트리머 추가에 실패했습니다.');
    }
  };

  const handleEdit = (streamer: Streamer) => {
    setEditingId(streamer.id);
    // team이 객체일 수도 있으므로 문자열로 변환
    let teamName = '';
    if (typeof streamer.team === 'string') {
      teamName = streamer.team;
    } else if (streamer.team && typeof streamer.team === 'object' && 'name' in streamer.team) {
      teamName = streamer.team.name;
    }
    setFormData({
      name: streamer.name,
      soopId: streamer.soopId,
      team: teamName,
      platform: streamer.platform,
    });
  };

  const handleUpdate = async (id: string) => {
    try {
      await updateDoc(doc(db, 'streamers', id), formData);
      
      // 즉시 UI 업데이트
      setStreamers(prev => prev.map(s => 
        s.id === id ? { ...s, ...formData } : s
      ));
      
      setEditingId(null);
      setFormData({ name: '', soopId: '', team: '두산', platform: 'SOOP' });
      alert('스트리머 정보가 수정되었습니다.');
    } catch (error) {
      console.error('스트리머 수정 에러:', error);
      alert('스트리머 수정에 실패했습니다.');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`${name} 스트리머를 삭제하시겠습니까?`)) {
      return;
    }

    try {
      await deleteDoc(doc(db, 'streamers', id));
      
      // 즉시 UI 업데이트
      setStreamers(prev => prev.filter(s => s.id !== id));
      
      alert('스트리머가 삭제되었습니다.');
    } catch (error) {
      console.error('스트리머 삭제 에러:', error);
      alert('스트리머 삭제에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-[#001A35] mb-3"></div>
        <div className="text-gray-600">스트리머 목록 로딩 중...</div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#001A35]">스트리머 관리</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002447] transition-colors flex items-center gap-2"
        >
          <FontAwesomeIcon icon={showAddForm ? faTimes : faPlus} />
          {showAddForm ? '취소' : '스트리머 추가'}
        </button>
      </div>

      {/* 추가 폼 */}
      {showAddForm && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-6">
          <h3 className="font-bold text-lg mb-4">새 스트리머 추가</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">이름</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                placeholder="스트리머 이름"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">SOOP ID</label>
              <input
                type="text"
                value={formData.soopId}
                onChange={(e) => setFormData({ ...formData, soopId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                placeholder="SOOP 아이디"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">크루</label>
              <select
                value={formData.team}
                onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                disabled={teams.length === 0}
              >
                {teams.length === 0 ? (
                  <option value="">크루를 먼저 추가해주세요</option>
                ) : (
                  teams.map(team => (
                    <option key={team.id} value={team.name}>{team.name}</option>
                  ))
                )}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">플랫폼</label>
              <select
                value={formData.platform}
                onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
              >
                <option value="SOOP">SOOP</option>
                <option value="트위치">트위치</option>
                <option value="유튜브">유튜브</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleAdd}
              className="px-6 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002447] transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              추가
            </button>
          </div>
        </div>
      )}

      {/* 스트리머 목록 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">이름</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">SOOP ID</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">크루</th>
              <th className="px-6 py-3 text-left text-sm font-bold text-gray-700">플랫폼</th>
              <th className="px-6 py-3 text-right text-sm font-bold text-gray-700">관리</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {streamers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  등록된 스트리머가 없습니다.
                </td>
              </tr>
            ) : (
              streamers.map((streamer) => (
                <tr key={streamer.id} className="hover:bg-gray-50">
                  {editingId === streamer.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="text"
                          value={formData.soopId}
                          onChange={(e) => setFormData({ ...formData, soopId: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={formData.team}
                          onChange={(e) => setFormData({ ...formData, team: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          {teams.map(team => (
                            <option key={team.id} value={team.name}>{team.name}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={formData.platform}
                          onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded"
                        >
                          <option value="SOOP">SOOP</option>
                          <option value="트위치">트위치</option>
                          <option value="유튜브">유튜브</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleUpdate(streamer.id)}
                          className="text-green-600 hover:text-green-800 mr-3"
                        >
                          <FontAwesomeIcon icon={faSave} />
                        </button>
                        <button
                          onClick={() => {
                            setEditingId(null);
                            setFormData({ name: '', soopId: '', team: '두산', platform: 'SOOP' });
                          }}
                          className="text-gray-600 hover:text-gray-800"
                        >
                          <FontAwesomeIcon icon={faTimes} />
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{streamer.name}</td>
                      <td className="px-6 py-4 text-gray-600">{streamer.soopId}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-[#001A35] text-white text-xs rounded">
                          {typeof streamer.team === 'string' ? streamer.team : streamer.team?.name || '크루 없음'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{streamer.platform}</td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEdit(streamer)}
                          className="text-blue-600 hover:text-blue-800 mr-3"
                        >
                          <FontAwesomeIcon icon={faEdit} />
                        </button>
                        <button
                          onClick={() => handleDelete(streamer.id, streamer.name)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
