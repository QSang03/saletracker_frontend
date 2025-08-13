"use client";
import React, { useEffect, useState } from 'react';
import { useContactProfile } from '@/hooks/contact-list/useContactProfile';
import { useCurrentUser } from '@/contexts/CurrentUserContext';

export default function ContactProfileModal({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId: number | null; }) {
  const { profile, fetchProfile, saveProfile } = useContactProfile(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const [form, setForm] = useState({ notes: '', toneHints: '', aovThreshold: '' });

  useEffect(() => { if (open) fetchProfile(); }, [open, fetchProfile]);
  useEffect(() => {
    if (profile) setForm({
      notes: profile.notes || '',
      toneHints: profile.toneHints || '',
      aovThreshold: profile.aovThreshold || '',
    });
  }, [profile]);

  const save = async () => {
    if (zaloDisabled) return;
    await saveProfile({
      notes: form.notes,
      toneHints: form.toneHints,
      aovThreshold: form.aovThreshold === '' ? null : form.aovThreshold,
    } as any);
    onClose();
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Cấu hình khách hàng</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium">Notes</label>
            <textarea disabled={zaloDisabled} className="border rounded w-full px-3 py-2" rows={4} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium">Tone hints</label>
            <textarea disabled={zaloDisabled} className="border rounded w-full px-3 py-2" rows={3} value={form.toneHints} onChange={e => setForm({ ...form, toneHints: e.target.value })} />
          </div>
          <div>
            <label className="block text-sm font-medium">AOV threshold</label>
            <input disabled={zaloDisabled} className="border rounded w-full px-3 py-2" value={form.aovThreshold} onChange={e => setForm({ ...form, aovThreshold: e.target.value })} />
          </div>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Đóng</button>
          <button disabled={zaloDisabled} onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </div>
  );
}
