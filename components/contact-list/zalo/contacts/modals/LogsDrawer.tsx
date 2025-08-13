"use client";
import React, { useEffect } from 'react';
import { useLogs } from '@/hooks/contact-list/useLogs';

export default function LogsDrawer({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId: number | null; }) {
  const { conversation, messages, fetchConversation, fetchMessages } = useLogs(contactId);
  useEffect(() => { if (open) fetchConversation(); }, [open, fetchConversation]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 flex justify-end z-50">
      <div className="bg-white w-full max-w-xl h-full p-4 overflow-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Logs chi tiết</h3>
          <button onClick={onClose}>×</button>
        </div>
        {conversation ? (
          <div className="mb-3 text-sm text-gray-600">Trạng thái: {conversation.state} • Follow-up: {conversation.followupStage}</div>
        ) : (
          <div className="mb-3 text-sm text-gray-600">Không có hội thoại</div>
        )}
        <div className="space-y-2">
          {messages.map(m => (
            <div key={m.msgId} className="border rounded px-3 py-2">
              <div className="text-xs text-gray-500">{m.role} • {new Date(m.createdAt).toLocaleString()}</div>
              <div>{m.textContent}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
