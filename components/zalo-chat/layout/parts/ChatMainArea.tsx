"use client";

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useContext } from "react";
import { useMessages } from "@/hooks/zalo-chat/useMessages";
import { useGroupMembers } from "@/hooks/zalo-chat/useGroupMembers";
import TextMessage from "@/components/zalo-chat/messages/MessageTypes/TextMessage";
import { Conversation } from "@/types/zalo-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Paperclip, Image, MoreHorizontal, ThumbsUp } from "lucide-react";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { AuthContext } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatMainAreaProps {
  conversation: Conversation | null;
  searchNavigateData?: {conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number} | null;
  onSearchNavigateComplete?: () => void;
}

export default function ChatMainArea({ conversation, searchNavigateData, onSearchNavigateComplete }: ChatMainAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  
  // Get user data
  const { user } = useContext(AuthContext);
  
  // Check permissions
  const { isAdmin, isViewRole } = useDynamicPermission();
  const canSendMessages = !isAdmin && !isViewRole;

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  
  // Message input state
  const [messageText, setMessageText] = useState("");

  // tích lũy theo thời gian tăng dần (cũ -> mới)
  const [acc, setAcc] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // chống auto lazyload khi mở
  const [ready, setReady] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorTooltip, setErrorTooltip] = useState<{ show: boolean; message: string; target: string }>({ show: false, message: '', target: '' });
  const [highlightedMessageId, setHighlightedMessageId] = useState<number | null>(null);
  const [isNavigatingFromSearch, setIsNavigatingFromSearch] = useState(false);
  const [searchNavigatedConversations, setSearchNavigatedConversations] = useState<Set<number>>(new Set());
  const [searchNavigationKey, setSearchNavigationKey] = useState(0);

  // Helper function to format timestamp
  const formatTimestamp = (timestamp: string) => {
    const messageDate = new Date(timestamp);
    const today = new Date();
    const isToday = messageDate.toDateString() === today.toDateString();
    
    if (isToday) {
      return messageDate.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit'
      });
    } else {
      return messageDate.toLocaleString('vi-VN', { 
        day: '2-digit',
        month: '2-digit', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit'
      });
    }
  };

  // Function to scroll to and highlight a message (same as quote click)
  const scrollToMessage = (messageId: number) => {
    console.log('🎯 Attempting to scroll to message:', messageId);
    const messageElement = document.getElementById(`message-${messageId}`);
    console.log('🎯 Message element found:', !!messageElement);
    
    if (messageElement) {
      // Highlight the message
      console.log('🎯 Setting highlight for message:', messageId);
      setHighlightedMessageId(messageId);
      
      // Scroll to the message with smooth behavior
      console.log('🎯 Scrolling to message element');
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        console.log('🎯 Removing highlight after 3 seconds');
        setHighlightedMessageId(null);
      }, 3000);
    } else {
      console.log('❌ Message element not found for ID:', messageId);
    }
  };

  // Handle search navigation - force load correct page
  useEffect(() => {
    console.log('🔍 Search navigation effect triggered:', {
      hasSearchData: !!searchNavigateData,
      hasConversation: !!conversation,
      conversationId: conversation?.id,
      searchConversationId: searchNavigateData?.conversationId,
      isNavigating: isNavigatingFromSearch
    });
    
    if (searchNavigateData && !isNavigatingFromSearch && 
        (conversation?.id === searchNavigateData.conversationId || !conversation)) {
      const { messageId, messagePosition, conversationId } = searchNavigateData;
      
      // Calculate page from message_position 
      // Since API sorts DESC (newest first), we need to calculate from the end
      // message_position is from oldest (1) to newest (total)
      // For DESC sort, page 1 = newest messages, page 2 = older messages, etc.
      const totalMessages = searchNavigateData.totalMessagesInConversation || 1000; // fallback
      const positionFromEnd = totalMessages - messagePosition + 1;
      const calculatedPage = Math.ceil(positionFromEnd / 20);
      
      console.log('🔍 Search navigation - Force loading page:', {
        messageId,
        messagePosition,
        conversationId,
        totalMessages,
        positionFromEnd,
        calculatedPage,
        currentPage: page,
        needPageChange: calculatedPage !== page,
        hasConversation: !!conversation
      });
      
      // Mark that we're navigating from search
      setIsNavigatingFromSearch(true);
      
      // Force reload by incrementing search navigation key
      setSearchNavigationKey(prev => prev + 1);
      
      // Always force reload with the correct page (even if same page, clear data to force reload)
      setPage(calculatedPage);
      // Clear accumulated messages to force reload
      setAcc([]);
      setReady(false);
    }
  }, [searchNavigateData]);

  // Handle scroll to search message after data is loaded
  useEffect(() => {
    if (searchNavigateData && acc.length > 0 && isNavigatingFromSearch && 
        (conversation?.id === searchNavigateData.conversationId || !conversation)) {
      const { messageId } = searchNavigateData;
      
      console.log('🔍 Checking for target message in loaded data:', {
        messageId,
        totalMessages: acc.length,
        messageIds: acc.map(m => m.id),
        fullMessages: acc.map(m => ({ id: m.id, timestamp: m.timestamp, content: m.content }))
      });
      
      // Check if the target message is in the loaded data
      const targetMessage = acc.find(m => m.id === messageId);
      
      if (targetMessage) {
        console.log('✅ Target message found, scrolling to it');
        
        // Wait for DOM to render, then scroll with retry mechanism
        const attemptScroll = (attempts = 0) => {
          if (attempts >= 10) {
            console.log('❌ Failed to scroll after 10 attempts');
            setIsNavigatingFromSearch(false);
            if (onSearchNavigateComplete) {
              onSearchNavigateComplete();
            }
            return;
          }
          
          const messageElement = document.getElementById(`message-${messageId}`);
          if (messageElement) {
            console.log('✅ Message element found, scrolling and highlighting');
            scrollToMessage(messageId);
            // Mark this conversation as search-navigated and reset navigation state
            setSearchNavigatedConversations(prev => new Set([...prev, searchNavigateData.conversationId]));
            setTimeout(() => {
              setIsNavigatingFromSearch(false);
              if (onSearchNavigateComplete) {
                onSearchNavigateComplete();
              }
            }, 1000); // Đợi 1s để đảm bảo scroll hoàn thành
          } else {
            console.log(`⏳ Message element not found, attempt ${attempts + 1}/10`);
            setTimeout(() => attemptScroll(attempts + 1), 100);
          }
        };
        
        // Start scrolling attempts after DOM has time to render
        setTimeout(() => attemptScroll(), 300);
      } else {
        console.log('❌ Target message not found in loaded data');
        // Message not found, reset navigation state
        setIsNavigatingFromSearch(false);
      }
    }
  }, [acc, searchNavigateData, conversation, isNavigatingFromSearch, onSearchNavigateComplete]);

  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Reset navigation state when conversation changes (but keep search-navigated list)
  useEffect(() => {
    setIsNavigatingFromSearch(false);
  }, [conversation?.id]);

  // Additional effect to ensure scroll works when message is highlighted from search
  useEffect(() => {
    if (searchNavigateData && highlightedMessageId === searchNavigateData.messageId && isNavigatingFromSearch &&
        (conversation?.id === searchNavigateData.conversationId || !conversation)) {
      console.log('🎯 Additional scroll attempt for search highlighted message');
      setTimeout(() => {
        const messageElement = document.getElementById(`message-${highlightedMessageId}`);
        if (messageElement) {
          messageElement.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
          });
        }
      }, 100);
    }
  }, [highlightedMessageId, searchNavigateData, isNavigatingFromSearch, conversation?.id]);

  // giữ vị trí khi prepend
  const [isPaging, setIsPaging] = useState(false);
  const prevH = useRef(0);
  const prevTop = useRef(0);

  const params = useMemo(() => {
    // Use conversation from props or create temporary one from searchNavigateData
    const currentConversation = conversation || (searchNavigateData ? {
      id: searchNavigateData.conversationId,
      conversation_name: `Conversation ${searchNavigateData.conversationId}`,
      conversation_type: 'private' as const,
      unread_count: 0,
      total_messages: 0,
      last_message_timestamp: '',
      created_at: '',
      updated_at: '',
      user_id: 0,
      account_username: '',
      account_display_name: '',
      last_message: null,
      participant: null,
      is_group: false,
      is_private: true
    } : null);
    
    if (!currentConversation) return null;
    
    return {
      conversation_id: currentConversation.id,
      page,
      limit: LIMIT,
      sort_by: "timestamp" as const,
      sort_order: "desc" as const, // API trả mới -> cũ
      include_quotes: true,
      search: q || undefined,
      // Add search navigation key to force reload when navigating from search
      _search_nav_key: searchNavigationKey,
    };
  }, [conversation?.id, searchNavigateData?.conversationId, page, q, searchNavigationKey]);

  const { messages: fetched = [], isLoading, error, pagination } = useMessages(params);
  
  // Get group members for group conversations
  const { members: groupMembers = [] } = useGroupMembers(
    conversation?.conversation_type === 'group' ? { conversation_id: conversation.id } : null
  );

  // reset khi đổi hội thoại / tìm kiếm
  useEffect(() => {
    setPage(1);
    setAcc([]);
    setHasMore(true);
    setReady(false);
    setUserScrolled(false); // Reset user scroll state
    setIsPaging(false);
    setHasAutoScrolled(false); // Reset auto-scroll flag
    setErrorTooltip({ show: false, message: '', target: '' }); // Reset error tooltip
    
    // Log để debug
    if (!conversation) {
      console.log('🔄 Conversation cleared, messages should be empty');
    } else {
      console.log('🔄 Conversation changed, resetting states:', conversation?.conversation_name);
    }
  }, [conversation, q]); // Track toàn bộ conversation object, không chỉ id

  // gộp trang + cập nhật hasMore theo total_pages
  useEffect(() => {
    if (!conversation) {
      // Clear messages khi không có conversation
      setAcc([]);
      return;
    }

    const asc = [...fetched].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    setAcc(prev => (page === 1 ? asc : [...asc, ...prev]));

    const currentPage = pagination?.page ?? page;
    const totalPages = pagination?.total_pages;
    const nextHasMore = totalPages !== undefined ? currentPage < totalPages : fetched.length === LIMIT;
    setHasMore(nextHasMore);
    if (!nextHasMore) setIsPaging(false); // hết trang thì tắt spinner

    // giữ vị trí khi prepend
    if (isPaging && page > 1 && scrollRef.current) {
      const el = scrollRef.current;
      const delta = el.scrollHeight - prevH.current;
      el.scrollTop = prevTop.current + delta;
      setIsPaging(false);
    }
  }, [fetched, pagination]); // eslint-disable-line

  // Scroll to bottom immediately when conversation changes
  useLayoutEffect(() => {
    if (!conversation || !scrollRef.current) return;
    
    // Reset states when conversation changes
    setReady(false);
    setUserScrolled(false);
    setHasAutoScrolled(false);
    
    // Only auto scroll to bottom if not navigating from search and conversation hasn't been search-navigated
    const isSearchNavigated = searchNavigatedConversations.has(conversation.id);
    if (!isNavigatingFromSearch && !isSearchNavigated) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      console.log('🔄 Conversation changed, immediate scroll:', conversation.conversation_name);
    } else {
      console.log('🔄 Conversation changed, skipping auto scroll (search navigation or previously navigated)');
    }
  }, [conversation?.id, isNavigatingFromSearch, searchNavigatedConversations]);

  // Scroll to bottom when messages are loaded (chỉ 1 lần khi mới vào)
  useLayoutEffect(() => {
    if (!conversation || !scrollRef.current || acc.length === 0 || isLoading) return;
    
    // Chỉ auto-scroll 1 lần khi mới vào cuộc hội thoại (không khi search navigation)
    const isSearchNavigated = searchNavigatedConversations.has(conversation.id);
    if (!hasAutoScrolled && !isNavigatingFromSearch && !isSearchNavigated) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          setHasAutoScrolled(true);
          setReady(true);
          console.log('📜 Auto-scrolled to bottom for conversation:', conversation.conversation_name, 'with', acc.length, 'messages');
        }
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Nếu đã auto-scroll rồi, chỉ set ready
      setReady(true);
      console.log('📜 Messages loaded, ready state set (no auto-scroll):', conversation.conversation_name, 'with', acc.length, 'messages');
    }
  }, [conversation?.id, acc.length, isLoading, hasAutoScrolled, searchNavigatedConversations]);

  // observer: kéo LÊN chạm đỉnh mới load
  useEffect(() => {
    if (!scrollRef.current || !topRef.current) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (!ready) return;
        if (!hasMore || isLoading || isPaging) return;
        if (isNavigatingFromSearch) return; // Không load more khi đang navigate từ search
        
        // Chỉ load more khi user thực sự scroll lên đầu (không phải auto scroll)
        if (entries[0].isIntersecting && userScrolled) {
          const el = scrollRef.current!;
          prevH.current = el.scrollHeight;
          prevTop.current = el.scrollTop;
          setIsPaging(true);
          setPage(p => p + 1); // tải cũ hơn
          console.log('📜 Loading more messages, page:', page + 1);
        }
      },
      { root: scrollRef.current, rootMargin: "200px 0px 0px 0px" }
    );
    ob.observe(topRef.current);
    return () => ob.disconnect();
  }, [hasMore, isLoading, isPaging, ready, page, userScrolled, isNavigatingFromSearch]);

  const onScroll = () => { if (!userScrolled) setUserScrolled(true); };

  // Handle message sending
  const handleSendMessage = () => {
    if (!messageText.trim() || !conversation || !canSendMessages) return;
    
    // TODO: Implement actual message sending
    console.log('Sending message:', messageText, 'to conversation:', conversation.id);
    
    // For now, just clear the input
    setMessageText("");
  };

  // Handle quick reaction (thumbs up)
  const handleQuickReaction = () => {
    if (!conversation || !canSendMessages) return;
    
    // TODO: Implement quick reaction
    console.log('Sending quick reaction to conversation:', conversation.id);
  };

  if (!conversation) {
    return <div className="h-full w-full flex items-center justify-center text-sm opacity-70">Chọn một cuộc hội thoại để bắt đầu</div>;
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center gap-4">
          {/* Avatar */}
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center">
            {conversation.conversation_type === 'group' ? (
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            ) : (
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <div className="font-semibold text-gray-900 text-lg">
              {conversation.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || conversation.conversation_name}
            </div>
            <div className="text-sm text-gray-500">
              {conversation.conversation_type === 'group' ? 'Nhóm' : 'Cuộc trò chuyện'} 
              {conversation.total_messages && ` • ${conversation.total_messages} tin nhắn`}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors">
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-auto overflow-x-hidden bg-gray-100" onScroll={onScroll}>
        {/* Bố cục: phần TOP cố định ở trên, phần tin nhắn nằm DƯỚI */}
        <div className="min-h-full flex flex-col px-4 py-6">
          {/* TOP: sentinel + banner */}
          <div>
            <div ref={topRef} className="h-1" />
            {isPaging && hasMore && (
              <div className="text-center text-xs text-gray-500 py-4">Đang tải thêm…</div>
            )}
            {!hasMore && acc.length > 0 && (
              <div className="text-center text-xs text-gray-400 py-4">Hết lịch sử</div>
            )}
            {error && <div className="text-xs text-red-500 text-center py-4">{error}</div>}
          </div>

          {/* đẩy phần tin nhắn xuống đáy */}
          <div className="mt-auto space-y-4">
            {acc.map(m => {
              // Ẩn tin nhắn hệ thống không cần thiết
              if (m.content_type === 'SYSTEM' && m.content?.includes('undo_message')) {
                return null;
              }
              
              // Kiểm tra nếu là tin nhắn file, ảnh không có text, contact card, hoặc birthday greeting
              let isFileMessage = false;
              let isImageWithoutText = false;
              let isContactCard = false;
              let isBirthdayGreeting = false;
              if (typeof m.content === 'string' && m.content.startsWith('{')) {
                try {
                  const parsed = JSON.parse(m.content);
                  if (parsed.fileName || parsed.fileUrl) {
                    isFileMessage = true;
                  } else if (parsed.imageUrl && !parsed.caption && !parsed.title && !parsed.text) {
                    isImageWithoutText = true;
                  } else if (parsed.contactName && parsed.contactId) {
                    isContactCard = true;
                  } else if (parsed.title && parsed.href && parsed.action === 'show.profile') {
                    isBirthdayGreeting = true;
                  }
                } catch {
                  // Ignore parsing errors
                }
              }
              
              // Handle SYSTEM messages with msginfo.actionlist - display in center like Zalo
              if (m.content_type === 'SYSTEM' && typeof m.content === 'string' && m.content.trim().startsWith('{')) {
                try {
                  const parsed = JSON.parse(m.content);
                  const actionType = parsed.systemAction || parsed.action || parsed.actionData?.actionType;
                  if (actionType === 'msginfo.actionlist') {
                    // Get avatar of the person mentioned at the beginning of the sentence
                    let avatarUrl: string | undefined;
                    try {
                      const rawMessage: string = parsed.message || '';
                      let targetName = '';
                      
                      // Handle different message patterns
                      if (rawMessage.includes(' được ')) {
                        // Pattern: "Name được action"
                        const parts = rawMessage.split(' được ');
                        if (parts.length >= 2) {
                          targetName = parts[0].trim();
                        }
                      } else if (rawMessage.includes(' đã ')) {
                        // Pattern: "Name đã action"
                        const parts = rawMessage.split(' đã ');
                        if (parts.length >= 2) {
                          targetName = parts[0].trim();
                        }
                      } else if (rawMessage.includes(' thêm ')) {
                        // Pattern: "Name thêm action"
                        const parts = rawMessage.split(' thêm ');
                        if (parts.length >= 2) {
                          targetName = parts[0].trim();
                        }
                      }
                      
                      if (targetName) {
                        // Try multiple matching strategies
                        const member = groupMembers.find(mb => {
                          const displayName = mb.contact?.display_name?.replace(/"/g, '') || '';
                          return displayName === targetName || 
                                 displayName.includes(targetName) ||
                                 targetName.includes(displayName);
                        });
                        const url = member?.contact?.info_metadata?.avatar as string | undefined;
                        if (url) avatarUrl = url.replace(/"/g, '');
                      }
                    } catch {}
                    
                    return (
                      <div key={m.id} id={`message-${m.id}`} className={`flex flex-col items-center my-2 ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                        <div className={`bg-white rounded-3xl px-4 py-3 shadow-sm border max-w-[80%] ${highlightedMessageId === m.id ? 'border-blue-400' : 'border-gray-200'}`}>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt="user" className="w-full h-full object-cover" />
                              ) : (
                                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                            <span className="text-sm text-gray-700">{parsed.message || '📝 Thông báo hệ thống'}</span>
                          </div>
                        </div>
                        {/* Thời gian */}
                        <div className="text-xs text-gray-400 mt-1">
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>
                    );
                  }
                } catch {}
              }

              // Tin nhắn nhận (bên trái)
              if (!m.is_outgoing) {
                // Tìm avatar từ group members nếu là nhóm
                const getSenderAvatar = () => {
                  if (conversation?.conversation_type === 'group' && groupMembers.length > 0) {
                    const member = groupMembers.find(member => 
                      member.contact?.zalo_contact_id === m.sender?.zalo_id ||
                      member.contact?.display_name === m.sender?.name ||
                      member.contact?.display_name === m.sender_name
                    );
                    return member?.contact?.info_metadata?.avatar;
                  }
                  return conversation?.participant?.avatar;
                };

                const senderAvatar = getSenderAvatar();
                const senderName = m.sender?.name || m.sender_name || 'Unknown User';

                // Xử lý contact card riêng (không có khung bong bóng)
                if (isContactCard) {
                  let parsed;
                  try {
                    parsed = JSON.parse(m.content);
                  } catch {
                    parsed = {};
                  }

                  return (
                    <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-start mb-2 ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                      {/* Avatar bên trái */}
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                        {senderAvatar ? (
                          <img 
                            src={senderAvatar.replace(/"/g, '')} 
                            alt={senderName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {/* Tên người gửi */}
                        <div className="text-xs text-gray-500 mb-1 px-1">
                          {senderName}
                        </div>
                        
                        {/* Contact Card */}
                        <div className="bg-white rounded shadow-md overflow-hidden w-[300px]">
                          <div className="bg-blue-500 px-5 pt-6 pb-12 relative">
                            <div className="flex items-start gap-3">
                              <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0">
                                {parsed.contactAvatar ? (
                                  <img 
                                    src={parsed.contactAvatar} 
                                    alt={parsed.contactName}
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <svg className="w-full h-full text-gray-400 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="font-semibold text-white text-base truncate mb-0.5">{parsed.contactName}</div>
                                <div className="text-xs text-white/90 truncate">{parsed.contactId}</div>
                              </div>
                            </div>
                            {parsed.qrCodeUrl && (
                              <div className="absolute bottom-2 right-2">
                                <div className="bg-white p-1 rounded">
                                  <img 
                                    src={parsed.qrCodeUrl} 
                                    alt="QR Code"
                                    className="w-16 h-16 object-contain"
                                  />
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex">
                            <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                              Gọi Điện
                            </button>
                            <div className="w-px bg-gray-200"></div>
                            <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                              Nhắn Tin
                            </button>
                          </div>
                        </div>

                        {/* Thời gian */}
                        <div className="text-xs text-gray-400 mt-1 text-left px-1">
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Xử lý birthday greeting riêng (không có khung bong bóng)
                if (isBirthdayGreeting) {
                  let parsed;
                  try {
                    parsed = JSON.parse(m.content);
                  } catch {
                    parsed = {};
                  }

                  return (
                    <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-start mb-2 ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                      {/* Avatar bên trái */}
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                        {senderAvatar ? (
                          <img 
                            src={senderAvatar.replace(/"/g, '')} 
                            alt={senderName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>

                      <div className="flex flex-col">
                        {/* Tên người gửi */}
                        <div className="text-xs text-gray-500 mb-1 px-1">
                          {senderName}
                        </div>
                        
                        {/* Birthday Greeting Card */}
                        <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[300px]">
                          <div className="relative">
                            <img 
                              src={parsed.href} 
                              alt={parsed.title}
                              className="w-full h-auto object-cover"
                              style={{ maxHeight: '200px' }}
                            />
                          </div>
                          
                          <div className="p-4">
                            <div className="font-semibold text-gray-900 text-sm mb-2">
                              {parsed.title}
                            </div>
                            {parsed.description && (
                              <div className="text-xs text-gray-600">
                                {parsed.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Thời gian */}
                        <div className="text-xs text-gray-400 mt-1 text-left px-1">
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                }

                // Nếu là tin nhắn file hoặc ảnh không có text, hiển thị không có khung bong bóng
                if (isFileMessage || isImageWithoutText) {
                  const getFileIcon = (extension: string) => {
                    switch (extension?.toLowerCase()) {
                      case 'xlsx':
                      case 'xls':
                        return (
                          <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">X</span>
                          </div>
                        );
                      case 'docx':
                      case 'doc':
                        return (
                          <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">W</span>
                          </div>
                        );
                      case 'pdf':
                        return (
                          <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">P</span>
                          </div>
                        );
                      case 'ppt':
                      case 'pptx':
                        return (
                          <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center">
                            <span className="text-white font-bold text-lg">P</span>
                          </div>
                        );
                      default:
                        return (
                          <div className="w-12 h-12 bg-gray-500 rounded flex items-center justify-center">
                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                          </div>
                        );
                    }
                  };

                  const formatFileSize = (bytes: number) => {
                    if (bytes === 0) return '0 Bytes';
                    const k = 1024;
                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                  };

                  let parsed;
                  try {
                    parsed = JSON.parse(m.content);
                  } catch {
                    parsed = {};
                  }

                  // Nếu là ảnh không có text
                  if (isImageWithoutText) {
                    return (
                      <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-start ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                        {/* Avatar bên trái */}
                        <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                          {senderAvatar ? (
                            <img 
                              src={senderAvatar.replace(/"/g, '')} 
                              alt={senderName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>

                        <div className="max-w-[70%] break-words">
                          {/* Tên người gửi */}
                          <div className="text-xs text-gray-500 mb-1 px-1">
                            {senderName}
                          </div>
                        
                          {/* Ảnh - không có khung bong bóng */}
                          <img 
                            src={parsed.imageUrl} 
                            alt={parsed.title || 'Image'} 
                            className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                            style={{ maxHeight: '300px', objectFit: 'cover' }}
                            onClick={() => setSelectedImage(parsed.imageUrl)}
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                              if (placeholder) placeholder.style.display = 'flex';
                            }}
                          />
                          {/* Placeholder hiển thị khi ảnh lỗi */}
                          <div 
                            className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
                            style={{ width: '470px', height: '250px', display: 'none' }}
                          >
                            <div className="flex flex-col items-center justify-center h-full">
                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                              </svg>
                              <span className="text-sm">Image</span>
                            </div>
                          </div>
                          
                          {/* Thời gian */}
                          <div className="text-xs text-gray-400 mt-1 text-left">
                            {formatTimestamp(m.timestamp)}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-start ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                      {/* Avatar bên trái */}
                      <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                        {senderAvatar ? (
                          <img 
                            src={senderAvatar.replace(/"/g, '')} 
                            alt={senderName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>

                      <div className="max-w-[70%] break-words">
                        {/* Tên người gửi */}
                        <div className="text-xs text-gray-500 mb-1 px-1">
                          {senderName}
                        </div>
                      
                        {/* Nội dung file - không có khung bong bóng */}
                        <div className="w-full max-w-sm">
                          <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                            {getFileIcon(parsed.fileExtension)}
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm text-gray-900 truncate">
                                {parsed.fileName || 'Unknown file'}
                              </div>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-500">
                                  {parsed.fileSize ? formatFileSize(parsed.fileSize) : 'Unknown size'}
                                </span>
                                <div className="flex items-center gap-1">
                                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                  <span className="text-xs text-green-600">Đã có trên máy</span>
                                </div>
                              </div>
                              {parsed.description && (
                                <div className="text-xs text-gray-600 mt-1">
                                  {parsed.description}
                                </div>
                              )}
                            </div>
                            <div className="flex flex-col gap-1">
                              <Tooltip open={errorTooltip.show && errorTooltip.target === `open-${m.id}`}>
                                <TooltipTrigger asChild>
                                  <button 
                                    className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                    onClick={async () => {
                                      if (parsed.fileUrl) {
                                        try {
                                          // Thử fetch file trước để kiểm tra quyền truy cập
                                          const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                          if (!response.ok) {
                                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                          }
                                          
                                          window.open(parsed.fileUrl, '_blank');
                                          setErrorTooltip({ show: false, message: '', target: '' });
                                        } catch (error) {
                                          console.error('Error opening file:', error);
                                          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                          setErrorTooltip({ 
                                            show: true, 
                                            message: `Không thể mở file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                            target: `open-${m.id}` 
                                          });
                                          setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                        }
                                      }
                                    }}
                                  >
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                    </svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{errorTooltip.show && errorTooltip.target === `open-${m.id}` ? errorTooltip.message : 'Mở file'}</p>
                                </TooltipContent>
                              </Tooltip>
                              <Tooltip open={errorTooltip.show && errorTooltip.target === `download-${m.id}`}>
                                <TooltipTrigger asChild>
                                  <button 
                                    className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                    onClick={async () => {
                                      if (parsed.fileUrl) {
                                        try {
                                          // Thử fetch file trước để kiểm tra quyền truy cập
                                          const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                          if (!response.ok) {
                                            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                          }
                                          
                                          // Nếu OK thì tạo link download
                                          const link = document.createElement('a');
                                          link.href = parsed.fileUrl;
                                          link.download = parsed.fileName || 'download';
                                          link.target = '_blank';
                                          document.body.appendChild(link);
                                          link.click();
                                          document.body.removeChild(link);
                                          setErrorTooltip({ show: false, message: '', target: '' });
                                        } catch (error) {
                                          console.error('Error downloading file:', error);
                                          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                          setErrorTooltip({ 
                                            show: true, 
                                            message: `Không thể tải file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                            target: `download-${m.id}` 
                                          });
                                          setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                        }
                                      }
                                    }}
                                  >
                                    <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                  </button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{errorTooltip.show && errorTooltip.target === `download-${m.id}` ? errorTooltip.message : 'Tải xuống'}</p>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                          </div>
                        </div>
                        
                        {/* Thời gian */}
                        <div className="text-xs text-gray-400 mt-1 text-left">
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-start ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                    {/* Avatar bên trái */}
                    <div className="w-12 h-12 rounded-full bg-gray-300 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                      {senderAvatar ? (
                        <img 
                          src={senderAvatar.replace(/"/g, '')} 
                          alt={senderName}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-7 h-7 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>

                    <div className="max-w-[70%] break-words">
                      {/* Tên người gửi */}
                      <div className="text-xs text-gray-500 mb-1 px-1">
                        {senderName}
                      </div>
                    
                      {/* Bubble tin nhắn */}
                      <div className={`px-4 py-2 rounded-2xl bg-white text-gray-900 rounded-bl-md shadow-sm ${highlightedMessageId === m.id ? 'border-2 border-blue-400' : ''}`}>
                        <div className="text-sm leading-relaxed break-words">
                          {(() => {
                            // Xử lý nội dung tin nhắn
                            if (m.content_type === 'SYSTEM') {
                              if (typeof m.content === 'string' && m.content.trim().startsWith('{')) {
                                try {
                                  const parsed = JSON.parse(m.content);
                                  const actionType = parsed.systemAction || parsed.action || parsed.actionData?.actionType;
                                  if (actionType === 'msginfo.actionlist') {
                                    // Lấy avatar của người được nhắc tới ở đầu câu nếu tìm thấy trong groupMembers
                                    let avatarUrl: string | undefined;
                                    try {
                                      const rawMessage: string = parsed.message || '';
                                      const parts = rawMessage.split(' được ');
                                      if (parts.length >= 2) {
                                        const targetName = parts[0].trim();
                                        const member = groupMembers.find(mb => mb.contact?.display_name?.replace(/"/g, '') === targetName);
                                        const url = member?.contact?.info_metadata?.avatar as string | undefined;
                                        if (url) avatarUrl = url.replace(/"/g, '');
                                      }
                                    } catch {}
                                    return (
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center flex-shrink-0">
                                          {avatarUrl ? (
                                            <img src={avatarUrl} alt="user" className="w-full h-full object-cover" />
                                          ) : (
                                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                          )}
                                        </div>
                                        <span className="text-gray-800">{parsed.message || '📝 Thông báo hệ thống'}</span>
                                      </div>
                                    );
                                  }
                                  return parsed.message || '📝 Tin nhắn hệ thống';
                                } catch {
                                  return '📝 Tin nhắn hệ thống';
                                }
                              }
                              return String(m.content || '📝 Tin nhắn hệ thống');
                            }
                            
                            // Xử lý tất cả loại content có JSON (TEXT, IMAGE, FILE, etc.)
                            if (typeof m.content === 'string' && m.content.startsWith('{')) {
                              try {
                                const parsed = JSON.parse(m.content);
                                
                                // Xử lý action undo_message
                                if (parsed.action === 'undo_message') {
                                  return (
                                    <div className="text-xs text-gray-500 italic">
                                      📝 Tin nhắn đã được thu hồi
                                    </div>
                                  );
                                }
                                
                                // Xử lý tin nhắn TEXT
                                if (parsed.text) {
                                  const textContent = String(parsed.text);
                                  // Hỗ trợ xuống dòng với \n
                                  return (
                                    <div>
                                      {/* Hiển thị quoted message nếu có */}
                                      {m.quoted_message && (
                                        <div 
                                          className="mb-2 pl-3 border-l-4 border-blue-400 bg-gray-100/50 rounded py-2 px-3 cursor-pointer hover:bg-gray-200/50 transition-colors"
                                          onClick={() => scrollToMessage(m.quoted_message.id)}
                                        >
                                          <div className="text-xs font-bold text-gray-900 mb-1">
                                            {m.quoted_message.sender_name || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                            {(() => {
                                              // Render quoted content based on content_type
                                              if (m.quoted_message.content_type === 'TEXT' && m.quote_text) {
                                                return String(m.quote_text);
                                              } else if (m.quoted_message.content_type === 'IMAGE') {
                                                try {
                                                  // Thử lấy thumbnail từ quote.attach trước
                                                  let thumbnailUrl = null;
                                                  if (m.metadata?.raw_websocket_data?.quote?.attach) {
                                                    const attachData = JSON.parse(m.metadata.raw_websocket_data.quote.attach);
                                                    thumbnailUrl = attachData.thumbUrl || attachData.thumb;
                                                  }
                                                  
                                                  // Nếu không có, thử từ quoted_message.content
                                                  if (!thumbnailUrl) {
                                                    const parsed = JSON.parse(m.quoted_message.content);
                                                    thumbnailUrl = parsed.thumbnailUrl || parsed.imageUrl;
                                                  }
                                                  
                                                  return (
                                                    <div className="flex items-center gap-2">
                                                      {thumbnailUrl ? (
                                                        <img 
                                                          src={thumbnailUrl} 
                                                          alt="Quoted image" 
                                                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                                                          onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                          }}
                                                        />
                                                      ) : null}
                                                      <div className={`w-6 h-6 bg-gray-300 rounded flex items-center justify-center flex-shrink-0 ${thumbnailUrl ? 'hidden' : ''}`}>
                                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                      </div>
                                                      <span>Ảnh</span>
                                                    </div>
                                                  );
                                                } catch {
                                                  return '📷 Ảnh';
                                                }
                                              } else if (m.quoted_message.content_type === 'FILE') {
                                                try {
                                                  const parsed = JSON.parse(m.quoted_message.content);
                                                  return `📄 ${parsed.fileName || 'File'}`;
                                                } catch {
                                                  return '📄 File';
                                                }
                                              }
                                              return m.quote_text ? String(m.quote_text) : 'Tin nhắn';
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                      {/* Tin nhắn chính */}
                                      <span style={{ whiteSpace: 'pre-wrap' }}>
                                        {textContent}
                                      </span>
                                    </div>
                                  );
                                }
                                
                                // Xử lý tin nhắn LINK (link preview)
                                if (parsed.href || parsed.url) {
                                  return (
                                    <a 
                                      href={String(parsed.href || parsed.url)}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors max-w-[350px]"
                                    >
                                      {parsed.thumb && (
                                        <img 
                                          src={String(parsed.thumb)}
                                          alt={String(parsed.title || 'Link')}
                                          className="w-full h-32 object-cover"
                                        />
                                      )}
                                      <div className="p-3">
                                        {parsed.title && (
                                          <div className="font-medium text-sm text-gray-900 mb-1">
                                            {String(parsed.title)}
                                          </div>
                                        )}
                                        {parsed.description && (
                                          <div className="text-xs text-gray-600 line-clamp-2">
                                            {String(parsed.description)}
                                          </div>
                                        )}
                                      </div>
                                    </a>
                                  );
                                }
                                
                                // Xử lý tin nhắn IMAGE
                                if (parsed.imageUrl) {
                                  const hasText = parsed.caption || parsed.title || parsed.text;
                                  const isImageWithoutText = !hasText;
                                  
                                  if (isImageWithoutText) {
                                    return (
                                      <div className="w-full">
                                        {/* Hiển thị quoted message nếu có */}
                                        {m.quoted_message && m.quote_text && (
                                          <div 
                                          className="mb-2 pl-3 border-l-4 border-blue-400 bg-gray-100/50 rounded py-2 px-3 cursor-pointer hover:bg-gray-200/50 transition-colors"
                                          onClick={() => scrollToMessage(m.quoted_message.id)}
                                        >
                                            <div className="text-xs font-bold text-gray-900 mb-1">
                                              {m.quoted_message.sender_name || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                              {String(m.quote_text)}
                                            </div>
                                          </div>
                                        )}
                                        <img 
                                          src={parsed.imageUrl} 
                                          alt={parsed.title || 'Image'} 
                                          className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                          style={{ maxHeight: '300px', objectFit: 'cover' }}
                                          onClick={() => setSelectedImage(parsed.imageUrl)}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (placeholder) placeholder.style.display = 'block';
                                          }}
                                        />
                                        <div 
                                          className="bg-gray-200 flex items-center justify-center text-gray-500"
                                          style={{ 
                                            width: '470px', 
                                            height: '250px',
                                            display: 'none'
                                          }}
                                        >
                                          <div className="flex flex-col items-center justify-center h-full">
                                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm">Image</span>
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div className="w-full">
                                        {/* Hiển thị quoted message nếu có */}
                                        {m.quoted_message && m.quote_text && (
                                          <div 
                                          className="mb-2 pl-3 border-l-4 border-blue-400 bg-gray-100/50 rounded py-2 px-3 cursor-pointer hover:bg-gray-200/50 transition-colors"
                                          onClick={() => scrollToMessage(m.quoted_message.id)}
                                        >
                                            <div className="text-xs font-bold text-gray-900 mb-1">
                                              {m.quoted_message.sender_name || 'Unknown'}
                                            </div>
                                            <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                              {String(m.quote_text)}
                                            </div>
                                          </div>
                                        )}
                                        <div className="relative">
                                          <img 
                                            src={parsed.imageUrl} 
                                            alt={parsed.title || 'Image'} 
                                            className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                            style={{ maxHeight: '300px', objectFit: 'cover' }}
                                            onClick={() => setSelectedImage(parsed.imageUrl)}
                                            onError={(e) => {
                                              e.currentTarget.style.display = 'none';
                                              const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                              if (placeholder) placeholder.style.display = 'block';
                                            }}
                                          />
                                          <div 
                                          className="bg-gray-200 flex items-center justify-center text-gray-500"
                                          style={{ 
                                            width: '470px', 
                                            height: '250px',
                                            display: 'none'
                                          }}
                                          >
                                            <div className="flex flex-col items-center justify-center h-full">
                                              <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                              </svg>
                                              <span className="text-sm">Image</span>
                                            </div>
                                          </div>
                                        </div>
                                        {parsed.caption && (
                                          <div className="mt-2 text-sm text-gray-700 break-words" style={{ maxWidth: '470px' }}>
                                            {parsed.caption}
                                          </div>
                                        )}
                                        {parsed.title && (
                                          <div className="mt-1 text-sm font-medium text-gray-900 break-words" style={{ maxWidth: '470px' }}>
                                            {parsed.title}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  }
                                }
                                
                                // Xử lý tin nhắn STICKER
                                if (parsed.stickerId && parsed.stickerUrl) {
                                  return (
                                    <div className="inline-block">
                                      <img 
                                        src={parsed.stickerUrl} 
                                        alt={parsed.description || 'Sticker'} 
                                        className="w-24 h-24 object-contain cursor-pointer hover:scale-110 transition-transform"
                                        title={parsed.description || 'Sticker'}
                                      />
                                    </div>
                                  );
                                }
                                
                                // Xử lý tin nhắn BIRTHDAY GREETING (chúc mừng sinh nhật)
                                if (parsed.title && parsed.href && parsed.action === 'show.profile') {
                                  return (
                                    <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[300px]">
                                      {/* Birthday Image */}
                                      <div className="relative">
                                        <img 
                                          src={parsed.href} 
                                          alt={parsed.title}
                                          className="w-full h-auto object-cover"
                                          style={{ maxHeight: '200px' }}
                                        />
                                      </div>
                                      
                                      {/* Content */}
                                      <div className="p-4">
                                        <div className="font-semibold text-gray-900 text-sm mb-2">
                                          {parsed.title}
                                        </div>
                                        {parsed.description && (
                                          <div className="text-xs text-gray-600">
                                            {parsed.description}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Xử lý tin nhắn CONTACT (danh thiếp)
                                if (parsed.contactName && parsed.contactId) {
                                  return (
                                    <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-[300px]">
                                      {/* Header với background xanh */}
                                      <div className="bg-blue-500 px-5 pt-6 pb-8 relative">
                                        <div className="flex items-start gap-3">
                                          <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0">
                                            {parsed.contactAvatar ? (
                                              <img 
                                                src={parsed.contactAvatar} 
                                                alt={parsed.contactName}
                                                className="w-full h-full object-cover"
                                              />
                                            ) : (
                                              <svg className="w-full h-full text-gray-400 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                              </svg>
                                            )}
                                          </div>
                                          <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-white text-base truncate mb-0.5">{parsed.contactName}</div>
                                            <div className="text-xs text-white/90 truncate">{parsed.contactId}</div>
                                          </div>
                                        </div>
                                        {/* QR Code positioned in bottom right of blue area */}
                                        {parsed.qrCodeUrl && (
                                          <div className="absolute bottom-2 right-2">
                                            <div className="bg-white p-1 rounded">
                                              <img 
                                                src={parsed.qrCodeUrl} 
                                                alt="QR Code"
                                                className="w-16 h-16 object-contain"
                                              />
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                      
                                      {/* Buttons */}
                                      <div className="flex">
                                        <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                                          Gọi Điện
                                        </button>
                                        <div className="w-px bg-gray-200"></div>
                                        <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                                          Nhắn Tin
                                        </button>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                // Xử lý tin nhắn FILE
                                if (parsed.fileName || parsed.fileUrl) {
                                  const getFileIcon = (extension: string) => {
                                    switch (extension?.toLowerCase()) {
                                      case 'xlsx':
                                      case 'xls':
                                        return (
                                          <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">X</span>
                                          </div>
                                        );
                                      case 'docx':
                                      case 'doc':
                                        return (
                                          <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">W</span>
                                          </div>
                                        );
                                      case 'pdf':
                                        return (
                                          <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">P</span>
                                          </div>
                                        );
                                      case 'ppt':
                                      case 'pptx':
                                        return (
                                          <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center">
                                            <span className="text-white font-bold text-lg">P</span>
                                          </div>
                                        );
                                      default:
                                        return (
                                          <div className="w-12 h-12 bg-gray-500 rounded flex items-center justify-center">
                                            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                          </div>
                                        );
                                    }
                                  };

                                  const formatFileSize = (bytes: number) => {
                                    if (bytes === 0) return '0 Bytes';
                                    const k = 1024;
                                    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                    const i = Math.floor(Math.log(bytes) / Math.log(k));
                                    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                                  };

                                  return (
                                    <div className="w-full max-w-sm">
                                      {/* Hiển thị quoted message nếu có */}
                                      {m.quoted_message && (
                                        <div 
                                          className="mb-2 pl-3 border-l-4 border-blue-400 bg-gray-100/50 rounded py-2 px-3 cursor-pointer hover:bg-gray-200/50 transition-colors"
                                          onClick={() => scrollToMessage(m.quoted_message.id)}
                                        >
                                          <div className="text-xs font-bold text-gray-900 mb-1">
                                            {m.quoted_message.sender_name || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                            {(() => {
                                              // Render quoted content based on content_type
                                              if (m.quoted_message.content_type === 'TEXT' && m.quote_text) {
                                                return String(m.quote_text);
                                              } else if (m.quoted_message.content_type === 'IMAGE') {
                                                try {
                                                  // Thử lấy thumbnail từ quote.attach trước
                                                  let thumbnailUrl = null;
                                                  if (m.metadata?.raw_websocket_data?.quote?.attach) {
                                                    const attachData = JSON.parse(m.metadata.raw_websocket_data.quote.attach);
                                                    thumbnailUrl = attachData.thumbUrl || attachData.thumb;
                                                  }
                                                  
                                                  // Nếu không có, thử từ quoted_message.content
                                                  if (!thumbnailUrl) {
                                                    const parsed = JSON.parse(m.quoted_message.content);
                                                    thumbnailUrl = parsed.thumbnailUrl || parsed.imageUrl;
                                                  }
                                                  
                                                  return (
                                                    <div className="flex items-center gap-2">
                                                      {thumbnailUrl ? (
                                                        <img 
                                                          src={thumbnailUrl} 
                                                          alt="Quoted image" 
                                                          className="w-6 h-6 rounded object-cover flex-shrink-0"
                                                          onError={(e) => {
                                                            e.currentTarget.style.display = 'none';
                                                            e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                          }}
                                                        />
                                                      ) : null}
                                                      <div className={`w-6 h-6 bg-gray-300 rounded flex items-center justify-center flex-shrink-0 ${thumbnailUrl ? 'hidden' : ''}`}>
                                                        <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                      </div>
                                                      <span>Ảnh</span>
                                                    </div>
                                                  );
                                                } catch {
                                                  return '📷 Ảnh';
                                                }
                                              } else if (m.quoted_message.content_type === 'FILE') {
                                                try {
                                                  const parsed = JSON.parse(m.quoted_message.content);
                                                  return `📄 ${parsed.fileName || 'File'}`;
                                                } catch {
                                                  return '📄 File';
                                                }
                                              }
                                              return m.quote_text ? String(m.quote_text) : 'Tin nhắn';
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                      <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                                        {getFileIcon(parsed.fileExtension)}
                                        <div className="flex-1 min-w-0">
                                          <div className="font-medium text-sm text-gray-900 truncate">
                                            {parsed.fileName || 'Unknown file'}
                                          </div>
                                          <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-gray-500">
                                              {parsed.fileSize ? formatFileSize(parsed.fileSize) : 'Unknown size'}
                                            </span>
                                            <div className="flex items-center gap-1">
                                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                              <span className="text-xs text-green-600">Đã có trên máy</span>
                                            </div>
                                          </div>
                                          {parsed.description && (
                                            <div className="text-xs text-gray-600 mt-1">
                                              {parsed.description}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col gap-1">
                                          <Tooltip open={errorTooltip.show && errorTooltip.target === `open-${m.id}`}>
                                            <TooltipTrigger asChild>
                                              <button 
                                                className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                                onClick={async () => {
                                                  if (parsed.fileUrl) {
                                                    try {
                                                      // Thử fetch file trước để kiểm tra quyền truy cập
                                                      const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                                      if (!response.ok) {
                                                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                                      }
                                                      
                                                      window.open(parsed.fileUrl, '_blank');
                                                      setErrorTooltip({ show: false, message: '', target: '' });
                                                    } catch (error) {
                                                      console.error('Error opening file:', error);
                                                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                                      setErrorTooltip({ 
                                                        show: true, 
                                                        message: `Không thể mở file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                                        target: `open-${m.id}` 
                                                      });
                                                      setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                                    }
                                                  }
                                                }}
                                              >
                                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                                </svg>
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{errorTooltip.show && errorTooltip.target === `open-${m.id}` ? errorTooltip.message : 'Mở file'}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                          <Tooltip open={errorTooltip.show && errorTooltip.target === `download-${m.id}`}>
                                            <TooltipTrigger asChild>
                                              <button 
                                                className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                                onClick={async () => {
                                                  if (parsed.fileUrl) {
                                                    try {
                                                      const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                                      if (!response.ok) {
                                                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                                      }
                                                      
                                                      const link = document.createElement('a');
                                                      link.href = parsed.fileUrl;
                                                      link.download = parsed.fileName || 'download';
                                                      link.target = '_blank';
                                                      document.body.appendChild(link);
                                                      link.click();
                                                      document.body.removeChild(link);
                                                      setErrorTooltip({ show: false, message: '', target: '' });
                                                    } catch (error) {
                                                      console.error('Error downloading file:', error);
                                                      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                                      setErrorTooltip({ 
                                                        show: true, 
                                                        message: `Không thể tải file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                                        target: `download-${m.id}` 
                                                      });
                                                      setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                                    }
                                                  }
                                                }}
                                              >
                                                <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                </svg>
                                              </button>
                                            </TooltipTrigger>
                                            <TooltipContent>
                                              <p>{errorTooltip.show && errorTooltip.target === `download-${m.id}` ? errorTooltip.message : 'Tải xuống'}</p>
                                            </TooltipContent>
                                          </Tooltip>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                }
                                
                                if (parsed.action) return `🔧 ${String(parsed.action)}`;
                                
                                // Nếu không match với bất kỳ loại nào, hiển thị text từ object
                                const extractedText = String(
                                  parsed?.text ||
                                  parsed?.title ||
                                  parsed?.description ||
                                  parsed?.message ||
                                  ''
                                );
                                
                                if (extractedText) {
                                  return extractedText;
                                }
                                
                                // Nếu không extract được gì, hiển thị raw JSON
                                return (
                                  <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                                    <pre className="whitespace-pre-wrap">
                                      {JSON.stringify(parsed, null, 2)}
                                    </pre>
                                  </div>
                                );

                              } catch (error) {
                                // Nếu không parse được JSON, hiển thị raw content
                                return String(m.content || '');
                              }
                            }
                            
                            // Xử lý content không phải JSON
                            if (typeof m.content === 'string') {
                              return String(m.content || '');
                            }
                            
                            // Nếu content là object, extract text fields safely
                            if (typeof m.content === 'object' && m.content !== null) {
                              try {
                                const content = m.content as any;
                                const extractedText = String(
                                  content?.text || 
                                  content?.title || 
                                  content?.description || 
                                  content?.message ||
                                  JSON.stringify(content)
                                );
                                return extractedText;
                              } catch (err) {
                                return '[Không thể hiển thị nội dung]';
                              }
                            }
                            
                            // Fallback cuối cùng - hiển thị raw JSON để debug
                            if (typeof m.content === 'string' && m.content.trim()) {
                              return (
                                <div className="text-xs text-gray-600 bg-yellow-100 p-2 rounded border">
                                  <div className="font-semibold mb-1">🔍 DEBUG - Raw Content:</div>
                                  <pre className="whitespace-pre-wrap text-xs">
                                    {String(m.content)}
                                  </pre>
                                  <div className="mt-1 text-xs text-gray-500">
                                    Type: {String(m.content_type)} | ID: {String(m.id)}
                                  </div>
                                </div>
                              );
                            }
                            
                            return (
                              <div className="text-xs text-gray-600 bg-red-100 p-2 rounded border">
                                <div className="font-semibold mb-1">❌ DEBUG - Empty Content:</div>
                                <div className="text-xs text-gray-500">
                                  Type: {String(m.content_type)} | ID: {String(m.id)} | Content: "{String(m.content)}"
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                      
                      {/* Thời gian */}
                      <div className="text-xs text-gray-400 mt-1 text-left">
                        {formatTimestamp(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              }

              // Tin nhắn gửi (bên phải)
              // Xử lý contact card riêng (không có khung bong bóng)
              if (isContactCard) {
                let parsed;
                try {
                  parsed = JSON.parse(m.content);
                } catch {
                  parsed = {};
                }

                return (
                  <div key={m.id} id={`message-${m.id}`} className={`flex items-end gap-2 justify-end mb-2 ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                    <div className="flex flex-col items-end">
                      {/* Contact Card */}
                      <div className="bg-white rounded-lg shadow-md overflow-hidden w-[300px]">
                        <div className="bg-blue-500 px-5 pt-6 pb-12 relative">
                          <div className="flex items-start gap-3">
                            <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0">
                              {parsed.contactAvatar ? (
                                <img 
                                  src={parsed.contactAvatar} 
                                  alt={parsed.contactName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <svg className="w-full h-full text-gray-400 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-semibold text-white text-base truncate mb-0.5">{parsed.contactName}</div>
                              <div className="text-xs text-white/90 truncate">{parsed.contactId}</div>
                            </div>
                          </div>
                          {parsed.qrCodeUrl && (
                            <div className="absolute bottom-2 right-2">
                              <div className="bg-white p-1 rounded">
                                <img 
                                  src={parsed.qrCodeUrl} 
                                  alt="QR Code"
                                  className="w-16 h-16 object-contain"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex">
                          <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                            Gọi Điện
                          </button>
                          <div className="w-px bg-gray-200"></div>
                          <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                            Nhắn Tin
                          </button>
                        </div>
                      </div>

                      {/* Thời gian */}
                      <div className="text-xs text-gray-400 mt-1 text-right px-1">
                        {formatTimestamp(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              }

              // Xử lý birthday greeting riêng (không có khung bong bóng)
              if (isBirthdayGreeting) {
                let parsed;
                try {
                  parsed = JSON.parse(m.content);
                } catch {
                  parsed = {};
                }

                return (
                  <div key={m.id} id={`message-${m.id}`} className={`flex items-end gap-2 justify-end mb-2 ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                    <div className="flex flex-col items-end">
                      {/* Birthday Greeting Card */}
                      <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[300px]">
                        <div className="relative">
                          <img 
                            src={parsed.href} 
                            alt={parsed.title}
                            className="w-full h-auto object-cover"
                            style={{ maxHeight: '200px' }}
                          />
                        </div>
                        
                        <div className="p-4">
                          <div className="font-semibold text-gray-900 text-sm mb-2">
                            {parsed.title}
                          </div>
                          {parsed.description && (
                            <div className="text-xs text-gray-600">
                              {parsed.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Thời gian */}
                      <div className="text-xs text-gray-400 mt-1 text-right px-1">
                        {formatTimestamp(m.timestamp)}
                      </div>
                    </div>
                  </div>
                );
              }

              // Nếu là tin nhắn file hoặc ảnh không có text, hiển thị không có khung bong bóng
              if (isFileMessage || isImageWithoutText) {
                const getFileIcon = (extension: string) => {
                  switch (extension?.toLowerCase()) {
                    case 'xlsx':
                    case 'xls':
                      return (
                        <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-lg">X</span>
                        </div>
                      );
                    case 'docx':
                    case 'doc':
                      return (
                        <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-lg">W</span>
                        </div>
                      );
                    case 'pdf':
                      return (
                        <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-lg">P</span>
                        </div>
                      );
                    case 'ppt':
                    case 'pptx':
                      return (
                        <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center">
                          <span className="text-white font-bold text-lg">P</span>
                        </div>
                      );
                    default:
                      return (
                        <div className="w-12 h-12 bg-gray-500 rounded flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      );
                  }
                };

                const formatFileSize = (bytes: number) => {
                  if (bytes === 0) return '0 Bytes';
                  const k = 1024;
                  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                };

                let parsed;
                try {
                  parsed = JSON.parse(m.content);
                } catch {
                  parsed = {};
                }

                // Nếu là ảnh không có text
                if (isImageWithoutText) {
                  return (
                    <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-end ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                      <div className="max-w-[70%] break-words">
                        {/* Ảnh - không có khung bong bóng */}
                        <img 
                          src={parsed.imageUrl} 
                          alt={parsed.title || 'Image'} 
                          className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                          style={{ maxHeight: '300px', objectFit: 'cover' }}
                          onClick={() => setSelectedImage(parsed.imageUrl)}
                          onError={(e) => {
                            e.currentTarget.style.display = 'none';
                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                            if (placeholder) placeholder.style.display = 'flex';
                          }}
                        />
                        {/* Placeholder hiển thị khi ảnh lỗi */}
                        <div 
                          className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
                          style={{ width: '470px', height: '250px', display: 'none' }}
                        >
                          <div className="flex flex-col items-center justify-center h-full">
                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
                            </svg>
                            <span className="text-sm">Image</span>
                          </div>
                        </div>
                        
                        {/* Thời gian */}
                        <div className="text-xs text-gray-400 mt-1 text-right">
                          {formatTimestamp(m.timestamp)}
                        </div>
                      </div>

                      {/* Avatar bên phải */}
                      <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                        {user?.avatarZalo ? (
                          <img 
                            src={user.avatarZalo} 
                            alt={user.username || 'User'}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        )}
                      </div>
                    </div>
                  );
                }

                return (
                  <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-end ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                    <div className="max-w-[70%] break-words">
                      {/* Nội dung file - không có khung bong bóng */}
                      <div className="w-full max-w-sm">
                        <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                          {getFileIcon(parsed.fileExtension)}
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm text-gray-900 truncate">
                              {parsed.fileName || 'Unknown file'}
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs text-gray-500">
                                {parsed.fileSize ? formatFileSize(parsed.fileSize) : 'Unknown size'}
                              </span>
                              <div className="flex items-center gap-1">
                                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                <span className="text-xs text-green-600">Đã có trên máy</span>
                              </div>
                            </div>
                            {parsed.description && (
                              <div className="text-xs text-gray-600 mt-1">
                                {parsed.description}
                              </div>
                            )}
                          </div>
                          <div className="flex flex-col gap-1">
                            <Tooltip open={errorTooltip.show && errorTooltip.target === `open-out-${m.id}`}>
                              <TooltipTrigger asChild>
                                <button 
                                  className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                  onClick={async () => {
                                    if (parsed.fileUrl) {
                                      try {
                                        // Thử fetch file trước để kiểm tra quyền truy cập
                                        const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                        if (!response.ok) {
                                          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                        }
                                        
                                        window.open(parsed.fileUrl, '_blank');
                                        setErrorTooltip({ show: false, message: '', target: '' });
                                      } catch (error) {
                                        console.error('Error opening file:', error);
                                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                        setErrorTooltip({ 
                                          show: true, 
                                          message: `Không thể mở file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                          target: `open-out-${m.id}` 
                                        });
                                        setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                      }
                                    }
                                  }}
                                >
                                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                  </svg>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{errorTooltip.show && errorTooltip.target === `open-out-${m.id}` ? errorTooltip.message : 'Mở file'}</p>
                              </TooltipContent>
                            </Tooltip>
                            <Tooltip open={errorTooltip.show && errorTooltip.target === `download-out-${m.id}`}>
                              <TooltipTrigger asChild>
                                <button 
                                  className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100"
                                  onClick={async () => {
                                    if (parsed.fileUrl) {
                                      try {
                                        // Thử fetch file trước để kiểm tra quyền truy cập
                                        const response = await fetch(parsed.fileUrl, { method: 'HEAD' });
                                        if (!response.ok) {
                                          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                                        }
                                        
                                        // Nếu OK thì tạo link download
                                        const link = document.createElement('a');
                                        link.href = parsed.fileUrl;
                                        link.download = parsed.fileName || 'download';
                                        link.target = '_blank';
                                        document.body.appendChild(link);
                                        link.click();
                                        document.body.removeChild(link);
                                        setErrorTooltip({ show: false, message: '', target: '' });
                                      } catch (error) {
                                        console.error('Error downloading file:', error);
                                        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                                        setErrorTooltip({ 
                                          show: true, 
                                          message: `Không thể tải file: ${errorMessage}. File có thể đã hết hạn hoặc không có quyền truy cập.`, 
                                          target: `download-out-${m.id}` 
                                        });
                                        setTimeout(() => setErrorTooltip({ show: false, message: '', target: '' }), 5000);
                                      }
                                    }
                                  }}
                                >
                                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                  </svg>
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>{errorTooltip.show && errorTooltip.target === `download-out-${m.id}` ? errorTooltip.message : 'Tải xuống'}</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </div>
                      </div>
                      
                      {/* Thời gian */}
                      <div className="text-xs text-gray-400 mt-1 text-right">
                        {formatTimestamp(m.timestamp)}
                      </div>
                    </div>

                    {/* Avatar bên phải */}
                    <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                      {user?.avatarZalo ? (
                        <img 
                          src={user.avatarZalo} 
                          alt={user.username || 'User'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div key={m.id} id={`message-${m.id}`} className={`flex items-start gap-2 justify-end ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}>
                  <div className="max-w-[70%] break-words">
                    {/* Bubble tin nhắn */}
                    <div className={`px-4 py-2 rounded-2xl bg-blue-50 text-gray-800 rounded-br-md shadow-sm ${highlightedMessageId === m.id ? 'border-2 border-blue-400' : ''}`}>
                      <div className="text-sm leading-relaxed break-words">
                        {(() => {
                          // Xử lý nội dung tin nhắn
                          if (m.content_type === 'SYSTEM') {
                            if (typeof m.content === 'string' && m.content.trim().startsWith('{')) {
                              try {
                                const parsed = JSON.parse(m.content);
                                const actionType = parsed.systemAction || parsed.action || parsed.actionData?.actionType;
                                if (actionType === 'msginfo.actionlist') {
                                  // Outgoing bubble: hiển thị message trắng trên nền xanh
                                  return (
                                    <div className="text-white">
                                      {parsed.message || '📝 Thông báo hệ thống'}
                                    </div>
                                  );
                                }
                                return parsed.message || '📝 Tin nhắn hệ thống';
                              } catch {
                                return '📝 Tin nhắn hệ thống';
                              }
                            }
                            return String(m.content || '📝 Tin nhắn hệ thống');
                          }
                          
                          // Xử lý tất cả loại content có JSON (TEXT, IMAGE, FILE, etc.)
                          if (typeof m.content === 'string' && m.content.startsWith('{')) {
                            try {
                              const parsed = JSON.parse(m.content);
                              
                              // Xử lý action undo_message
                              if (parsed.action === 'undo_message') {
                                return (
                                  <div className="text-xs text-gray-500 italic">
                                    📝 Tin nhắn đã được thu hồi
                                  </div>
                                );
                              }
                              
                              // Xử lý tin nhắn TEXT
                              if (parsed.text) {
                                const textContent = String(parsed.text);
                                // Hỗ trợ xuống dòng với \n
                                return (
                                  <div>
                                    {/* Hiển thị quoted message nếu có */}
                                    {m.quoted_message && (
                                      <div 
                                        className="mb-2 pl-3 border-l-4 border-blue-400 bg-blue-200/40 rounded py-2 px-3 cursor-pointer hover:bg-blue-300/50 transition-colors"
                                        onClick={() => scrollToMessage(m.quoted_message.id)}
                                      >
                                        <div className="text-xs font-bold text-gray-900 mb-1">
                                          {m.quoted_message.sender_name || 'Unknown'}
                                        </div>
                                        <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                          {(() => {
                                            // Render quoted content based on content_type
                                            if (m.quoted_message.content_type === 'TEXT' && m.quote_text) {
                                              return String(m.quote_text);
                                            } else if (m.quoted_message.content_type === 'IMAGE') {
                                              try {
                                                // Thử lấy thumbnail từ quote.attach trước
                                                let thumbnailUrl = null;
                                                if (m.metadata?.raw_websocket_data?.quote?.attach) {
                                                  const attachData = JSON.parse(m.metadata.raw_websocket_data.quote.attach);
                                                  thumbnailUrl = attachData.thumbUrl || attachData.thumb;
                                                }
                                                
                                                // Nếu không có, thử từ quoted_message.content
                                                if (!thumbnailUrl) {
                                                  const parsed = JSON.parse(m.quoted_message.content);
                                                  thumbnailUrl = parsed.thumbnailUrl || parsed.imageUrl;
                                                }
                                                
                                                return (
                                                  <div className="flex items-center gap-2">
                                                    {thumbnailUrl ? (
                                                      <img 
                                                        src={thumbnailUrl} 
                                                        alt="Quoted image" 
                                                        className="w-6 h-6 rounded object-cover flex-shrink-0"
                                                        onError={(e) => {
                                                          e.currentTarget.style.display = 'none';
                                                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                                                        }}
                                                      />
                                                    ) : null}
                                                    <div className={`w-6 h-6 bg-gray-300 rounded flex items-center justify-center flex-shrink-0 ${thumbnailUrl ? 'hidden' : ''}`}>
                                                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                      </svg>
                                                    </div>
                                                    <span>Ảnh</span>
                                                  </div>
                                                );
                                              } catch {
                                                return '📷 Ảnh';
                                              }
                                            } else if (m.quoted_message.content_type === 'FILE') {
                                              try {
                                                const parsed = JSON.parse(m.quoted_message.content);
                                                return `📄 ${parsed.fileName || 'File'}`;
                                              } catch {
                                                return '📄 File';
                                              }
                                            }
                                            return m.quote_text ? String(m.quote_text) : 'Tin nhắn';
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                    {/* Tin nhắn chính */}
                                    <span style={{ whiteSpace: 'pre-wrap' }}>
                                      {textContent}
                                    </span>
                                  </div>
                                );
                              }
                              
                              // Xử lý tin nhắn LINK (link preview)
                              if (parsed.href || parsed.url) {
                                return (
                                  <a 
                                    href={String(parsed.href || parsed.url)}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="block bg-white border border-gray-200 rounded-lg overflow-hidden hover:bg-gray-50 transition-colors max-w-[350px]"
                                  >
                                    {parsed.thumb && (
                                      <img 
                                        src={String(parsed.thumb)}
                                        alt={String(parsed.title || 'Link')}
                                        className="w-full h-32 object-cover"
                                      />
                                    )}
                                    <div className="p-3">
                                      {parsed.title && (
                                        <div className="font-medium text-sm text-gray-900 mb-1">
                                          {String(parsed.title)}
                                        </div>
                                      )}
                                      {parsed.description && (
                                        <div className="text-xs text-gray-600 line-clamp-2">
                                          {String(parsed.description)}
                                        </div>
                                      )}
                                    </div>
                                  </a>
                                );
                              }
                              
                                // Xử lý tin nhắn IMAGE
                              if (parsed.imageUrl) {
                                const hasText = parsed.caption || parsed.title || parsed.text;
                                const isImageWithoutText = !hasText;
                                
                                if (isImageWithoutText) {
                                  return (
                                    <div className="w-full">
                                      {/* Hiển thị quoted message nếu có */}
                                      {m.quoted_message && m.quote_text && (
                                        <div 
                                        className="mb-2 pl-3 border-l-4 border-blue-400 bg-blue-200/40 rounded py-2 px-3 cursor-pointer hover:bg-blue-300/50 transition-colors"
                                        onClick={() => scrollToMessage(m.quoted_message.id)}
                                      >
                                          <div className="text-xs font-bold text-gray-900 mb-1">
                                            {m.quoted_message.sender_name || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                            {String(m.quote_text)}
                                          </div>
                                        </div>
                                      )}
                                      <img 
                                        src={parsed.imageUrl} 
                                        alt={parsed.title || 'Image'} 
                                        className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                        style={{ maxHeight: '300px', objectFit: 'cover' }}
                                        onClick={() => setSelectedImage(parsed.imageUrl)}
                                        onError={(e) => {
                                          e.currentTarget.style.display = 'none';
                                          const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                          if (placeholder) placeholder.style.display = 'block';
                                        }}
                                      />
                                      <div 
                                        className="bg-gray-200 flex items-center justify-center text-gray-500"
                                        style={{ 
                                          width: '100%', 
                                          height: '200px',
                                          display: 'none'
                                        }}
                                      >
                                        <div className="flex flex-col items-center justify-center h-full">
                                          <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                          </svg>
                                          <span className="text-sm">Image</span>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="w-full">
                                      {/* Hiển thị quoted message nếu có */}
                                      {m.quoted_message && m.quote_text && (
                                        <div 
                                        className="mb-2 pl-3 border-l-4 border-blue-400 bg-blue-200/40 rounded py-2 px-3 cursor-pointer hover:bg-blue-300/50 transition-colors"
                                        onClick={() => scrollToMessage(m.quoted_message.id)}
                                      >
                                          <div className="text-xs font-bold text-gray-900 mb-1">
                                            {m.quoted_message.sender_name || 'Unknown'}
                                          </div>
                                          <div className="text-xs text-gray-600 line-clamp-3" style={{ whiteSpace: 'pre-wrap' }}>
                                            {String(m.quote_text)}
                                          </div>
                                        </div>
                                      )}
                                      <div className="relative">
                                        <img 
                                          src={parsed.imageUrl} 
                                          alt={parsed.title || 'Image'} 
                                          className="w-full h-auto block rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                                          style={{ maxHeight: '300px', objectFit: 'cover' }}
                                          onClick={() => setSelectedImage(parsed.imageUrl)}
                                          onError={(e) => {
                                            e.currentTarget.style.display = 'none';
                                            const placeholder = e.currentTarget.nextElementSibling as HTMLElement;
                                            if (placeholder) placeholder.style.display = 'block';
                                          }}
                                        />
                                        <div 
                                          className="bg-gray-200 flex items-center justify-center text-gray-500"
                                          style={{ 
                                            width: '100%', 
                                            height: '200px',
                                            display: 'none'
                                          }}
                                        >
                                          <div className="flex flex-col items-center justify-center h-full">
                                            <svg className="w-12 h-12 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                            </svg>
                                            <span className="text-sm">Image</span>
                                          </div>
                                        </div>
                                      </div>
                                      {parsed.caption && (
                                        <div className="mt-2 text-sm text-gray-700 break-words" style={{ maxWidth: '470px' }}>
                                          {parsed.caption}
                                        </div>
                                      )}
                                      {parsed.title && (
                                        <div className="mt-1 text-sm font-medium text-gray-900 break-words" style={{ maxWidth: '470px' }}>
                                          {parsed.title}
                                        </div>
                                      )}
                                    </div>
                                  );
                                }
                              }
                              
                              // Xử lý tin nhắn STICKER
                              if (parsed.stickerId && parsed.stickerUrl) {
                                return (
                                  <div className="inline-block">
                                    <img 
                                      src={parsed.stickerUrl} 
                                      alt={parsed.description || 'Sticker'} 
                                      className="w-24 h-24 object-contain cursor-pointer hover:scale-110 transition-transform"
                                      title={parsed.description || 'Sticker'}
                                    />
                                  </div>
                                );
                              }
                              
                              // Xử lý tin nhắn BIRTHDAY GREETING (chúc mừng sinh nhật)
                              if (parsed.title && parsed.href && parsed.action === 'show.profile') {
                                return (
                                  <div className="bg-white rounded-lg shadow-md overflow-hidden max-w-[300px]">
                                    {/* Birthday Image */}
                                    <div className="relative">
                                      <img 
                                        src={parsed.href} 
                                        alt={parsed.title}
                                        className="w-full h-auto object-cover"
                                        style={{ maxHeight: '200px' }}
                                      />
                                    </div>
                                    
                                    {/* Content */}
                                    <div className="p-4">
                                      <div className="font-semibold text-gray-900 text-sm mb-2">
                                        {parsed.title}
                                      </div>
                                      {parsed.description && (
                                        <div className="text-xs text-gray-600">
                                          {parsed.description}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Xử lý tin nhắn CONTACT (danh thiếp)
                              if (parsed.contactName && parsed.contactId) {
                                return (
                                  <div className="bg-white rounded-2xl shadow-lg overflow-hidden w-[300px]">
                                    {/* Header với background xanh */}
                                    <div className="bg-blue-500 px-5 pt-6 pb-8 relative">
                                      <div className="flex items-start gap-3">
                                        <div className="w-14 h-14 rounded-full overflow-hidden bg-white border-2 border-white flex-shrink-0">
                                          {parsed.contactAvatar ? (
                                            <img 
                                              src={parsed.contactAvatar} 
                                              alt={parsed.contactName}
                                              className="w-full h-full object-cover"
                                            />
                                          ) : (
                                            <svg className="w-full h-full text-gray-400 p-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                            </svg>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <div className="font-semibold text-white text-base truncate mb-0.5">{parsed.contactName}</div>
                                          <div className="text-xs text-white/90 truncate">{parsed.contactId}</div>
                                        </div>
                                      </div>
                                      {/* QR Code positioned in bottom right of blue area */}
                                      {parsed.qrCodeUrl && (
                                        <div className="absolute bottom-2 right-2">
                                          <div className="bg-white p-1 rounded">
                                            <img 
                                              src={parsed.qrCodeUrl} 
                                              alt="QR Code"
                                              className="w-16 h-16 object-contain"
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    
                                    {/* Buttons */}
                                    <div className="flex">
                                      <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                                        Gọi Điện
                                      </button>
                                      <div className="w-px bg-gray-200"></div>
                                      <button className="flex-1 py-3 text-sm font-medium text-blue-600 hover:bg-gray-50 transition-colors">
                                        Nhắn Tin
                                      </button>
                                    </div>
                                  </div>
                                );
                              }
                              
                              if (parsed.action) return `🔧 ${String(parsed.action)}`;
                              
                              // Xử lý tin nhắn file
                              if (parsed.fileName || parsed.fileUrl) {
                                const getFileIcon = (extension: string) => {
                                  switch (extension?.toLowerCase()) {
                                    case 'xlsx':
                                    case 'xls':
                                      return (
                                        <div className="w-12 h-12 bg-green-500 rounded flex items-center justify-center">
                                          <span className="text-white font-bold text-lg">X</span>
                                        </div>
                                      );
                                    case 'docx':
                                    case 'doc':
                                      return (
                                        <div className="w-12 h-12 bg-blue-500 rounded flex items-center justify-center">
                                          <span className="text-white font-bold text-lg">W</span>
                                        </div>
                                      );
                                    case 'pdf':
                                      return (
                                        <div className="w-12 h-12 bg-red-500 rounded flex items-center justify-center">
                                          <span className="text-white font-bold text-lg">P</span>
                                        </div>
                                      );
                                    case 'ppt':
                                    case 'pptx':
                                      return (
                                        <div className="w-12 h-12 bg-orange-500 rounded flex items-center justify-center">
                                          <span className="text-white font-bold text-lg">P</span>
                                        </div>
                                      );
                                    default:
                                      return (
                                        <div className="w-12 h-12 bg-gray-500 rounded flex items-center justify-center">
                                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        </div>
                                      );
                                  }
                                };

                                const formatFileSize = (bytes: number) => {
                                  if (bytes === 0) return '0 Bytes';
                                  const k = 1024;
                                  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
                                  const i = Math.floor(Math.log(bytes) / Math.log(k));
                                  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
                                };

                                return (
                                  <div className="w-full max-w-sm">
                                    <div className="flex items-start gap-3 p-3 bg-white rounded-xl">
                                      {getFileIcon(parsed.fileExtension)}
                                      <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm text-gray-900 truncate">
                                          {parsed.fileName || 'Unknown file'}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                          <span className="text-xs text-gray-500">
                                            {parsed.fileSize ? formatFileSize(parsed.fileSize) : 'Unknown size'}
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                            <span className="text-xs text-green-600">Đã có trên máy</span>
                                          </div>
                                        </div>
                                        {parsed.description && (
                                          <div className="text-xs text-gray-600 mt-1">
                                            {parsed.description}
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col gap-1">
                                        <button className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100">
                                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v2H8V5z" />
                                          </svg>
                                        </button>
                                        <button className="w-6 h-6 border border-gray-300 rounded flex items-center justify-center hover:bg-gray-100">
                                          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                          </svg>
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                              
                              // Nếu không match với bất kỳ loại nào, hiển thị text từ object
                              const extractedText = String(
                                parsed?.text ||
                                parsed?.title ||
                                parsed?.description ||
                                parsed?.message ||
                                ''
                              );
                              
                              if (extractedText) {
                                return extractedText;
                              }
                              
                              // Nếu không extract được gì, hiển thị raw JSON
                              return (
                                <div className="text-xs text-gray-600 bg-gray-100 p-2 rounded">
                                  <pre className="whitespace-pre-wrap">
                                    {JSON.stringify(parsed, null, 2)}
                                  </pre>
                                </div>
                              );
                            } catch (error) {
                              // Nếu không parse được JSON, hiển thị raw content
                              return String(m.content || '');
                            }
                          }
                          
                          // Xử lý content không phải JSON
                          if (typeof m.content === 'string') {
                            return String(m.content);
                          }
                          
                          // Nếu content là object, extract text fields safely
                          if (typeof m.content === 'object' && m.content !== null) {
                            try {
                              const content = m.content as any;
                              const extractedText = String(
                                content?.text || 
                                content?.title || 
                                content?.description || 
                                content?.message ||
                                JSON.stringify(content)
                              );
                              return extractedText;
                            } catch (err) {
                              return '[Không thể hiển thị nội dung]';
                            }
                          }
                          
                          // Fallback cuối cùng - hiển thị raw JSON để debug
                          if (typeof m.content === 'string' && m.content.trim()) {
                            return (
                              <div className="text-xs text-gray-600 bg-yellow-100 p-2 rounded border">
                                <div className="font-semibold mb-1">🔍 DEBUG - Raw Content:</div>
                                <pre className="whitespace-pre-wrap text-xs">
                                  {String(m.content)}
                                </pre>
                                <div className="mt-1 text-xs text-gray-500">
                                  Type: {String(m.content_type)} | ID: {String(m.id)}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="text-xs text-gray-600 bg-red-100 p-2 rounded border">
                              <div className="font-semibold mb-1">❌ DEBUG - Empty Content:</div>
                              <div className="text-xs text-gray-500">
                                Type: {String(m.content_type)} | ID: {String(m.id)} | Content: "{String(m.content)}"
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    </div>
                    
                    {/* Thời gian */}
                    <div className="text-xs text-gray-400 mt-1 text-right">
                      {formatTimestamp(m.timestamp)}
                    </div>
                  </div>

                  {/* Avatar bên phải */}
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                    {user?.avatarZalo ? (
                      <img 
                        src={user.avatarZalo} 
                        alt={user.username || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && page === 1 && (
              <div className="text-center text-sm text-gray-500 py-8">Đang tải...</div>
            )}
          </div>
        </div>
      </div>

      {/* Message Input Area */}
      <div className="border-t border-gray-200 px-6 py-4 bg-white">
        <div className={`flex items-center gap-3 ${!canSendMessages ? 'opacity-50' : ''}`}>
          {/* Emoji Button */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={!canSendMessages}
            onClick={() => canSendMessages && console.log('Open emoji picker')}
          >
            <Smile className="h-5 w-5 text-gray-500" />
          </button>

          {/* Text Input */}
          <div className="flex-1 relative">
            <input
              value={messageText}
              onChange={(e) => canSendMessages && setMessageText(e.target.value)}
              placeholder={canSendMessages ? `Nhập @, tin nhắn tới ${(conversation.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || conversation.conversation_name)}` : 'Không thể gửi tin nhắn'}
              disabled={!canSendMessages}
              className="w-full px-4 py-3 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-gray-50 text-sm"
              onKeyDown={(e) => {
                if (canSendMessages && e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
          </div>

          {/* Attachment Buttons */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={!canSendMessages}
            onClick={() => canSendMessages && console.log('Attach image')}
          >
            <Image className="h-5 w-5 text-gray-500" />
          </button>

          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={!canSendMessages}
            onClick={() => canSendMessages && console.log('Attach file')}
          >
            <Paperclip className="h-5 w-5 text-gray-500" />
          </button>

          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={!canSendMessages}
            onClick={() => canSendMessages && console.log('More options')}
          >
            <MoreHorizontal className="h-5 w-5 text-gray-500" />
          </button>

          {/* Quick Reaction / Send Button */}
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            disabled={!canSendMessages}
            onClick={() => canSendMessages && (messageText.trim() ? handleSendMessage() : handleQuickReaction())}
          >
            <ThumbsUp className="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Modal hiển thị ảnh to */}
      {selectedImage && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50"
          onClick={() => setSelectedImage(null)}
        >
          <div className="relative max-w-4xl max-h-full p-4">
            <img 
              src={selectedImage} 
              alt="Full size" 
              className="max-w-full max-h-full object-contain rounded-lg"
            />
            <button 
              className="absolute top-4 right-4 bg-black bg-opacity-50 text-white rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-colors cursor-pointer"
              onClick={() => setSelectedImage(null)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
