'use client';

import { useState, useEffect } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSave, faLock, faGlobe } from '@fortawesome/free-solid-svg-icons';
import { useAdminMenuSettings } from '@/hooks/useAdminMenuSettings';
import { ADMIN_MENU_ITEMS } from '@/lib/adminMenus';

export default function AdminMenusPage() {
  const {
    loading,
    isAdmin,
    adminEmails,
    getVisible,
    setVisibility,
    setAdminEmails,
  } = useAdminMenuSettings();
  const [emailDraft, setEmailDraft] = useState('');

  useEffect(() => {
    if (!loading) setEmailDraft(adminEmails.join(', '));
  }, [loading, adminEmails]);

  const handleSaveEmails = () => {
    const list = emailDraft
      .split(/[\n,]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);
    setAdminEmails(list);
    setEmailDraft(list.join(', '));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-10 w-10 border-2 border-[#001A35] border-t-transparent" />
      </div>
    );
  }

  if (!isAdmin && adminEmails.length > 0) {
    return (
      <div>
        <h1 className="text-3xl font-bold text-[#001A35] mb-6">메뉴 관리</h1>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800">
          <p className="font-medium">이 페이지는 관리자만 접근할 수 있습니다.</p>
          <p className="text-sm mt-1">관리자 이메일 목록에 등록된 계정으로 로그인해 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-3xl font-bold text-[#001A35] mb-6">메뉴 관리</h1>
      <p className="text-gray-600 mb-8">
        각 메뉴를 <strong>모든 로그인 사용자</strong>에게 보이게 할지, <strong>관리자만</strong> 보이게 할지 설정할 수 있습니다.
      </p>

      {/* 관리자 이메일 설정 */}
      <section className="bg-white border-2 border-gray-200 rounded-xl p-6 mb-8">
        <h2 className="text-lg font-bold text-gray-800 mb-3">관리자 지정</h2>
        <p className="text-sm text-gray-500 mb-3">
          아래 목록에 있는 이메일만 관리자로 인식됩니다. 비워 두면 로그인한 모든 사용자가 관리자로 동작합니다.
        </p>
        <textarea
          value={emailDraft}
          onChange={(e) => setEmailDraft(e.target.value)}
          placeholder="admin@example.com, other@example.com"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-3 min-h-[80px]"
          rows={3}
        />
        <button
          type="button"
          onClick={handleSaveEmails}
          className="px-4 py-2 bg-[#001A35] text-white rounded-lg hover:bg-[#002a4a] flex items-center gap-2"
        >
          <FontAwesomeIcon icon={faSave} />
          관리자 목록 저장
        </button>
      </section>

      {/* 메뉴별 노출 설정 */}
      <section className="bg-white border-2 border-gray-200 rounded-xl overflow-hidden">
        <h2 className="text-lg font-bold text-gray-800 p-6 pb-0">메뉴 노출 설정</h2>
        <p className="text-sm text-gray-500 px-6 pt-2 pb-4">
          &quot;관리자만&quot;으로 설정한 메뉴는 관리자가 아닌 로그인 사용자에게는 표시되지 않습니다.
        </p>
        <ul className="divide-y divide-gray-200">
          {ADMIN_MENU_ITEMS.map((item) => {
            const visible = getVisible(item.path);
            return (
              <li
                key={item.path}
                className="flex items-center justify-between px-6 py-4 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <FontAwesomeIcon icon={item.icon} className="w-5 h-5 text-gray-500" />
                  <span className="font-medium text-gray-900">{item.name}</span>
                  <span className="text-sm text-gray-400">{item.path}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">
                    {visible ? '모두 표시' : '관리자만'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setVisibility(item.path, !visible)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      visible
                        ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                        : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                    }`}
                    title={visible ? '클릭 시 관리자만 보이게 변경' : '클릭 시 모두에게 보이게 변경'}
                  >
                    {visible ? (
                      <>
                        <FontAwesomeIcon icon={faGlobe} />
                        모두 표시
                      </>
                    ) : (
                      <>
                        <FontAwesomeIcon icon={faLock} />
                        관리자만
                      </>
                    )}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
