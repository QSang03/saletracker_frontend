"use client";
import React, { useEffect, useMemo, useState } from 'react';
import { useKeywordRoutes } from '@/hooks/contact-list/useKeywordRoutes';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

export default function ContactKeywordsModal({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId: number; }) {
  const { routes, fetchRoutes, updateRoute } = useKeywordRoutes(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({});

  useEffect(() => { if (open) fetchRoutes(); }, [open, fetchRoutes]);
  useEffect(() => {
    const m: Record<number, boolean> = {};
    routes.forEach(r => { if (r.contactId === contactId) m[r.routeId] = r.active; });
    setActiveMap(m);
  }, [routes, contactId]);

  const toggle = (routeId: number) => {
    setActiveMap(prev => ({ ...prev, [routeId]: !prev[routeId] }));
  };

  const save = async () => {
    if (zaloDisabled) return;
    const entries = Object.entries(activeMap);
    for (const [rid, active] of entries) {
      await updateRoute(Number(rid), { active });
    }
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Keywords áp dụng</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="space-y-2 max-h-96 overflow-auto">
          {routes.map(r => (
            <div key={r.routeId} className="flex items-center justify-between border rounded px-3 py-2">
              <div>
                <div className="font-medium">{r.keyword}</div>
                <div className="text-xs text-gray-500">{r.contactId === null ? 'GLOBAL' : `Contact #${r.contactId}`}</div>
              </div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  disabled={r.contactId === null || zaloDisabled}
                  checked={r.contactId === null ? r.active : !!activeMap[r.routeId]}
                  onChange={() => toggle(r.routeId)}
                />
                Active
              </label>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Đóng</button>
          <button disabled={zaloDisabled} onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </div>
  );
}
