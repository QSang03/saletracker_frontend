"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import ChatSidebar from './parts/ChatSidebar';
import ChatMainArea from './parts/ChatMainArea';
import ChatInfoPanel from './parts/ChatInfoPanel';
import { Conversation } from '@/types/zalo-chat';
import { getAccessToken } from '@/lib/auth';

export default function ZaloChatLayout() {
  const { user } = useDynamicPermission();
  const userId = useMemo(() => user?.id ? Number(user.id) : null, [user?.id]);
  const [activeConversation, setActiveConversation] = useState<Conversation | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchNavigateData, setSearchNavigateData] = useState<{conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number} | null>(null);
  const hasAutoSelectedRef = React.useRef(false);

  console.log('🏗️ ZaloChatLayout Debug:', { 
    user, 
    userId, 
    userRoles: user?.roles 
  });

  // Auto-select first conversation ONLY on initial load (lần đầu vào trang)
  useEffect(() => {
    if (conversations.length > 0 && !activeConversation && !hasAutoSelectedRef.current) {
      const firstConversation = conversations[0];
      console.log('🎯 Auto-selecting first conversation (initial load):', firstConversation.conversation_name);
      setActiveConversation(firstConversation);
      hasAutoSelectedRef.current = true; // Đánh dấu đã auto-select rồi
    }
  }, [conversations, activeConversation]);

  // Fetch a conversation by ID when it's not present locally (e.g., opened via search)
  const fetchConversationById = useCallback(async (conversationId: number): Promise<Conversation | null> => {
    try {
      const token = getAccessToken();
      if (!token) return null;
      const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/web/conversations/${conversationId}`;
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || 'nkcai',
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!res.ok) return null;
      const json = await res.json();
      return (json?.data || null) as Conversation | null;
    } catch {
      return null;
    }
  }, []);

  // Handle search message click
  const handleSearchMessageClick = (conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number) => {
    console.log('🔍 Search message clicked:', { 
      conversationId, 
      messageId, 
      messagePosition, 
      totalMessagesInConversation,
      availableConversations: conversations.length,
      conversationIds: conversations.map(c => c.id)
    });
    
    // Find the conversation and set it as active
    const foundConversation = conversations.find(c => c.id === conversationId);
    if (foundConversation) {
      console.log('📱 Setting active conversation:', foundConversation.conversation_name);
      setActiveConversation(foundConversation);
      setSearchNavigateData({ conversationId, messageId, messagePosition, totalMessagesInConversation });
      return;
    }

    // Not found locally → fetch from backend to get full metadata
    (async () => {
      const fetched = await fetchConversationById(conversationId);
      if (fetched) {
        setActiveConversation(fetched);
      } else {
        console.error('❌ Conversation not found from API:', conversationId);
      }
      setSearchNavigateData({ conversationId, messageId, messagePosition, totalMessagesInConversation });
    })();
  };

  if (!userId) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-80">
        Vui lòng đăng nhập để sử dụng Zalo Chat
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid overflow-hidden" style={{ gridTemplateColumns: '450px 1fr 0px' }}>
      <div className="border-r border-border overflow-hidden">
        <ChatSidebar 
          userId={userId} 
          activeConversationId={activeConversation?.id ?? null} 
          onSelectConversation={setActiveConversation}
          onConversationsChange={setConversations}
          onSearchMessageClick={handleSearchMessageClick}
        />
      </div>
      <div className="overflow-hidden">
        <ChatMainArea 
          conversation={activeConversation} 
          searchNavigateData={searchNavigateData}
          onSearchNavigateComplete={() => setSearchNavigateData(null)}
        />
      </div>
      <div className="border-l border-border overflow-hidden hidden xl:block" style={{ width: 320 }}>
        <ChatInfoPanel conversation={activeConversation} />
      </div>
    </div>
  );
}




