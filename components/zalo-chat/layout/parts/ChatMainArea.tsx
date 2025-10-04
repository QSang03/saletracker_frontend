"use client";

import React, { useMemo, useRef, useState, useEffect, useLayoutEffect } from "react";
import { useMessages } from "@/hooks/zalo-chat/useMessages";
import TextMessage from "@/components/zalo-chat/messages/MessageTypes/TextMessage";
import { Conversation } from "@/types/zalo-chat";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Smile, Paperclip, Image, MoreHorizontal, ThumbsUp } from "lucide-react";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

export default function ChatMainArea({ conversation }: { conversation: Conversation | null }) {
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  
  // Check permissions
  const { isAdmin, isViewRole } = useDynamicPermission();
  const canSendMessages = !isAdmin && !isViewRole;

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 30;
  
  // Message input state
  const [messageText, setMessageText] = useState("");

  // tích lũy theo thời gian tăng dần (cũ -> mới)
  const [acc, setAcc] = useState<any[]>([]);
  const [hasMore, setHasMore] = useState(true);

  // chống auto lazyload khi mở
  const [ready, setReady] = useState(false);
  const [userScrolled, setUserScrolled] = useState(false);

  // giữ vị trí khi prepend
  const [isPaging, setIsPaging] = useState(false);
  const prevH = useRef(0);
  const prevTop = useRef(0);

  const params = useMemo(() => {
    if (!conversation) return null;
    return {
      conversation_id: conversation.id,
      page,
      limit: LIMIT,
      sort_by: "timestamp" as const,
      sort_order: "desc" as const, // API trả mới -> cũ
      include_quotes: true,
      search: q || undefined,
    };
  }, [conversation?.id, page, q]);

  const { messages: fetched = [], isLoading, error, pagination } = useMessages(params);

  // reset khi đổi hội thoại / tìm kiếm
  useEffect(() => {
    setPage(1);
    setAcc([]);
    setHasMore(true);
    setReady(false);
    setUserScrolled(false);
    setIsPaging(false);
  }, [conversation?.id, q]);

  // gộp trang + cập nhật hasMore theo total_pages
  useEffect(() => {
    if (!conversation) return;

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

  // lần đầu: cuộn xuống đáy rồi mới bật observer
  useLayoutEffect(() => {
    if (page !== 1 || isLoading || ready || !scrollRef.current) return;
    const el = scrollRef.current;
    requestAnimationFrame(() => {
      el.scrollTop = el.scrollHeight; // tin mới ở DƯỚI
      setReady(true);
      console.log('📜 Initial scroll to bottom for page 1');
    });
  }, [page, isLoading, acc.length, ready]);

  // Auto scroll to bottom when conversation changes
  useLayoutEffect(() => {
    if (!conversation || !scrollRef.current) return;
    
    // Reset states when conversation changes
    setReady(false);
    setUserScrolled(false);
    
    console.log('🔄 Conversation changed, preparing to scroll to bottom:', conversation.conversation_name);
  }, [conversation?.id]);

  // Always scroll to bottom when messages are loaded for current conversation
  useLayoutEffect(() => {
    if (!conversation || !scrollRef.current || acc.length === 0 || isLoading) return;
    
    // Always scroll to bottom when switching conversations
    const timer = setTimeout(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        setReady(true);
        console.log('📜 Auto-scrolled to bottom for conversation:', conversation.conversation_name, 'with', acc.length, 'messages');
      }
    }, 50);

    return () => clearTimeout(timer);
  }, [conversation?.id, acc.length, isLoading]);

  // observer: kéo LÊN chạm đỉnh mới load
  useEffect(() => {
    if (!scrollRef.current || !topRef.current) return;
    const ob = new IntersectionObserver(
      (entries) => {
        if (!ready) return;
        if (!hasMore || isLoading || isPaging) return;
        if (entries[0].isIntersecting) {
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
  }, [hasMore, isLoading, isPaging, ready, page]);

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
            <div className="font-semibold text-gray-900 text-lg">{conversation.conversation_name}</div>
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

      <div ref={scrollRef} className="flex-1 overflow-auto bg-gray-50" onScroll={onScroll}>
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
            {acc.map(m => (
              <div key={m.id} className={`flex ${m.is_outgoing ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] ${m.is_outgoing ? "order-2" : "order-1"}`}>
                  {!m.is_outgoing && (
                    <div className="text-xs text-gray-500 mb-1 px-1">
                      {m.sender_name}
                    </div>
                  )}
                  <div className={`px-4 py-2 rounded-2xl ${
                    m.is_outgoing 
                      ? 'bg-blue-500 text-white rounded-br-md' 
                      : 'bg-white text-gray-900 rounded-bl-md shadow-sm'
                  }`}>
                    <div className="text-sm leading-relaxed">
                      {m.content_type === 'TEXT' && typeof m.content === 'string' ? 
                        JSON.parse(m.content)?.text || m.content : 
                        m.content
                      }
                    </div>
                  </div>
                  <div className={`text-xs text-gray-400 mt-1 px-1 ${m.is_outgoing ? "text-right" : "text-left"}`}>
                    {new Date(m.timestamp).toLocaleTimeString('vi-VN', { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </div>
                </div>
              </div>
            ))}

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
              placeholder={canSendMessages ? `Nhập @, tin nhắn tới ${conversation.conversation_name.split('_').pop() || 'bạn'}` : 'Không thể gửi tin nhắn'}
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
    </div>
  );
}
