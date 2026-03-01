'use client';

import { useState, useEffect, useRef } from 'react';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage, auth } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faUsers, faPlus, faEdit, faTrash, faTimes, faSave, faImage, faX } from '@fortawesome/free-solid-svg-icons';
import { preloadImages, preloadImage } from '@/lib/imageCache';

interface Team {
  id: string;
  name: string;
  color?: string;
  logo?: string;
  description?: string;
  createdAt?: string;
}

export default function TeamsPage() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [streamerCounts, setStreamerCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    color: '#001A35',
    description: '',
    logo: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string>('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadTeams();
    loadStreamerCounts();
  }, []);

  const loadTeams = async () => {
    try {
      const teamsQuery = query(collection(db, 'teams'), orderBy('name'));
      const teamsSnapshot = await getDocs(teamsQuery);
      const teamsData = teamsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Team[];
      setTeams(teamsData);
      
      // 로고 이미지 프리로드 및 캐싱
      const logoUrls = teamsData
        .filter(team => team.logo)
        .map(team => team.logo!);
      
      if (logoUrls.length > 0) {
        // 백그라운드에서 이미지 프리로드 (블로킹하지 않음)
        preloadImages(logoUrls).catch(error => {
          console.warn('이미지 프리로드 실패:', error);
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('크루 정보 로드 실패:', error);
      setLoading(false);
    }
  };

  const loadStreamerCounts = async () => {
    try {
      const streamersSnapshot = await getDocs(collection(db, 'streamers'));
      const counts: Record<string, number> = {};

      streamersSnapshot.docs.forEach(doc => {
        const team = doc.data().team;
        if (team) {
          counts[team] = (counts[team] || 0) + 1;
        }
      });

      setStreamerCounts(counts);
    } catch (error) {
      console.error('스트리머 수 로드 실패:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // 이미지 파일만 허용
      if (!file.type.startsWith('image/')) {
        alert('이미지 파일만 업로드 가능합니다.');
        return;
      }
      
      // 파일 크기 제한 (5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB 이하여야 합니다.');
        return;
      }

      setLogoFile(file);
      
      // 미리보기 생성
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const removeLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setFormData({ ...formData, logo: '' });
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const uploadLogo = async (teamId: string): Promise<string | null> => {
    if (!logoFile) {
      return formData.logo || null;
    }

    // 인증 확인
    if (!auth.currentUser) {
      throw new Error('로그인이 필요합니다.');
    }

    try {
      const fileName = `teams/${teamId}/${Date.now()}_${logoFile.name}`;
      const storageRef = ref(storage, fileName);
      
      // 메타데이터와 함께 업로드
      const metadata = {
        contentType: logoFile.type,
      };
      
      await uploadBytes(storageRef, logoFile, metadata);
      const downloadURL = await getDownloadURL(storageRef);
      
      // 업로드된 로고 이미지 즉시 프리로드 및 캐싱
      preloadImage(downloadURL).catch(error => {
        console.warn('업로드된 이미지 프리로드 실패:', error);
      });
      
      return downloadURL;
    } catch (error: any) {
      console.error('로고 업로드 실패:', error);
      if (error?.code === 'storage/unauthorized' || error?.code === 'permission-denied') {
        throw new Error('Storage 권한이 없습니다. Firebase Console에서 Storage 보안 규칙을 확인해주세요.');
      }
      throw new Error(`로고 업로드에 실패했습니다: ${error?.message || '알 수 없는 오류'}`);
    }
  };

  const handleAdd = async () => {
    // 인증 확인
    if (!auth.currentUser) {
      alert('로그인이 필요합니다. 페이지를 새로고침해주세요.');
      return;
    }

    if (!formData.name.trim()) {
      alert('크루 이름을 입력해주세요.');
      return;
    }

    // 중복 확인
    if (teams.some(team => team.name === formData.name.trim())) {
      alert('이미 존재하는 크루 이름입니다.');
      return;
    }

    try {
      setUploading(true);
      
      // 먼저 크루 문서 생성
      const teamRef = await addDoc(collection(db, 'teams'), {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim(),
        createdAt: serverTimestamp(),
      });

      // 로고 업로드
      let logoUrl = formData.logo;
      if (logoFile) {
        try {
          logoUrl = await uploadLogo(teamRef.id) || '';
          // 로고 URL 업데이트
          if (logoUrl) {
            await updateDoc(teamRef, { logo: logoUrl });
          }
        } catch (uploadError) {
          console.error('로고 업로드 실패:', uploadError);
          // 로고 업로드 실패해도 크루는 생성됨
          alert('크루는 생성되었지만 로고 업로드에 실패했습니다. 나중에 수정할 수 있습니다.');
        }
      }

      setShowAddForm(false);
      setFormData({ name: '', color: '#001A35', description: '', logo: '' });
      setLogoFile(null);
      setLogoPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadTeams();
      alert('크루가 성공적으로 추가되었습니다.');
    } catch (error: any) {
      console.error('크루 추가 실패:', error);
      const errorMessage = error?.code === 'permission-denied' 
        ? '권한이 없습니다. Firebase Console에서 보안 규칙을 확인해주세요.'
        : error?.message || '크루 추가에 실패했습니다.';
      alert(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (team: Team) => {
    setEditingId(team.id);
    setFormData({
      name: team.name,
      color: team.color || '#001A35',
      description: team.description || '',
      logo: team.logo || '',
    });
    setLogoFile(null);
    setLogoPreview(team.logo || '');
    setShowAddForm(true);
  };

  const handleUpdate = async () => {
    if (!editingId) return;

    if (!formData.name.trim()) {
      alert('크루 이름을 입력해주세요.');
      return;
    }

    // 중복 확인 (자기 자신 제외)
    if (teams.some(team => team.name === formData.name.trim() && team.id !== editingId)) {
      alert('이미 존재하는 크루 이름입니다.');
      return;
    }

    try {
      setUploading(true);
      
      // 로고 업로드 (새 파일이 있는 경우)
      let logoUrl = formData.logo;
      if (logoFile) {
        // 기존 로고 삭제 (있는 경우)
        const currentTeam = teams.find(t => t.id === editingId);
        if (currentTeam?.logo) {
          try {
            const oldLogoRef = ref(storage, currentTeam.logo);
            await deleteObject(oldLogoRef);
          } catch (error) {
            console.warn('기존 로고 삭제 실패:', error);
          }
        }
        
        logoUrl = await uploadLogo(editingId) || formData.logo;
      }

      await updateDoc(doc(db, 'teams', editingId), {
        name: formData.name.trim(),
        color: formData.color,
        description: formData.description.trim(),
        logo: logoUrl,
        updatedAt: serverTimestamp(),
      });
      
      setEditingId(null);
      setShowAddForm(false);
      setFormData({ name: '', color: '#001A35', description: '', logo: '' });
      setLogoFile(null);
      setLogoPreview('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      loadTeams();
    } catch (error) {
      console.error('크루 수정 실패:', error);
      alert(error instanceof Error ? error.message : '크루 수정에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`정말 "${name}" 크루를 삭제하시겠습니까?\n\n이 크루에 속한 스트리머는 크루 정보가 제거됩니다.`)) {
      return;
    }

    try {
      // 크루 로고 삭제
      const team = teams.find(t => t.id === id);
      if (team?.logo) {
        try {
          const logoRef = ref(storage, team.logo);
          await deleteObject(logoRef);
        } catch (error) {
          console.warn('로고 삭제 실패:', error);
        }
      }

      await deleteDoc(doc(db, 'teams', id));
      loadTeams();
    } catch (error) {
      console.error('크루 삭제 실패:', error);
      alert('크루 삭제에 실패했습니다.');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({ name: '', color: '#001A35', description: '', logo: '' });
    setLogoFile(null);
    setLogoPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          <h1 className="text-3xl font-bold text-[#001A35] mb-2">크루 관리</h1>
          <p className="text-gray-600">크루 추가, 수정, 삭제 및 스트리머 현황</p>
        </div>
        {!showAddForm && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddForm(true)}
              className="px-6 py-3 bg-[#001A35] text-white rounded-lg hover:bg-[#002447] transition-colors flex items-center gap-2"
            >
              <FontAwesomeIcon icon={faPlus} />
              크루 추가
            </button>
          </div>
        )}
      </div>

      {/* 크루 추가/수정 폼 */}
      {showAddForm && (
        <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">
            {editingId ? '크루 수정' : '크루 추가'}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크루 이름 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="예: 두산, LG, 키움"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크루 색상
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 border border-gray-300 rounded-lg cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#001A35"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
                />
              </div>
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                설명
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="크루에 대한 설명 (선택사항)"
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#001A35]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                크루 로고
              </label>
              <div className="space-y-3">
                {(logoPreview || formData.logo) && (
                  <div className="relative inline-block">
                    <img
                      src={logoPreview || formData.logo}
                      alt="로고 미리보기"
                      className="w-32 h-32 object-contain border-2 border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={removeLogo}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <FontAwesomeIcon icon={faX} className="text-xs" />
                    </button>
                  </div>
                )}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                  >
                    <FontAwesomeIcon icon={faImage} />
                    {logoPreview || formData.logo ? '로고 변경' : '로고 업로드'}
                  </label>
                  <p className="text-xs text-gray-500 mt-1">
                    이미지 파일만 가능 (최대 5MB)
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={handleCancel}
              disabled={uploading}
              className="px-6 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={faTimes} />
              취소
            </button>
            <button
              onClick={editingId ? handleUpdate : handleAdd}
              disabled={uploading}
              className="px-6 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002447] transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon icon={editingId ? faSave : faPlus} />
              {uploading ? '처리 중...' : editingId ? '수정' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* 크루 목록 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">등록된 크루</h2>
        
        {teams.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            등록된 크루가 없습니다. 크루를 추가해주세요.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {teams.map((team) => (
              <div
                key={team.id}
                className="bg-gray-50 rounded-lg p-6 border-2 border-gray-200 hover:border-[#001A35] transition-all relative"
                style={{ borderLeftColor: team.color || '#001A35', borderLeftWidth: '4px' }}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      {team.logo ? (
                        <img
                          src={team.logo}
                          alt={`${team.name} 로고`}
                          className="w-12 h-12 object-contain"
                        />
                      ) : (
                        <div
                          className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                          style={{ backgroundColor: team.color || '#001A35' }}
                        >
                          {team.name.charAt(0)}
                        </div>
                      )}
                      <div 
                        className="text-2xl font-bold"
                        style={{ color: team.color || '#001A35' }}
                      >
                        {team.name}
                      </div>
                    </div>
                    {team.description && (
                      <div className="text-sm text-gray-600 mt-2">
                        {team.description}
                      </div>
                    )}
                    <div className="text-sm text-gray-600 mt-2">
                      스트리머 {streamerCounts[team.name] || 0}명
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <button
                    onClick={() => handleEdit(team)}
                    className="flex-1 px-3 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faEdit} />
                    수정
                  </button>
                  <button
                    onClick={() => handleDelete(team.id, team.name)}
                    className="flex-1 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                    삭제
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 통계 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">전체 통계</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">총 크루 수</div>
            <div className="text-3xl font-bold text-[#001A35]">{teams.length}개</div>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">총 스트리머 수</div>
            <div className="text-3xl font-bold text-[#001A35]">
              {Object.values(streamerCounts).reduce((sum, count) => sum + count, 0)}명
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
