"use client";

import React, { useMemo, useState, useEffect, useCallback } from 'react';
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
  
  // Enhanced setActiveConversation that also adds to conversations list if not present
  const setActiveConversationWithList = useCallback((conversation: Conversation | null) => {
    setActiveConversation(conversation);
    
    // If conversation is not null and not already in conversations list, add it
    if (conversation && !conversations.find(c => c.id === conversation.id)) {
      console.log('➕ Adding conversation to local list:', conversation.conversation_name);
      setConversations(prev => [conversation, ...prev]);
    }
  }, [conversations]);
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
      setActiveConversationWithList(firstConversation);
      hasAutoSelectedRef.current = true; // Đánh dấu đã auto-select rồi
    }
  }, [conversations, activeConversation, setActiveConversationWithList]);


  // Handle search message click
  const handleSearchMessageClick = (conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number) => {
    console.log('🔍 Search message clicked:', { 
      conversationId, 
      messageId, 
      messagePosition, 
      totalMessagesInConversation
    });
    
    // Always create a temporary conversation object and set it as active
    // The actual conversation data will be loaded via messages API
    const tempConversation: Conversation = {
      id: conversationId,
      conversation_name: `Conversation ${conversationId}`,
      conversation_type: 'private',
      unread_count: 0,
      total_messages: totalMessagesInConversation || 0,
      last_message_timestamp: new Date().toISOString(),
      last_message: undefined,
      participant: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 0,
      account_username: '',
      account_display_name: '',
      is_group: false,
      is_private: true,
      zalo_conversation_id: `temp_${conversationId}`
    };
    
    console.log('📱 Setting temporary conversation:', tempConversation.conversation_name);
    setActiveConversationWithList(tempConversation);
    setSearchNavigateData({ conversationId, messageId, messagePosition, totalMessagesInConversation });
  };

  if (!userId) {
    return (
      <div className="h-full w-full flex items-center justify-center text-sm opacity-80">
        Đang triển khai giao diện Zalo NKC...
      </div>
    );
  }

  return (
    <div className="h-screen w-screen grid overflow-hidden" style={{ gridTemplateColumns: '450px 1fr 0px' }}>
      <div className="border-r border-border overflow-hidden">
        <ChatSidebar 
          userId={userId} 
          activeConversationId={activeConversation?.id ?? null} 
          onSelectConversation={setActiveConversationWithList}
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




