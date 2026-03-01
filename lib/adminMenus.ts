import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import {
  faUsers,
  faCalendar,
  faChartLine,
  faBars,
} from '@fortawesome/free-solid-svg-icons';

export interface AdminMenuItem {
  id: string;
  name: string;
  path: string;
  icon: IconDefinition;
  /** 기본값: true = 모든 로그인 사용자에게 표시, false = 관리자만 */
  defaultVisibleToNonAdmin: boolean;
}

/** 관리자 메뉴 정의 (메뉴 관리 페이지에서 순서/노출 설정에 사용) */
export const ADMIN_MENU_ITEMS: AdminMenuItem[] = [
  { id: 'streamers', name: '스트리머 관리', path: '/admin', icon: faUsers, defaultVisibleToNonAdmin: true },
  { id: 'schedule', name: '일정 관리', path: '/admin/schedule', icon: faCalendar, defaultVisibleToNonAdmin: true },
  { id: 'teams', name: '크루 관리', path: '/admin/teams', icon: faUsers, defaultVisibleToNonAdmin: true },
  { id: 'stats', name: '통계', path: '/admin/stats', icon: faChartLine, defaultVisibleToNonAdmin: true },
  { id: 'menus', name: '메뉴 관리', path: '/admin/menus', icon: faBars, defaultVisibleToNonAdmin: false },
];

export type MenuVisibility = Record<string, boolean>;
