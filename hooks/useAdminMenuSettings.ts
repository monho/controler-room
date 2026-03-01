'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import type { MenuVisibility } from '@/lib/adminMenus';
import { ADMIN_MENU_ITEMS } from '@/lib/adminMenus';

const ADMIN_DOC = 'admin';
const MENUS_DOC = 'adminMenus';

export interface AdminSettings {
  adminEmails: string[];
}

export interface AdminMenusSettings {
  visibility: MenuVisibility;
}

/** 관리자 여부: adminEmails가 비어 있으면 모두 관리자(기본), 아니면 목록에 있는 이메일만 */
export function useIsAdmin(): { isAdmin: boolean; loading: boolean } {
  const [adminEmails, setAdminEmails] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const ref = doc(db, 'settings', ADMIN_DOC);
        const snap = await getDoc(ref);
        const list = snap.exists() ? (snap.data().adminEmails as string[] | undefined) ?? [] : [];
        if (!cancelled) setAdminEmails(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setAdminEmails([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const isAdmin =
    !loading &&
    (adminEmails.length === 0 || (!!user?.email && adminEmails.includes(user.email)));

  return { isAdmin, loading };
}

/** 메뉴 노출 설정 + 관리자 목록 (메뉴 관리 페이지용) */
export function useAdminMenuSettings() {
  const [visibility, setVisibilityState] = useState<MenuVisibility>({});
  const [adminEmails, setAdminEmailsState] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const user = auth.currentUser;
  const isAdmin =
    adminEmails.length === 0 || (!!user?.email && adminEmails.includes(user.email));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [adminSnap, menusSnap] = await Promise.all([
          getDoc(doc(db, 'settings', ADMIN_DOC)),
          getDoc(doc(db, 'settings', MENUS_DOC)),
        ]);
        if (cancelled) return;
        const emails = adminSnap.exists()
          ? (adminSnap.data().adminEmails as string[] | undefined) ?? []
          : [];
        setAdminEmailsState(Array.isArray(emails) ? emails : []);
        const vis = menusSnap.exists()
          ? (menusSnap.data().visibility as MenuVisibility | undefined) ?? {}
          : {};
        setVisibilityState(typeof vis === 'object' && vis !== null ? vis : {});
      } catch {
        if (!cancelled) {
          setAdminEmailsState([]);
          setVisibilityState({});
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const getVisible = (path: string): boolean => {
    if (path in visibility) return visibility[path];
    const item = ADMIN_MENU_ITEMS.find((m) => m.path === path);
    return item ? item.defaultVisibleToNonAdmin : true;
  };

  const setVisibility = async (path: string, visibleToNonAdmin: boolean) => {
    const next = { ...visibility, [path]: visibleToNonAdmin };
    setVisibilityState(next);
    await setDoc(doc(db, 'settings', MENUS_DOC), { visibility: next }, { merge: true });
  };

  const setAdminEmails = async (emails: string[]) => {
    const list = emails.map((e) => e.trim().toLowerCase()).filter(Boolean);
    setAdminEmailsState(list);
    await setDoc(doc(db, 'settings', ADMIN_DOC), { adminEmails: list }, { merge: true });
  };

  return {
    loading,
    isAdmin,
    visibility,
    adminEmails,
    getVisible,
    setVisibility,
    setAdminEmails,
  };
}

/** 사이드바에서 보여줄 메뉴만 필터링 (관리자는 전부, 비관리자는 visibility true인 것만) */
export function useVisibleAdminMenus() {
  const [visibility, setVisibilityState] = useState<MenuVisibility>({});
  const [adminEmails, setAdminEmailsState] = useState<string[]>([]);
  const [user, setUser] = useState(auth.currentUser);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, setUser);
    return () => unsub();
  }, []);

  useEffect(() => {
    let pending = 2;
    const maybeDone = () => {
      pending--;
      if (pending <= 0) setLoading(false);
    };
    const unsubAdmin = onSnapshot(doc(db, 'settings', ADMIN_DOC), (snap) => {
      const emails = snap.exists()
        ? (snap.data().adminEmails as string[] | undefined) ?? []
        : [];
      setAdminEmailsState(Array.isArray(emails) ? emails : []);
      maybeDone();
    });
    const unsubMenus = onSnapshot(doc(db, 'settings', MENUS_DOC), (snap) => {
      const vis = snap.exists()
        ? (snap.data().visibility as MenuVisibility | undefined) ?? {}
        : {};
      setVisibilityState(typeof vis === 'object' && vis !== null ? vis : {});
      maybeDone();
    });
    return () => {
      unsubAdmin();
      unsubMenus();
    };
  }, []);

  const isAdmin =
    adminEmails.length === 0 || (!!user?.email && adminEmails.includes(user.email));

  const visibleItems = ADMIN_MENU_ITEMS.filter((item) => {
    if (isAdmin) return true;
    const v = item.path in visibility ? visibility[item.path] : item.defaultVisibleToNonAdmin;
    return v;
  });

  return { loading, visibleItems, isAdmin };
}
