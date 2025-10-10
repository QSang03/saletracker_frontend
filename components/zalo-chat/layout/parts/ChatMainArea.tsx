"use client";

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect, useContext } from "react";
import { useMessages } from "@/hooks/zalo-chat/useMessages";
import { useGroupMembers } from "@/hooks/zalo-chat/useGroupMembers";
import { useSendMessage } from "@/hooks/zalo-chat/useSendMessage";
import TextMessage from "@/components/zalo-chat/messages/MessageTypes/TextMessage";
import { Conversation } from "@/types/zalo-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Smile, Paperclip, Image, MoreHorizontal, ThumbsUp, Users, Calendar, Type, Zap, Send, Quote } from "lucide-react";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { AuthContext } from "@/contexts/AuthContext";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { getAccessToken } from "@/lib/auth";
import { useEmoji } from "@/hooks/useEmoji";
import { EmojiRenderer } from "@/components/common/EmojiRenderer";

interface ChatMainAreaProps {
  conversation: Conversation | null;
  searchNavigateData?: {conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number} | null;
  onSearchNavigateComplete?: () => void;
}

export default function ChatMainArea({ conversation, searchNavigateData, onSearchNavigateComplete }: ChatMainAreaProps) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const isProgrammaticScrollRef = useRef(false);
  
  // Get user data
  const { user } = useContext(AuthContext);
  
  // Check permissions
  const { isAdmin, isViewRole } = useDynamicPermission();
  const canSendMessages = !isAdmin && !isViewRole;
  
  // Debug: Log permissions
  console.log('Permissions:', { isAdmin, isViewRole, canSendMessages });
  
  // Send message hook
  const { sendMessage, isLoading: isSendingMessage } = useSendMessage();
  
  // Emoji hook with 16x16 size
  const { getEmojiInfo } = useEmoji({
    config: {
      spriteSize: 16,
      spriteSheetPath: '/emoji/emoji-16'
    }
  });

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;
  
  // Message input state
  const [messageText, setMessageText] = useState("");
  const [sendError, setSendError] = useState<string | null>(null);
  
  // Quote state - lưu theo conversation ID
  const [hoveredMessageId, setHoveredMessageId] = useState<number | null>(null);
  const [quotedMessagesByConversation, setQuotedMessagesByConversation] = useState<{[key: number]: any}>({});
  
  // Reaction state
  const [hoveredReactionMessageId, setHoveredReactionMessageId] = useState<number | null>(null);
  
  // Get current quoted message for this conversation
  const quotedMessage = conversation?.id ? quotedMessagesByConversation[conversation.id] || null : null;

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
  // No separate key; we'll compute target page directly from search data

  // Backup scroll to ensure highlight works
  useEffect(() => {
    if (highlightedMessageId && searchNavigateData && highlightedMessageId === searchNavigateData.messageId) {
      const messageElement = document.getElementById(`message-${highlightedMessageId}`);
      if (messageElement) {
        messageElement.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'center' 
        });
      }
    }
  }, [highlightedMessageId, searchNavigateData]);

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
    const messageElement = document.getElementById(`message-${messageId}`);
    
    if (messageElement) {
      // Highlight the message first
      setHighlightedMessageId(messageId);
      
      // Scroll to the message with smooth behavior
      isProgrammaticScrollRef.current = true;
      messageElement.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Reset programmatic flag shortly after smooth scroll completes
      setTimeout(() => {
        isProgrammaticScrollRef.current = false;
      }, 600);
      
      // Remove highlight after 3 seconds
      setTimeout(() => {
        setHighlightedMessageId(null);
      }, 3000);
    }
  };

  // Handle search navigation - compute and jump to exact page immediately
  useEffect(() => {
    if (!searchNavigateData) return;
    // Nếu đang chuyển sang conversation khác theo search, chỉ chờ tới khi conversation khớp mới xử lý
    if (conversation?.id !== searchNavigateData.conversationId) return;

    // Tính page mục tiêu
    const totalMessages = searchNavigateData.totalMessagesInConversation || 1000; // fallback
    const positionFromEnd = totalMessages - searchNavigateData.messagePosition + 1;
    const calculatedPage = Math.ceil(positionFromEnd / LIMIT);

    if (page !== calculatedPage) {
      // Cần nạp trang khác → reset dữ liệu và set page
      setIsNavigatingFromSearch(true);
      setAcc([]);
      setReady(false);
      setPage(calculatedPage);
    } else {
      // Đã ở đúng trang → chỉ kích hoạt điều hướng để scroll/highlight lại, KHÔNG xoá acc
      setIsNavigatingFromSearch(true);
    }
  }, [searchNavigateData?.conversationId, searchNavigateData?.messageId, searchNavigateData?.messagePosition, searchNavigateData?.totalMessagesInConversation, conversation?.id, page]);

  // Handle scroll to search message after data is loaded
  useEffect(() => {
    if (searchNavigateData && acc.length > 0 && isNavigatingFromSearch) {
      const { messageId } = searchNavigateData;
      
      // Check if the target message is in the loaded data
      const targetMessage = acc.find(m => m.id === messageId);
      
      if (targetMessage) {
        // Wait for DOM to render, then scroll with retry mechanism
        const attemptScroll = (attempts = 0) => {
          if (attempts >= 20) {
            setIsNavigatingFromSearch(false);
            onSearchNavigateComplete?.();
            return;
          }
          
          const messageElement = document.getElementById(`message-${messageId}`);
          if (messageElement) {
            // Temporarily suspend intersection-triggered pagination
            isProgrammaticScrollRef.current = true;
            scrollToMessage(messageId);
            // Mark this conversation as search-navigated and reset navigation state
            setSearchNavigatedConversations(prev => new Set([...prev, searchNavigateData.conversationId]));
            setTimeout(() => {
              setIsNavigatingFromSearch(false);
              onSearchNavigateComplete?.();
              isProgrammaticScrollRef.current = false;
            }, 1000); // Đợi 1s để đảm bảo scroll hoàn thành
          } else {
            setTimeout(() => attemptScroll(attempts + 1), 200);
          }
        };
        
        // Start scrolling attempts after DOM has time to render
        setTimeout(() => attemptScroll(), 500);
      } else {
        // Tin nhắn không có trong trang hiện tại.
        // Nếu đang ở đúng page mục tiêu (page đã tính) nhưng vẫn chưa thấy do render chậm, thử lại ngắn.
        // Không xoá acc để tránh trắng màn hình lần 2.
        setTimeout(() => {
          const el = document.getElementById(`message-${messageId}`);
          if (el) {
            scrollToMessage(messageId);
          }
          setIsNavigatingFromSearch(false);
        }, 300);
      }
    }
  }, [acc, searchNavigateData, isNavigatingFromSearch, onSearchNavigateComplete]);

  const [hasAutoScrolled, setHasAutoScrolled] = useState(false);

  // Reset navigation state when conversation changes, but keep it if we are switching
  // exactly to the conversation initiated by search navigation. This prevents the need
  // to click twice to trigger highlight.
  useEffect(() => {
    if (!searchNavigateData) {
      setIsNavigatingFromSearch(false);
      return;
    }
    if (conversation?.id !== searchNavigateData.conversationId) {
      setIsNavigatingFromSearch(false);
    }
  }, [conversation?.id, searchNavigateData?.conversationId]);

  // Additional effect to ensure scroll works when message is highlighted from search
  useEffect(() => {
    if (searchNavigateData && highlightedMessageId === searchNavigateData.messageId && isNavigatingFromSearch) {
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
  }, [highlightedMessageId, searchNavigateData, isNavigatingFromSearch]);

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
    
    // If coming from search and already on the target conversation, use the exact target page immediately
    let pageToUse = page;
    if (
      searchNavigateData &&
      currentConversation.id === searchNavigateData.conversationId
    ) {
      const total = searchNavigateData.totalMessagesInConversation || 1000;
      const positionFromEnd = total - searchNavigateData.messagePosition + 1;
      const targetPage = Math.ceil(positionFromEnd / LIMIT);
      pageToUse = targetPage;
    }

    return {
      conversation_id: currentConversation.id,
      page: pageToUse,
      limit: LIMIT,
      sort_by: "timestamp" as const,
      sort_order: "desc" as const, // API trả mới -> cũ
      include_quotes: true,
      search: q || undefined,
    };
  }, [conversation?.id, searchNavigateData?.conversationId, searchNavigateData?.messagePosition, searchNavigateData?.totalMessagesInConversation, page, q]);

  // Stabilize params object identity to avoid duplicate fetches from rapid state changes
  const stableParams = useMemo(() => {
    if (!params) return null;
    return { ...params };
  }, [
    params?.conversation_id,
    params?.page,
    params?.limit,
    params?.sort_by,
    params?.sort_order,
    params?.include_quotes,
    params?.search,
  ]);

  const { messages: fetched = [], isLoading, error, pagination } = useMessages(stableParams);
  
  // Get group members for group conversations
  const { members: groupMembers = [] } = useGroupMembers(
    conversation?.conversation_type === 'group' ? { conversation_id: conversation.id } : null
  );

  // reset khi đổi hội thoại / tìm kiếm
  useEffect(() => {
    // Nếu đang navigate từ search vào đúng conversation, không reset page về 1
    const skipPageReset = !!searchNavigateData && conversation?.id === searchNavigateData.conversationId;
    if (!skipPageReset) {
      setPage(1);
    }
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
  }, [conversation?.id, q]); // Chỉ reset khi đổi conv hoặc thay đổi q

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
          isProgrammaticScrollRef.current = true;
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
          setHasAutoScrolled(true);
          setReady(true);
          console.log('📜 Auto-scrolled to bottom for conversation:', conversation.conversation_name, 'with', acc.length, 'messages');
          setTimeout(() => { isProgrammaticScrollRef.current = false; }, 300);
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
        if (isNavigatingFromSearch || isProgrammaticScrollRef.current) return; // Không load khi đang scroll chương trình
        
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
      { root: scrollRef.current, rootMargin: "50px 0px 0px 0px", threshold: 1.0 }
    );
    ob.observe(topRef.current);
    return () => ob.disconnect();
  }, [hasMore, isLoading, isPaging, ready, page, userScrolled, isNavigatingFromSearch]);

  const onScroll = () => {
    if (isProgrammaticScrollRef.current) return;
    if (!userScrolled) setUserScrolled(true);
  };

  // Handle message sending
  const handleSendMessage = async () => {
    if (!messageText.trim() || !conversation || !canSendMessages || !user) return;
    
    // Clear previous errors
    setSendError(null);
    
    try {
      // Get zalo_customer_id from conversation
      const zaloCustomerId = conversation.zalo_conversation_id;
      const customerType = conversation.conversation_type === 'group' ? 'group' : 'private';
      
      // Check if there's a quoted message
      if (quotedMessage) {
        // Send message with quote
        const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/send-message/quote`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await getAccessToken()}`,
            'X-Master-Key': process.env.NEXT_PUBLIC_MASTER_KEY || ''
          },
          body: JSON.stringify({
            user_id: user.id,
            message_content: messageText.trim(),
            zalo_customer_id: zaloCustomerId,
            customer_type: customerType,
            msg_id: quotedMessage.id.toString()
          })
        });
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      } else {
        // Send normal message
        await sendMessage({
          user_id: user.id,
          message_content: messageText.trim(),
          zalo_customer_id: zaloCustomerId,
          customer_type: customerType
        });
      }
      
      // Clear the input and quoted message after successful send
      setMessageText("");
      if (conversation?.id) {
        setQuotedMessagesByConversation(prev => {
          const updated = { ...prev };
          delete updated[conversation.id];
          return updated;
        });
      }
      
      // TODO: Refresh messages or add optimistic update
      // You might want to refresh the messages list here
      
    } catch (error) {
      console.error('Error sending message:', error);
      setSendError(error instanceof Error ? error.message : 'Có lỗi xảy ra khi gửi tin nhắn');
      
      // Auto hide error after 5 seconds
      setTimeout(() => {
        setSendError(null);
      }, 5000);
    }
  };

  // Handle quick reaction (thumbs up)
  const handleQuickReaction = () => {
    if (!conversation || !canSendMessages) return;
    
    // TODO: Implement quick reaction
    console.log('Sending quick reaction to conversation:', conversation.id);
  };

  // Handle quote message
  const handleQuoteMessage = (message: any) => {
    if (!conversation?.id) return;
    
    // Tạo quoted message object với sender name
    const quotedMsg = {
      ...message,
      sender_name: message.sender?.name || 
                  (message.is_outgoing ? user?.username : conversation?.participant?.name) ||
                  'Unknown'
    };
    
    // Lưu quoted message theo conversation ID
    setQuotedMessagesByConversation(prev => ({
      ...prev,
      [conversation.id]: quotedMsg
    }));
    
    // Focus vào input nhập tin nhắn (không phải search input)
    setTimeout(() => {
      const messageInput = document.querySelector('input[placeholder*="tin nhắn"]') as HTMLInputElement;
      if (messageInput) {
        messageInput.focus();
      }
    }, 100);
  };

  // Clear quoted message
  const clearQuotedMessage = () => {
    if (!conversation?.id) return;
    
    setQuotedMessagesByConversation(prev => {
      const updated = { ...prev };
      delete updated[conversation.id];
      return updated;
    });
  };

  // Handle reaction
  const handleReaction = (messageId: number, emoji: string) => {
    console.log('Reacting to message:', messageId, 'with emoji:', emoji);
    // TODO: Call API to add reaction
    setHoveredReactionMessageId(null); // Close reaction picker
  };

  // Reactions display component
  const ReactionsDisplay = ({ reactions }: { reactions: any[] }) => {
    if (!reactions || reactions.length === 0) return null;

    // Group reactions by type
    const groupedReactions = reactions.reduce((acc: any, reaction: any) => {
      const type = reaction.reaction_type;
      if (!acc[type]) {
        acc[type] = [];
      }
      acc[type].push(reaction);
      return acc;
    }, {});

    return (
      <div className="flex items-center gap-1">
        {Object.entries(groupedReactions).map(([type, reactions]: [string, any]) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <button className="px-2 py-1 bg-gray-100 rounded-full text-xs hover:bg-gray-200 transition-colors flex items-center gap-1">
                <span className="text-xs">
                  <EmojiRenderer 
                    text={type} 
                    renderMode="image" 
                    style={{ width: '16px', height: '16px' }}
                  />
                </span>
                <span className="text-gray-600">{reactions.length}</span>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <div className="flex flex-col gap-1">
                {reactions.map((reaction: any, index: number) => (
                  <span key={index} className="text-xs">
                    {reaction.user_name}
                  </span>
                ))}
              </div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    );
  };

  // Reaction picker component
  const ReactionPicker = ({ messageId, isVisible }: { messageId: number, isVisible: boolean }) => {
    if (!isVisible) return null;

    const reactions = ['/-strong', '/-heart', ':>', ':o', ':-((', ':-h'];

    return (
      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 p-2 z-50">
        <div className="flex items-center gap-1">
          {reactions.map((emojiShortcode, index) => (
            <button
              key={index}
              className="w-8 h-8 flex items-center justify-center hover:bg-gray-100 rounded-full transition-colors"
              onClick={() => handleReaction(messageId, emojiShortcode)}
            >
              <EmojiRenderer 
                text={emojiShortcode} 
                renderMode="image" 
                className="block leading-none"
                style={{ width: '16px', height: '16px' }}
              />
            </button>
          ))}
        </div>
      </div>
    );
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
          <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
            {conversation.participant?.avatar ? (
              <img 
                src={conversation.participant.avatar.replace(/"/g, '')} 
                alt={conversation.conversation_name || 'Avatar'} 
                className="w-full h-full object-cover"
              />
            ) : conversation.conversation_type === 'group' ? (
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
                // Lấy avatar từ message sender
                const getSenderAvatar = () => {
                  // Ưu tiên avatar từ sender trong message
                  if (m.sender?.avatar) {
                    return m.sender.avatar;
                  }
                  
                  // Fallback: Tìm từ group members nếu là nhóm
                  if (conversation?.conversation_type === 'group' && groupMembers.length > 0) {
                    const member = groupMembers.find(member => 
                      member.contact?.zalo_contact_id === m.sender?.zalo_id ||
                      member.contact?.display_name === m.sender?.name ||
                      member.contact?.display_name === m.sender_name
                    );
                    return member?.contact?.info_metadata?.avatar;
                  }
                  
                  // Fallback: Lấy từ conversation participant
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

                        <div className="max-w-[70%] min-w-[80px] break-words">
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

                      <div className="max-w-[70%] min-w-[80px] break-words">
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
                  <div 
                    key={m.id} 
                    id={`message-${m.id}`} 
                     className={`flex items-start gap-2 justify-start group relative ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}
                  >
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

                     <div className="max-w-[70%] min-w-[120px] break-words relative group">
                       {/* Tên người gửi */}
                       <div className="text-xs text-gray-500 mb-1 px-1">
                         {senderName}
                       </div>
                    
                      {/* Bubble tin nhắn */}
                      <div className={`px-4 py-2 rounded-2xl bg-white text-gray-900 rounded-bl-md shadow-sm ${highlightedMessageId === m.id ? 'border-2 border-blue-400' : ''}`}>
                        <div className="text-sm leading-relaxed break-words text-left">
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
                                                return (
                                                  <EmojiRenderer 
                                                    text={String(m.quote_text)}
                                                    renderMode="image"
                                                    className="inline"
                                                  />
                                                );
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
                                              return m.quote_text ? (
                                                <EmojiRenderer 
                                                  text={String(m.quote_text)}
                                                  renderMode="image"
                                                  className="inline"
                                                />
                                              ) : 'Tin nhắn';
                                            })()}
                                          </div>
                                        </div>
                                      )}
                                      {/* Tin nhắn chính */}
                                      <EmojiRenderer 
                                        text={textContent}
                                        renderMode="image"
                                        style={{ whiteSpace: 'pre-wrap', display: 'inline' }}
                                      />
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
                                                return (
                                                  <EmojiRenderer 
                                                    text={String(m.quote_text)}
                                                    renderMode="image"
                                                    className="inline"
                                                  />
                                                );
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
                                              return m.quote_text ? (
                                                <EmojiRenderer 
                                                  text={String(m.quote_text)}
                                                  renderMode="image"
                                                  className="inline"
                                                />
                                              ) : 'Tin nhắn';
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

                       {/* Quote Icon - Hiển thị khi hover (vị trí cũ) */}
                       {canSendMessages && (
                         <div className={`absolute -right-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50`}>
                            <button
                              className="w-8 h-8 bg-white rounded-full shadow border flex items-center justify-center hover:bg-gray-50"
                              onClick={() => handleQuoteMessage(m)}
                            >
                              <Quote className="w-4 h-4 text-blue-600" />
                            </button>
                         </div>
                       )}
                       
                       {/* Reactions Display */}
                       {m.reactions && m.reactions.length > 0 && (
                         <div className="absolute -bottom-2 left-0 z-40">
                           <ReactionsDisplay reactions={m.reactions} />
                         </div>
                       )}
                       
                       {/* Like Button - Hiển thị khi hover (vị trí dưới) */}
                       {canSendMessages && (
                        <div className="absolute bottom-1 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                           <div className="relative">
                             <button
                               className="w-8 h-8 bg-white rounded-full shadow border flex items-center justify-center hover:bg-gray-50"
                               onMouseEnter={() => setHoveredReactionMessageId(m.id)}
                               onMouseLeave={() => setHoveredReactionMessageId(null)}
                             >
                               <EmojiRenderer 
                                 text="/-strong" 
                                 renderMode="image" 
                                 className="block leading-none"
                                 style={{ width: '16px', height: '16px' }}
                               />
                             </button>
                             <ReactionPicker 
                               messageId={m.id} 
                               isVisible={hoveredReactionMessageId === m.id} 
                             />
                           </div>
                         </div>
                       )}
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
                      <div className="max-w-[70%] min-w-[120px] break-words">
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
                        {(m.sender?.avatar || user?.avatarZalo) ? (
                          <img 
                            src={(m.sender?.avatar || user?.avatarZalo).replace(/"/g, '')} 
                            alt={m.sender?.name || user?.username || 'User'}
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
                    <div className="max-w-[70%] min-w-[120px] break-words">
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
                      {(m.sender?.avatar || user?.avatarZalo) ? (
                        <img 
                          src={(m.sender?.avatar || user?.avatarZalo).replace(/"/g, '')} 
                          alt={m.sender?.name || user?.username || 'User'}
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
                <div 
                  key={m.id} 
                  id={`message-${m.id}`} 
                   className={`flex items-start gap-2 justify-end group relative ${highlightedMessageId === m.id ? 'bg-blue-100/50 transition-colors duration-300 -mx-6 px-6 py-1' : ''}`}
                >
                   <div className="max-w-[70%] min-w-[60px] break-words relative group">
                     {/* Tên người gửi */}
                     <div className="text-xs text-gray-500 mb-1 px-1 text-right">
                       {m.sender?.name || m.sender_name || user?.username || 'You'}
                     </div>
                     
                     {/* Bubble tin nhắn */}
                     <div className={`px-4 py-2 rounded-2xl bg-blue-50 text-gray-800 rounded-br-md shadow-sm ${highlightedMessageId === m.id ? 'border-2 border-blue-400' : ''}`}>
                      <div className="text-sm leading-relaxed break-words text-left">
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
                                              return (
                                                <EmojiRenderer 
                                                  text={String(m.quote_text)}
                                                  renderMode="image"
                                                  className="inline"
                                                />
                                              );
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
                                            return m.quote_text ? (
                                              <EmojiRenderer 
                                                text={String(m.quote_text)}
                                                renderMode="image"
                                                className="inline"
                                              />
                                            ) : 'Tin nhắn';
                                          })()}
                                        </div>
                                      </div>
                                    )}
                                    {/* Tin nhắn chính */}
                                    <EmojiRenderer 
                                      text={textContent}
                                      renderMode="image"
                                      style={{ whiteSpace: 'pre-wrap', display: 'inline' }}
                                    />
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

                     {/* Quote Icon - Hiển thị khi hover (vị trí cũ) */}
                     {canSendMessages && (
                       <div className={`absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50`}>
                          <button
                            className="w-8 h-8 bg-white rounded-full shadow border flex items-center justify-center hover:bg-gray-50"
                            onClick={() => handleQuoteMessage(m)}
                          >
                            <Quote className="w-4 h-4 text-blue-600" />
                          </button>
                       </div>
                     )}
                     
                     {/* Reactions Display */}
                     {m.reactions && m.reactions.length > 0 && (
                       <div className="absolute -bottom-2 right-0 z-40">
                         <ReactionsDisplay reactions={m.reactions} />
                       </div>
                     )}
                     
                     {/* Like Button - Hiển thị khi hover (vị trí dưới) */}
                     {canSendMessages && (
                      <div className="absolute bottom-1 left-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-50">
                         <div className="relative">
                            <button
                              className="w-8 h-8 bg-white rounded-full shadow border flex items-center justify-center hover:bg-gray-50"
                              onMouseEnter={() => setHoveredReactionMessageId(m.id)}
                              onMouseLeave={() => setHoveredReactionMessageId(null)}
                            >
                              <EmojiRenderer 
                                text="/-strong" 
                                renderMode="image" 
                                className="block leading-none"
                                style={{ width: '16px', height: '16px' }}
                              />
                            </button>
                           <ReactionPicker 
                             messageId={m.id} 
                             isVisible={hoveredReactionMessageId === m.id} 
                           />
                         </div>
                       </div>
                     )}
                   </div>

                  {/* Avatar bên phải */}
                  <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-1 overflow-hidden">
                    {(m.sender?.avatar || user?.avatarZalo) ? (
                      <img 
                        src={(m.sender?.avatar || user?.avatarZalo).replace(/"/g, '')}
                        alt={m.sender?.name || user?.username || 'User'}
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
      <div className="bg-white border-t border-gray-200">
        {/* Error Alert */}
        {sendError && (
          <div className="px-6 py-2">
            <Alert variant="destructive">
              <AlertDescription>{sendError}</AlertDescription>
            </Alert>
          </div>
        )}
        
        {/* Combined Toolbar and Input - Full Width */}
        <div className={`bg-gray-50 border-t border-gray-200 ${!canSendMessages ? 'opacity-50' : ''}`}>
          {/* Top Toolbar */}
          <div className="px-6 py-2 border-b border-gray-200">
            <div className="flex items-center gap-3">
              {/* Emoji/Sticker Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Open emoji/sticker picker')}
              >
                <Smile className="h-4 w-4 text-gray-700" />
              </button>

              {/* Image/Gallery Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Attach image')}
              >
                <Image className="h-4 w-4 text-gray-700" />
              </button>

              {/* Attachment Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Attach file')}
              >
                <Paperclip className="h-4 w-4 text-gray-700" />
              </button>

              {/* Contact/Participant Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Add contact')}
              >
                <Users className="h-4 w-4 text-gray-700" />
              </button>

              {/* Calendar/Scheduling Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Schedule message')}
              >
                <Calendar className="h-4 w-4 text-gray-700" />
              </button>

              {/* Text Formatting Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Text formatting')}
              >
                <Type className="h-4 w-4 text-gray-700" />
              </button>

              {/* Quick Reply Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Quick reply')}
              >
                <Zap className="h-4 w-4 text-gray-700" />
              </button>

              {/* More Options Button */}
              <button
                className="p-1 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('More options')}
              >
                <MoreHorizontal className="h-4 w-4 text-gray-700" />
              </button>
            </div>
          </div>

          {/* Quoted Message Display - Inside Input Area */}
          {quotedMessage && (
            <div className="px-6 py-3 bg-gray-100">
              <div className="bg-gray-200 rounded-lg p-3 border-l-4 border-blue-500">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Quote className="w-3 h-3 text-gray-600" />
                      <div className="text-sm font-medium text-gray-700">
                        Trả lời {quotedMessage.sender_name || 'Unknown'}
                      </div>
                    </div>
                    <div className="text-sm text-gray-600 line-clamp-2" style={{
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {(() => {
                        if (quotedMessage.content_type === 'TEXT') {
                          // Parse JSON để lấy text
                          try {
                            const parsed = JSON.parse(quotedMessage.content);
                            return parsed.text || String(quotedMessage.content || '');
                          } catch {
                            return String(quotedMessage.content || '');
                          }
                        } else if (quotedMessage.content_type === 'IMAGE') {
                          return '📷 Ảnh';
                        } else if (quotedMessage.content_type === 'FILE') {
                          try {
                            const parsed = JSON.parse(quotedMessage.content);
                            return `📄 ${parsed.fileName || 'File'}`;
                          } catch {
                            return '📄 File';
                          }
                        }
                        return String(quotedMessage.content || '');
                      })()}
                    </div>
                  </div>
                  <button
                    className="flex-shrink-0 p-1 hover:bg-gray-100 rounded transition-colors"
                    onClick={clearQuotedMessage}
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Message Input */}
          <div className="px-6 py-3 bg-white">
            <div className="flex items-center gap-2">
              {/* Text Input */}
              <div className="flex-1 relative">
                <input
                  value={messageText}
                  onChange={(e) => canSendMessages && setMessageText(e.target.value)}
                  placeholder={canSendMessages ? `Nhập @, tin nhắn tới ${(conversation.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || conversation.conversation_name)}` : 'Không thể gửi tin nhắn'}
                  disabled={!canSendMessages || isSendingMessage}
                  className={`w-full px-3 py-2 border-0 bg-transparent focus:outline-none text-sm placeholder-gray-500 ${isSendingMessage ? 'opacity-50' : ''}`}
                  onKeyDown={(e) => {
                    if (canSendMessages && !isSendingMessage && e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
              </div>

              {/* Mention Text */}
              {messageText.includes('@') && (
                <div className="text-sm text-blue-600 font-medium">
                  @{(conversation.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || conversation.conversation_name)}
                </div>
              )}

              {/* Emoji Button */}
              <button
                className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                disabled={!canSendMessages}
                onClick={() => canSendMessages && console.log('Open emoji picker')}
              >
                <Smile className="h-4 w-4 text-gray-700" />
              </button>

              {/* Send/Thumbs Up Button */}
              <button
                className={`p-1.5 hover:bg-gray-200 rounded transition-colors ${isSendingMessage ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!canSendMessages || isSendingMessage}
                onClick={() => canSendMessages && !isSendingMessage && (messageText.trim() ? handleSendMessage() : handleQuickReaction())}
              >
                {messageText.trim() ? (
                  <Send className="h-4 w-4 text-blue-500" />
                ) : (
                  <ThumbsUp className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>
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
