"use client";

import React, { useMemo } from 'react';
import { useGroupMembers } from '@/hooks/zalo-chat/useGroupMembers';
import { Conversation } from '@/types/zalo-chat';

interface ChatInfoPanelProps {
  conversation: Conversation | null;
}

export default function ChatInfoPanel({ conversation }: ChatInfoPanelProps) {
  const params = useMemo(() => {
    if (!conversation) return null;
    return {
      conversation_id: conversation.id,
      sort_by: 'joined_at' as const,
      sort_order: 'desc' as const,
    };
  }, [conversation]);

  const { members, isLoading, error } = useGroupMembers(params);

  if (!conversation) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-70">
        Thông tin cuộc hội thoại
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="border-b border-border px-4 py-2 text-sm font-medium">
        Thành viên
      </div>
      <div className="flex-1 overflow-auto p-3 space-y-2">
        {isLoading && <div className="text-sm opacity-70">Đang tải...</div>}
        {error && <div className="text-xs text-red-500">{error}</div>}
        {!isLoading && !error && members.map(m => (
          <div key={m.id} className="flex items-center justify-between border-b border-border pb-2">
            <div>
              <div className="text-sm font-medium">{m.display_name}</div>
              <div className="text-xs opacity-70">{m.role}</div>
            </div>
            <div className={`text-xs ${m.is_online ? 'text-green-600' : 'opacity-60'}`}>{m.is_online ? 'Online' : 'Offline'}</div>
          </div>
        ))}
      </div>
    </div>
  );
}


