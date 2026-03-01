'use client';

import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import AdminLogin from '@/components/AdminLogin';
import Header from '@/components/Header';
import AdminSidebar from '@/components/AdminSidebar';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSignOutAlt } from '@fortawesome/free-solid-svg-icons';
import { useMinecraftServer } from '@/hooks/useMinecraftServer';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { status } = useMinecraftServer();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 즉시 현재 사용자 확인 (캐시된 상태)
    const currentUser = auth.currentUser;
    if (currentUser) {
      setUser(currentUser);
      setLoading(false);
    }

    // 인증 상태 변경 감지
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error('로그아웃 에러:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-gray-300 border-t-[#001A35] mb-4"></div>
          <div className="text-xl text-gray-600">로딩 중...</div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AdminLogin onLoginSuccess={() => setUser(auth.currentUser)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header serverStatus={{ 
        isOnline: status.online,
        maintenance: status.maintenance,
        players: status.players
      }} />
      
      <div className="flex">
        <AdminSidebar />
        
        <main className="flex-1">
          <div className="max-w-[1600px] mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
              <div>
                <p className="text-sm text-gray-600">로그인: {user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
              >
                <FontAwesomeIcon icon={faSignOutAlt} />
                로그아웃
              </button>
            </div>
            
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
