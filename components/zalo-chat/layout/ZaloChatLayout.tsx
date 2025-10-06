"use client";

import React, { useMemo, useState, useEffect } from 'react';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import ChatSidebar from './parts/ChatSidebar';
import ChatMainArea from './parts/ChatMainArea';
import ChatInfoPanel from './parts/ChatInfoPanel';
import { Conversation } from '@/types/zalo-chat';

export default function ZaloChatLayout() {
  const { user } = useDynamicPermission();
  const userId = useMemo(() => user?.id ? Number(user.id) : null, [user?.id]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);

  console.log('🏗️ ZaloChatLayout Debug:', { 
    user, 
    userId, 
    userRoles: user?.roles 
  });

  // Auto-select first conversation when conversations load
  useEffect(() => {
    if (conversations.length > 0 && !activeConversation) {
      const firstConversation = conversations[0];
      console.log('🎯 Auto-selecting first conversation:', firstConversation.conversation_name);
      setActiveConversation(firstConversation);
    }
  }, [conversations, activeConversation]);

  if (!userId) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-80">
        Vui lòng đăng nhập để sử dụng Zalo Chat
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid" style={{ gridTemplateColumns: '380px 1fr 0px' }}>
      <div className="border-r border-border overflow-hidden">
        <ChatSidebar 
          userId={userId} 
          activeConversationId={activeConversation?.id ?? null} 
          onSelectConversation={setActiveConversation}
          onConversationsChange={setConversations}
        />
      </div>
      <div className="overflow-hidden">
        <ChatMainArea conversation={activeConversation} />
      </div>
      <div className="border-l border-border overflow-hidden hidden xl:block" style={{ width: 320 }}>
        <ChatInfoPanel conversation={activeConversation} />
      </div>
    </div>
  );
}


