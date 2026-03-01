'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faServer, faStop, faPlay, faSync, faExclamationTriangle, faWrench } from '@fortawesome/free-solid-svg-icons';

export default function ServerSettingsPage() {
  const [serverInfo, setServerInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    loadServerInfo();
    loadMaintenanceStatus();
    const interval = setInterval(() => {
      loadServerInfo();
      loadMaintenanceStatus();
    }, 10000); // 10초마다 갱신
    return () => clearInterval(interval);
  }, []);

  const loadServerInfo = async () => {
    try {
      const response = await fetch('/api/minecraft/status');
      const data = await response.json();
      setServerInfo(data);
      setLoading(false);
    } catch (error) {
      console.error('서버 정보 로드 실패:', error);
      setLoading(false);
    }
  };

  const loadMaintenanceStatus = async () => {
    try {
      const docRef = doc(db, 'settings', 'server');
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setMaintenanceMode(docSnap.data().maintenanceMode || false);
      }
    } catch (error) {
      console.error('점검 상태 로드 실패:', error);
    }
  };

  const toggleMaintenanceMode = async () => {
    try {
      const newMode = !maintenanceMode;
      await setDoc(doc(db, 'settings', 'server'), {
        maintenanceMode: newMode,
        updatedAt: serverTimestamp()
      });
      setMaintenanceMode(newMode);
      alert(`점검 모드가 ${newMode ? '활성화' : '비활성화'}되었습니다.`);
    } catch (error) {
      console.error('점검 모드 변경 실패:', error);
      alert('점검 모드 변경에 실패했습니다.');
    }
  };

  const handleServerAction = async (action: 'stop' | 'restart') => {
    if (!confirm(`정말 서버를 ${action === 'stop' ? '종료' : '재시작'}하시겠습니까?`)) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch('/api/minecraft/control', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const result = await response.json();

      if (result.success) {
        alert(`서버 ${action === 'stop' ? '종료' : '재시작'} 명령이 전송되었습니다.`);
        setTimeout(loadServerInfo, 5000); // 5초 후 상태 갱신
      } else {
        alert(`오류: ${result.error || '알 수 없는 오류'}`);
      }
    } catch (error) {
      console.error('서버 제어 실패:', error);
      alert('서버 제어에 실패했습니다.');
    } finally {
      setActionLoading(false);
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
      <div>
        <h1 className="text-3xl font-bold text-[#001A35] mb-2">서버 설정</h1>
        <p className="text-gray-600">마인크래프트 서버 상태 및 제어</p>
      </div>

      {/* 서버 상태 카드 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <FontAwesomeIcon icon={faServer} className="text-[#001A35]" />
            서버 상태
          </h2>
          <button
            onClick={loadServerInfo}
            disabled={actionLoading}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <FontAwesomeIcon icon={faSync} className={actionLoading ? 'animate-spin' : ''} />
            새로고침
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 상태 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">서버 상태</div>
            <div className={`text-2xl font-bold flex items-center gap-2 ${maintenanceMode ? 'text-yellow-600' :
                serverInfo?.online ? 'text-green-600' : 'text-red-600'
              }`}>
              ● {maintenanceMode ? '점검 중' : serverInfo?.online ? '온라인' : '오프라인'}
            </div>
          </div>

          {/* 플레이어 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">접속 플레이어</div>
            <div className="text-2xl font-bold text-gray-800">
              {serverInfo?.players?.online || 0} / {serverInfo?.players?.max || 0}
            </div>
          </div>

          {/* 버전 */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">서버 버전</div>
            <div className="text-xl font-bold text-gray-800">
              {serverInfo?.version || 'N/A'}
            </div>
          </div>

          {/* MOTD */}
          <div className="bg-gray-50 rounded-lg p-4">
            <div className="text-sm text-gray-600 mb-2">서버 메시지</div>
            <div className="text-sm text-gray-800 line-clamp-2">
              {serverInfo?.motd || 'N/A'}
            </div>
          </div>
        </div>
      </div>

      {/* 점검 모드 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">점검 모드</h2>

        <div className="flex items-center justify-between">
          <div>
            <div className="font-bold text-gray-800 mb-1">서버 점검 중 표시</div>
            <div className="text-sm text-gray-600">
              활성화하면 모든 페이지에서 서버 상태가 "점검 중"으로 표시됩니다.
            </div>
          </div>
          <button
            onClick={toggleMaintenanceMode}
            className={`px-6 py-3 rounded-lg font-bold transition-all ${maintenanceMode
                ? 'bg-yellow-500 text-white hover:bg-yellow-600'
                : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
              }`}
          >
            <FontAwesomeIcon icon={faWrench} className="mr-2" />
            {maintenanceMode ? '점검 모드 ON' : '점검 모드 OFF'}
          </button>
        </div>
      </div>

      {/* 서버 제어 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">서버 제어</h2>


        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 서버 시작 */}
          <button
            disabled={true}
            className="px-6 py-4 bg-gray-400 text-white rounded-lg cursor-not-allowed flex flex-col items-center gap-2"
            title="서버 시작은 RCON으로 불가능합니다. 서버 호스팅 컴퓨터에서 직접 시작해주세요."
          >
            <FontAwesomeIcon icon={faPlay} className="text-2xl" />
            <span className="font-bold">서버 시작</span>
            <span className="text-xs opacity-80">수동 시작 필요</span>
          </button>

          {/* 서버 재시작 */}
          <button
            onClick={() => handleServerAction('restart')}
            disabled={actionLoading || !serverInfo?.online}
            className="px-6 py-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Bukkit/Spigot/Paper 서버에서만 작동합니다"
          >
            <FontAwesomeIcon icon={faSync} className="text-2xl" />
            <span className="font-bold">서버 재시작</span>
            <span className="text-xs opacity-80">플러그인 필요</span>
          </button>

          {/* 서버 종료 */}
          <button
            onClick={() => handleServerAction('stop')}
            disabled={actionLoading || !serverInfo?.online}
            className="px-6 py-4 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FontAwesomeIcon icon={faStop} className="text-2xl" />
            <span className="font-bold">서버 종료</span>
            <span className="text-xs opacity-80">RCON 사용</span>
          </button>
        </div>

        {/* 추가 안내 */}
        <div className="mt-4 bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
          <div className="text-sm text-blue-800">
            <div className="font-bold mb-2">💡 서버 제어 안내</div>
            <ul className="list-disc list-inside space-y-1">
              <li><strong>서버 시작</strong>: RCON으로 불가능. 서버 호스팅 PC에서 직접 실행해주세요.</li>
              <li><strong>서버 재시작</strong>: Bukkit/Spigot/Paper 서버에 restart 명령어가 있어야 작동합니다. 바닐라 서버는 지원하지 않습니다.</li>
              <li><strong>서버 종료</strong>: 모든 서버에서 작동합니다.</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 서버 설정 정보 */}
      <div className="bg-white border-2 border-gray-200 rounded-xl p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">서버 연결 정보</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-600">서버 주소</span>
            <span className="font-mono font-bold text-gray-800">
              {process.env.NEXT_PUBLIC_MINECRAFT_SERVER_HOST || '설정되지 않음'}
            </span>
          </div>
          <div className="flex justify-between items-center py-2 border-b border-gray-200">
            <span className="text-gray-600">포트</span>
            <span className="font-mono font-bold text-gray-800">
              {process.env.NEXT_PUBLIC_MINECRAFT_SERVER_PORT || '25565'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
