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
  const [highlightMessageId, setHighlightMessageId] = useState<number | null>(null);
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

  const handleSelectMessage = (message: any, conversation: any) => {
    // First, set the conversation
    setActiveConversation(conversation);
    // Then set the message to highlight
    setHighlightMessageId(message.id);
    
    // Clear the highlight after a delay
    setTimeout(() => {
      setHighlightMessageId(null);
    }, 5000);
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
          onSelectMessage={handleSelectMessage}
        />
      </div>
      <div className="overflow-hidden">
        <ChatMainArea 
          conversation={activeConversation} 
          highlightMessageId={highlightMessageId}
        />
      </div>
      <div className="border-l border-border overflow-hidden hidden xl:block" style={{ width: 320 }}>
        <ChatInfoPanel conversation={activeConversation} />
      </div>
    </div>
  );
}


