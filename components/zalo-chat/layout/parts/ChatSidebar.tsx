"use client";

import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { useConversations, ConversationType } from '@/hooks/zalo-chat/useConversations';
import { useMultiUserConversations } from '@/hooks/zalo-chat/useMultiUserConversations';
import { Conversation } from '@/types/zalo-chat';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { AuthContext } from '@/contexts/AuthContext';
import { EmployeeFilterModal } from './EmployeeFilterModal';
import SearchDropdown from '@/components/zalo-chat/common/SearchDropdown';

interface ChatSidebarProps {
  userId: number;
  activeConversationId: number | null;
  onSelectConversation: (c: Conversation | null) => void;
  onConversationsChange?: (conversations: Conversation[]) => void;
  onSelectMessage?: (message: any, conversation: any) => void;
}

export default function ChatSidebar({ userId, activeConversationId, onSelectConversation, onConversationsChange, onSelectMessage }: ChatSidebarProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConversationType | 'all'>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hideTabs, setHideTabs] = useState(false);
  const [activeMinIcon, setActiveMinIcon] = useState<'all' | 'group' | null>('all'); // Track which mini icon is active
  const [showEmployeeFilterModal, setShowEmployeeFilterModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh key

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
    };

    if (showCategoryDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showCategoryDropdown]);

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

  // Chuyển conversation_type thành giá trị đơn giản để tránh tạo object mới
  const conversationType = useMemo(() => {
    return typeFilter !== 'all' ? typeFilter : null;
  }, [typeFilter]);

  // Chỉ reset khi filter thực sự thay đổi (không có debounce vì đã có trong hook)
  const hasEmployeeFilter = selectedEmployeeIds.length > 0;
  const filterKey = `${targetUserId}-${search}-${conversationType}-${selectedEmployeeIds.join(',')}`;
  const prevFilterKeyRef = useRef(filterKey);
  const isFirstMountRef = useRef(true);

  useEffect(() => {
    // Skip reset ở lần render đầu tiên
    if (isFirstMountRef.current) {
      isFirstMountRef.current = false;
      prevFilterKeyRef.current = filterKey;
      return;
    }

    // Chỉ reset khi filter thực sự thay đổi sau lần mount đầu
    if (prevFilterKeyRef.current !== filterKey) {
      prevFilterKeyRef.current = filterKey;
      setPage(1);
      setHasMore(true);
      setAllConversations([]);
      setRefreshKey(prev => prev + 1);
      // Clear selection ngay khi filter thay đổi
      onSelectConversation(null);
    }
  }, [filterKey, onSelectConversation]);

  // Dùng hook khác nhau tùy theo có employee filter hay không
  // Hook cho single user (không có employee filter)
  const singleUserResult = useConversations({
    userId: targetUserId,
    isManager: isManager && !isAdmin && !isViewRole,
    page,
    limit: LIMIT,
    search: search || undefined,
    conversation_type: conversationType,
    sort_by: 'last_message_timestamp',
    sort_order: 'desc',
    has_unread: null,
    refreshKey,
  });

  // Hook cho multi users (có employee filter)
  const multiUserResult = useMultiUserConversations({
    userIds: selectedEmployeeIds,
    page,
    limit: LIMIT,
    search: search || undefined,
    conversation_type: conversationType,
    sort_by: 'last_message_timestamp',
    sort_order: 'desc',
    refreshKey,
  });

  // Chọn result phù hợp
  const { conversations: fetched, isLoading, error, pagination } = hasEmployeeFilter 
    ? { ...multiUserResult, pagination: null }
    : singleUserResult;

  // append trang mới tại chỗ (không refetch từ đầu)
  useEffect(() => {
    if (!fetched) return;
    
    // Với multi-user, không hỗ trợ pagination (đã load tất cả)
    if (hasEmployeeFilter) {
      setAllConversations(fetched);
      setHasMore(false); // Không có pagination cho multi-user
    } else {
      setAllConversations(prev => {
        // Nếu page = 1 (reset), thay thế hoàn toàn
        if (page === 1) {
          return fetched;
        }
        
        // Nếu page > 1, append và de-dup
        const map = new Map<number | string, Conversation>();
        for (const x of prev) map.set(x.id, x);
        for (const x of fetched) map.set(x.id, x);
        return Array.from(map.values());
      });

      if (pagination && typeof pagination.total_pages === 'number' && typeof pagination.page === 'number') {
        setHasMore(pagination.page < pagination.total_pages);
      } else {
        setHasMore(fetched.length === LIMIT);
      }
    }
  }, [fetched, pagination, page, hasEmployeeFilter]);

  // Notify parent when conversations change
  useEffect(() => {
    if (onConversationsChange && allConversations.length > 0) {
      onConversationsChange(allConversations);
    }
  }, [allConversations, onConversationsChange]);

  // Auto-select first conversation sau khi load xong data (chỉ khi có employee filter)
  useEffect(() => {
    if (!isLoading && hasEmployeeFilter) {
      if (allConversations.length > 0) {
        // Có conversations → Chọn conversation đầu tiên
        onSelectConversation(allConversations[0]);
      } else {
        // Không có conversations → Đảm bảo clear (trong trường hợp ZaloChatLayout đã set)
        onSelectConversation(null);
      }
    }
  }, [isLoading, allConversations.length, hasEmployeeFilter]);

  // auto load trang kế khi chạm đáy, không nhảy scroll
  useEffect(() => {
    if (!bottomRef.current || !listRef.current) return;
    
    const observer = new IntersectionObserver(
      entries => {
        // Chỉ load thêm khi: 
        // 1. Sentinel visible
        // 2. Có thêm data để load
        // 3. Không đang loading
        // 4. Đã có conversations (tránh trigger khi mới mount)
        if (entries[0].isIntersecting && hasMore && !isLoading && allConversations.length > 0) {
          setPage(p => p + 1);
        }
      },
      { root: listRef.current, rootMargin: '100px' }
    );
    
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, isLoading, allConversations.length]);

  // Use conversations directly from API (already filtered by backend)
  const conversations = allConversations;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left mini navigation column */}
      <div className="w-16 bg-blue-600 flex flex-col items-center py-4">
        {/* User Avatar */}
        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/20 flex items-center justify-center mb-6">
          {user?.avatarZalo ? (
            <img 
              src={user.avatarZalo} 
              alt={user.username || 'User'}
              className="w-full h-full object-cover"
            />
          ) : (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          )}
        </div>

        {/* Top icons */}
        <div className="flex flex-col gap-3">
          {/* Chat - active */}
            <div 
              className={`w-10 h-10 rounded-lg flex items-center justify-center cursor-pointer transition-colors ${
                activeMinIcon === 'all' ? 'bg-blue-700' : 'hover:bg-blue-700/60'
              }`}
              onClick={() => {
                setTypeFilter('all');
                setHideTabs(false);
                setActiveMinIcon('all');
              }}
            >
              <svg className={`w-5 h-5 ${activeMinIcon === 'all' ? 'text-white' : 'text-white/90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            </div>
            {/* Contacts - Groups */}
            <div 
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer ${
                activeMinIcon === 'group' ? 'bg-blue-700' : 'hover:bg-blue-700/60'
              }`}
              onClick={() => {
                setTypeFilter('group');
                setHideTabs(true);
                setShowCategoryDropdown(false);
                setActiveMinIcon('group');
              }}
            >
              <svg className={`w-5 h-5 ${activeMinIcon === 'group' ? 'text-white' : 'text-white/90'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
        </div>

        {/* Bottom icons - Employee Filter (Admin/Manager only) */}
        <div className="mt-auto">
          {(isAdmin || isManager) && (
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center hover:bg-blue-700/60 cursor-pointer transition-colors relative"
              onClick={() => setShowEmployeeFilterModal(true)}
              title="Lọc theo nhân viên"
            >
              <svg className="w-5 h-5 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              {selectedEmployeeIds.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center text-xs text-white font-bold">
                  {selectedEmployeeIds.length}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: existing sidebar content */}
      <div className="w-[400px] flex flex-col bg-white overflow-hidden">
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
            {user?.avatarZalo ? (
              <img 
                src={user.avatarZalo} 
                alt={user.username || 'User'}
                className="w-full h-full object-cover"
              />
            ) : (
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
        <SearchDropdown 
          userId={userId} 
          onSelectConversation={onSelectConversation}
          onSelectMessage={onSelectMessage}
        />
      </div>

      {/* Tabs */}
      {!hideTabs && (
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex gap-1 text-sm">
          <button className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
            typeFilter === 'all' ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100'
          }`} onClick={() => {
            setTypeFilter('all');
            setActiveMinIcon(null); // Deactivate mini icon when using tabs
          }}>
            Tất cả
          </button>
          <div className="relative" ref={dropdownRef}>
            <button 
              className="px-3 py-1.5 rounded-lg font-medium text-gray-600 hover:bg-gray-100 transition-colors flex items-center gap-1"
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
            >
              Phân loại
              <svg className={`w-3 h-3 transition-transform ${showCategoryDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {showCategoryDropdown && (
              <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
                <div className="py-1">
                  <button 
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setTypeFilter('private');
                      setShowCategoryDropdown(false);
                      setActiveMinIcon(null); // Deactivate mini icon when using dropdown
                    }}
                  >
                    Tin nhắn riêng tư
                  </button>
                  <button 
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setTypeFilter('group');
                      setShowCategoryDropdown(false);
                      setActiveMinIcon(null); // Deactivate mini icon when using dropdown
                    }}
                  >
                    Nhóm chat
                  </button>
                
                </div>
              </div>
            )}
            </div>
        </div>
      </div>
      )}

        <div className="flex-1 overflow-y-auto overflow-x-hidden" ref={listRef}>
         {isLoading && page === 1 && <div className="p-4 text-sm text-gray-500 text-center">Đang tải...</div>}
         {error && <div className="p-4 text-xs text-red-500 text-center">{error}</div>}

         {!error && conversations.map((c) => {
           const isActive = activeConversationId === c.id;
           const isGroup = c.conversation_type === 'group';
           return (
             <button
               key={c.id}
               onClick={() => onSelectConversation(c)}
               className={`w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                 isActive ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
               }`}
             >
               <div className="flex items-start gap-2">
                 {/* Avatar */}
                 <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 overflow-hidden">
                   {(() => {
                     // Get avatar from participant (for private chats)
                     const avatarUrl = c.participant?.avatar?.replace(/"/g, '');
                     
                     if (avatarUrl) {
                       return (
                         <img 
                           src={avatarUrl} 
                           alt={c.conversation_name}
                           className="w-full h-full object-cover"
                         />
                       );
                     }
                     
                     // Default icon for group or no avatar
                     if (isGroup) {
                       return (
                         <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                         </svg>
                       );
                     }
                     
                     return (
                       <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                       </svg>
                     );
                   })()}
                 </div>

                 {/* Content */}
                 <div className="flex-1 min-w-0">
                   <div className="flex items-center justify-between mb-1">
                     <div className="font-medium text-gray-900 truncate text-sm">
                       {c.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || c.conversation_name}
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
                       
                       // Default text content - handle both string and object
                       try {
                         let contentStr = '';
                         
                         if (typeof c.last_message.content === 'string') {
                           try {
                             const parsed = JSON.parse(c.last_message.content);
                             // Extract text from parsed object
                             contentStr = String(parsed?.text || parsed?.title || parsed?.description || '');
                           } catch {
                             contentStr = String(c.last_message.content);
                           }
                         } else if (typeof c.last_message.content === 'object' && c.last_message.content !== null) {
                           // If content is already an object (not JSON string)
                           const content = c.last_message.content as any;
                           contentStr = String(content?.text || content?.title || content?.description || '');
                         } else {
                           contentStr = String(c.last_message.content || '');
                         }
                         
                         return contentStr || 'Tin nhắn không có nội dung';
                       } catch (err) {
                         console.error('Error rendering last message content:', err);
                         return 'Lỗi hiển thị tin nhắn';
                       }
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

        {/* Empty state when no conversations */}
        {!isLoading && conversations.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <div className="text-sm text-gray-500 text-center">
              Không có cuộc hội thoại nào
            </div>
            <div className="text-xs text-gray-400 mt-1 text-center">
              Bắt đầu một đoạn chat mới
            </div>
          </div>
        )}

        {!hasMore && conversations.length > 0 && (
        <div className="p-4 text-center text-xs text-gray-400">Đã hiển thị tất cả</div>
      )}
    </div>
      </div>

      {/* Employee Filter Modal */}
      <EmployeeFilterModal
        isOpen={showEmployeeFilterModal}
        onClose={() => setShowEmployeeFilterModal(false)}
        onApply={(employeeIds) => {
          setSelectedEmployeeIds(employeeIds);
          setShowEmployeeFilterModal(false);
        }}
        selectedEmployeeIds={selectedEmployeeIds}
        isAdmin={isAdmin}
        isManager={isManager}
        managedDepartments={user?.departments?.map(d => d.id) || []}
      />
    </div>
  );
}
