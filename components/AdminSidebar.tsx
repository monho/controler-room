'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useVisibleAdminMenus } from '@/hooks/useAdminMenuSettings';

export default function AdminSidebar() {
  const pathname = usePathname();
  const { loading, visibleItems } = useVisibleAdminMenus();

  if (loading) {
    return (
      <aside className="w-64 bg-white border-r-2 border-gray-200 min-h-screen">
        <div className="p-6">
          <h2 className="text-xl font-bold text-[#001A35] mb-6">관리 메뉴</h2>
          <div className="animate-pulse space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 bg-gray-200 rounded-lg" />
            ))}
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-64 bg-white border-r-2 border-gray-200 min-h-screen">
      <div className="p-6">
        <h2 className="text-xl font-bold text-[#001A35] mb-6">관리 메뉴</h2>
        <nav className="space-y-2">
          {visibleItems.map((item) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={item.path}
                href={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                  isActive
                    ? 'bg-[#001A35] text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                <span className="font-medium">{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
