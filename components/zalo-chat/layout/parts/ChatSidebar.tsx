"use client";

import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { useConversations, ConversationType } from '@/hooks/zalo-chat/useConversations';
import { Conversation } from '@/types/zalo-chat';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { AuthContext } from '@/contexts/AuthContext';

interface ChatSidebarProps {
  userId: number;
  activeConversationId: number | null;
  onSelectConversation: (c: Conversation | null) => void;
  onConversationsChange?: (conversations: Conversation[]) => void;
}

export default function ChatSidebar({ userId, activeConversationId, onSelectConversation, onConversationsChange }: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConversationType | 'all' | 'unread'>('all');

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh key

  const LIMIT = 20;
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const { user } = useContext(AuthContext);
  const { isAdmin, isManager, isPM, isViewRole } = useDynamicPermission();

  const targetUserId = useMemo(() => {
    if (isAdmin || isViewRole) return undefined;
    if (isManager) return undefined;
    return user?.id || userId;
  }, [isAdmin, isManager, isViewRole, user?.id, userId]);

  const filters = useMemo(() => {
    const f: { conversation_type?: ConversationType | null; has_unread?: boolean | null } = {};
    if (typeFilter === 'unread') {
      f.has_unread = true;
    } else if (typeFilter !== 'all') {
      f.conversation_type = typeFilter;
    }
    return f;
  }, [typeFilter]);

  // gọi API theo trang
  const { conversations: fetched, isLoading, error, pagination } = useConversations({
    userId: targetUserId,
    isManager: isManager && !isAdmin && !isViewRole,
    page,
    limit: LIMIT,
    search: search || undefined,
    conversation_type: filters.conversation_type ?? null,
    sort_by: 'last_message_timestamp',
    sort_order: 'desc',
    has_unread: filters.has_unread ?? null,
    refreshKey, // Add refresh key to force refetch
  });

  // reset khi bộ lọc/đối tượng thay đổi
  useEffect(() => {
    console.log('🔄 Filter changed, resetting:', { 
      targetUserId, 
      search, 
      conversation_type: filters.conversation_type,
      currentAllCount: allConversations.length
    });
    setPage(1);
    setHasMore(true);
    setAllConversations([]);
    setRefreshKey(prev => {
      console.log('🔄 Incrementing refreshKey from', prev, 'to', prev + 1);
      return prev + 1;
    }); // Force refetch by incrementing refresh key
  }, [targetUserId, search, filters.conversation_type, filters.has_unread]);

  // append trang mới tại chỗ (không refetch từ đầu)
  useEffect(() => {
    if (!fetched) return;
    
    console.log('📊 Processing fetched conversations:', {
      fetchedCount: fetched.length,
      currentAllCount: allConversations.length,
      page,
      conversationType: filters.conversation_type
    });
    
    setAllConversations(prev => {
      // Nếu page = 1 (reset), thay thế hoàn toàn
      if (page === 1) {
        console.log('🔄 Page 1 - replacing all conversations');
        return fetched;
      }
      
      // Nếu page > 1, append và de-dup
      const map = new Map<number | string, Conversation>();
      for (const x of prev) map.set(x.id, x);
      for (const x of fetched) map.set(x.id, x);
      const result = Array.from(map.values());
      console.log('📝 Page > 1 - appending conversations:', { prevCount: prev.length, fetchedCount: fetched.length, resultCount: result.length });
      return result;
    });

    if (pagination && typeof pagination.total_pages === 'number' && typeof pagination.page === 'number') {
      setHasMore(pagination.page < pagination.total_pages);
    } else {
      setHasMore(fetched.length === LIMIT);
    }
  }, [fetched, pagination, page, filters.conversation_type, allConversations.length]);

  // Notify parent when conversations change
  useEffect(() => {
    if (onConversationsChange && allConversations.length > 0) {
      onConversationsChange(allConversations);
    }
  }, [allConversations, onConversationsChange]);

  // auto load trang kế khi chạm đáy, không nhảy scroll
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !isLoading) {
          setPage(p => p + 1);
        }
      },
      { root: listRef.current, rootMargin: '0px 0px 200px 0px' }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading]);

  // KHÔNG sort lại toàn bộ mỗi lần để tránh nhảy vị trí. Nếu cần ưu tiên unread, làm ở backend.
  const conversations = allConversations;

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {user?.avatarZalo ? (
              <img 
                src={user.avatarZalo} 
                alt={user.username || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div>
            <div className="font-medium text-gray-900">Zalo - NKC</div>
            <div className="text-xs text-gray-500">Hệ thống chat</div>
          </div>
        </div>
        
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Tìm kiếm" 
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <div className="absolute left-2.5 top-2.5 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-1 text-sm">
          <button className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            typeFilter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`} onClick={() => setTypeFilter('all')}>
            Tất cả
          </button>
          <button className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            typeFilter === 'unread' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`} onClick={() => setTypeFilter('unread')}>
            Chưa đọc
          </button>
          <button className="px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1">
            Phân loại
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>
      </div>

       <div className="flex-1 overflow-auto" ref={listRef}>
         {isLoading && page === 1 && <div className="p-4 text-sm text-gray-500 text-center">Đang tải...</div>}
         {error && <div className="p-4 text-xs text-red-500 text-center">{error}</div>}

         {!error && conversations.map((c) => {
           const isActive = activeConversationId === c.id;
           const isGroup = c.conversation_type === 'group';
           return (
             <button
               key={c.id}
               onClick={() => onSelectConversation(c)}
               className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                 isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
               }`}
             >
               <div className="flex items-start gap-3">
                 {/* Avatar */}
                 <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                   {isGroup ? (
                     <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                     </svg>
                   ) : (
                     <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                     </svg>
                   )}
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                     <div className="font-medium text-gray-900 truncate text-sm">
                       {c.conversation_name}
                     </div>
                   </div>
                   
                   <div className="text-xs text-gray-500 truncate">
                     {c.last_message?.sender_name && (
                       <span className="font-medium">{c.last_message.sender_name}: </span>
                     )}
                     {(() => {
                       if (!c.last_message?.content) return 'Chưa có tin nhắn';
                       
                       // Check if it's an image message
                       if (c.last_message.content_type === 'IMAGE' && typeof c.last_message.content === 'string') {
                         try {
                           const parsed = JSON.parse(c.last_message.content);
                           if (parsed.imageUrl) {
                             return (
                               <div className="flex items-center gap-1">
                                 <svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                 </svg>
                                 <span>Hình ảnh</span>
                               </div>
                             );
                           }
                         } catch {}
                       }
                       
                       // Default text content
                       if (typeof c.last_message.content === 'string') {
                         try {
                           const parsed = JSON.parse(c.last_message.content);
                           return parsed?.text || c.last_message.content;
                         } catch {
                           return c.last_message.content;
                         }
                       }
                       
                       // Nếu content là object, convert thành string
                       if (typeof c.last_message.content === 'object' && c.last_message.content !== null) {
                         return JSON.stringify(c.last_message.content, null, 2);
                       }
                       
                       return c.last_message.content;
                     })()}
                   </div>
                 </div>

                 {/* Time and Unread Badge */}
                 <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                   <div className="text-xs text-gray-400">
                     {(() => {
                       const messageDate = new Date(c.last_message_timestamp);
                       const now = new Date();
                       const isToday = messageDate.toDateString() === now.toDateString();
                       
                       if (isToday) {
                         const diffInMinutes = Math.floor((now.getTime() - messageDate.getTime()) / (1000 * 60));
                         
                         if (diffInMinutes < 1) {
                           return 'Vài giây';
                         } else if (diffInMinutes < 60) {
                           return `${diffInMinutes} phút`;
                         } else {
                           const diffInHours = Math.floor(diffInMinutes / 60);
                           return `${diffInHours} giờ`;
                         }
                       } else {
                         return messageDate.toLocaleString('vi-VN', { 
                           day: '2-digit',
                           month: '2-digit'
                         });
                       }
                     })()}
                   </div>
                   {c.unread_count > 0 && (
                     <div className="bg-blue-500 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[16px] h-4 flex items-center justify-center text-[10px]">
                       {c.unread_count}
                     </div>
                   )}
                 </div>
               </div>
             </button>
           );
         })}

        {/* loader nhỏ khi đang tải trang tiếp theo */}
        {isLoading && page > 1 && <div className="p-4 text-center text-xs text-gray-500">Đang tải thêm…</div>}

        {/* sentinel để tự load tiếp khi chạm đáy */}
        <div ref={bottomRef} className="h-6" />

        {!hasMore && conversations.length > 0 && (
          <div className="p-4 text-center text-xs text-gray-400">Đã hiển thị tất cả</div>
        )}
      </div>
    </div>
  );
}
