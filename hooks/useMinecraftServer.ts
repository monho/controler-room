import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface ServerStatus {
  online: boolean;
  maintenance?: boolean;
  players?: {
    online: number;
    max: number;
  };
  version?: string;
  motd?: string;
  icon?: string;
}

export function useMinecraftServer() {
  const [status, setStatus] = useState<ServerStatus>({ online: false });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const response = await fetch('/api/minecraft/status');
        const data = await response.json();
        setStatus(prev => ({ ...data, maintenance: prev.maintenance }));
      } catch (error) {
        console.error('Failed to fetch server status:', error);
        setStatus(prev => ({ online: false, maintenance: prev.maintenance }));
      } finally {
        setLoading(false);
      }
    };

    checkStatus();
    
    // 30초마다 상태 확인
    const interval = setInterval(checkStatus, 30000);
    
    // Firestore에서 점검 모드 실시간 감지
    const unsubscribe = onSnapshot(
      doc(db, 'settings', 'server'),
      (doc) => {
        if (doc.exists()) {
          setStatus(prev => ({ 
            ...prev, 
            maintenance: doc.data().maintenanceMode || false 
          }));
        }
      },
      (error) => {
        console.error('Failed to listen to maintenance mode:', error);
      }
    );
    
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, []);

  return { status, loading };
}
