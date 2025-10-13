"use client";

import React, { useMemo, useState, useContext, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useConversations, ConversationType } from '@/hooks/zalo-chat/useConversations';
import { useMultiUserConversations } from '@/hooks/zalo-chat/useMultiUserConversations';
import { Conversation } from '@/types/zalo-chat';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { AuthContext } from '@/contexts/AuthContext';
import { EmployeeFilterModal } from './EmployeeFilterModal';
import { useSearch } from '@/hooks/zalo-chat/useSearch';
import { useAutoRefresh } from '@/hooks/zalo-chat/useAutoRefresh';

interface ChatSidebarProps {
  userId: number;
  activeConversationId: number | null;
  onSelectConversation: (c: Conversation | null) => void;
  onConversationsChange?: (conversations: Conversation[]) => void;
  onSearchMessageClick?: (conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number) => void;
}

export default function ChatSidebar({ userId, activeConversationId, onSelectConversation, onConversationsChange, onSearchMessageClick }: ChatSidebarProps) {
  const router = useRouter();
  const hasAtLeastTwoWords = (input: string | null | undefined): boolean => {
    if (!input) return false;
    const words = input.trim().split(/\s+/).filter(Boolean);
    return words.length >= 2;
  };
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<ConversationType | 'all'>('all');
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [hideTabs, setHideTabs] = useState(false);
  const [activeMinIcon, setActiveMinIcon] = useState<'all' | 'group' | null>('all'); // Track which mini icon is active
  const [showEmployeeFilterModal, setShowEmployeeFilterModal] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<{id: number, name: string}[]>([]);

  const [allConversations, setAllConversations] = useState<Conversation[]>([]);
  const listRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [refreshKey, setRefreshKey] = useState(0); // Force refresh key

  // Search mode state
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [activeSearchMessageId, setActiveSearchMessageId] = useState<number | null>(null);
  const [isDebouncing, setIsDebouncing] = useState(false);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

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
  const canUseEmployeeFilter = isAdmin || isManager || isViewRole;

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
      // Chỉ tăng refreshKey khi không có employee filter (để tránh duplicate calls)
      if (!hasEmployeeFilter) {
        setRefreshKey(prev => prev + 1);
      }
      // Clear selection ngay khi filter thay đổi
      onSelectConversation(null);
    }
  }, [filterKey, hasEmployeeFilter, onSelectConversation]);

  // Immediate search for multi-word queries
  useEffect(() => {
    const trimmedQuery = searchQuery.trim();
    
    // Clear results immediately if query is empty
    if (!trimmedQuery) {
      setDebouncedQuery('');
      setIsDebouncing(false);
      return;
    }
    
    // Check if query has 2 or more characters
    const charCount = trimmedQuery.length;
    
    if (charCount >= 2) {
      // For 2+ characters, call API immediately without debounce
      setDebouncedQuery(trimmedQuery);
      setIsDebouncing(false);
    } else {
      // For single character, don't search
      setDebouncedQuery('');
      setIsDebouncing(false);
    }
  }, [searchQuery]);

  // Prevent unnecessary re-renders by memoizing the debounced query
  const memoizedDebouncedQuery = useMemo(() => debouncedQuery, [debouncedQuery]);

  // Focus search input when entering search mode
  useEffect(() => {
    if (isSearchMode && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isSearchMode]);

  // Dùng hook khác nhau tùy theo có employee filter hay không
  // Chỉ gọi hook cần thiết để tránh duplicate calls
  
  // Memoize params để tránh duplicate calls
  const singleUserParams = useMemo(() => ({
    userId: hasEmployeeFilter ? -1 : targetUserId, // Disable khi có employee filter (dùng -1 thay vì undefined)
    isManager: isManager && !isAdmin && !isViewRole,
    page,
    limit: LIMIT,
    search: search || undefined,
    conversation_type: conversationType,
    sort_by: 'last_message_timestamp' as const,
    sort_order: 'desc' as const,
    has_unread: null,
    refreshKey: hasEmployeeFilter ? 0 : refreshKey, // Không refresh khi disable
  }), [hasEmployeeFilter, targetUserId, isManager, isAdmin, isViewRole, page, search, conversationType, refreshKey]);

  const multiUserParams = useMemo(() => ({
    userIds: !hasEmployeeFilter ? [] : selectedEmployeeIds, // Disable khi không có employee filter
    page,
    limit: LIMIT,
    search: search || undefined,
    conversation_type: conversationType,
    sort_by: 'last_message_timestamp' as const,
    sort_order: 'desc' as const,
    refreshKey: !hasEmployeeFilter ? 0 : refreshKey, // Không refresh khi disable
  }), [hasEmployeeFilter, selectedEmployeeIds, page, search, conversationType, refreshKey]);

  // Luôn gọi cả 2 hooks để tuân thủ Rules of Hooks
  const singleUserResult = useConversations(singleUserParams);
  const multiUserResult = useMultiUserConversations(multiUserParams);

  // Chọn result phù hợp
  const { conversations: fetched, isLoading, error, pagination, refetch } = hasEmployeeFilter 
    ? { ...multiUserResult, pagination: null }
    : singleUserResult;
  
  // Get hasMore from appropriate source
  const hasMoreData = hasEmployeeFilter ? multiUserResult.hasMore : (pagination && typeof pagination.total_pages === 'number' && typeof pagination.page === 'number' ? pagination.page < pagination.total_pages : false);

  // Auto-refresh conversations list (only when not in search mode and not filtering employees)
  useAutoRefresh({
    onRefresh: () => {
      if (!isSearchMode && !showEmployeeFilterModal && refetch) {
        // Silent mode: không hiện loading animation khi auto-refresh
        refetch(true);
      }
    },
    enabled: !isSearchMode && !showEmployeeFilterModal,
  });

  // append trang mới tại chỗ (không refetch từ đầu)
  useEffect(() => {
    if (!fetched) return;
    
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

    // Update hasMore based on data source
    if (hasEmployeeFilter) {
      setHasMore(hasMoreData);
    } else {
      if (pagination && typeof pagination.total_pages === 'number' && typeof pagination.page === 'number') {
        setHasMore(pagination.page < pagination.total_pages);
      } else {
        setHasMore(fetched.length === LIMIT);
      }
    }
  }, [fetched, pagination, page, hasEmployeeFilter, hasMoreData]);

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
  // Rebind observer when leaving search mode or list container changes
  useEffect(() => {
    if (!bottomRef.current || !listRef.current) return;

    const container = listRef.current;
    const sentinel = bottomRef.current;

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
      { root: container, rootMargin: '100px' }
    );

    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, isLoading, allConversations.length, isSearchMode, refreshKey]);

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
            {/* Employee Filter (replaces Groups) */}
            {canUseEmployeeFilter && (
              <div 
                className="w-10 h-10 rounded-lg flex items-center justify-center transition-colors cursor-pointer hover:bg-blue-700/60 relative"
                onClick={() => {
                  setShowEmployeeFilterModal(true);
                }}
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

        {/* Bottom spacer */}
        <div className="mt-auto" />
      </div>

      {/* Right: sidebar content */}
      <div className="w-[400px] flex flex-col bg-white overflow-hidden">
        {isSearchMode ? (
          // Search Mode
          <>
            {/* Header */}
            <div className="p-3 border-b border-gray-200">
              <button 
                onClick={() => router.push('/dashboard')}
                className="flex items-center gap-2 mb-3 w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
                title="Quay lại Saletracker"
              >
                <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                <div>
                  <div className="font-medium text-gray-900">Quay lại Saletracker</div>
                  <div className="text-xs text-gray-500">Hệ thống chat</div>
                </div>
              </button>
              
              {/* Search Input */}
              <div className="relative flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    ref={searchInputRef}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const trimmed = searchQuery.trim();
                        const charCount = trimmed.length;
                        if (charCount >= 4) {
                          setIsDebouncing(false);
                          setDebouncedQuery(trimmed);
                        }
                      }
                    }}
                    type="text"
                    placeholder="Tìm kiếm (từ 4 kí tự trở lên)"
                    className="w-full pl-8 pr-10 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <div className="absolute left-2.5 top-2.5 text-gray-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  {isDebouncing && (
                    <div className="absolute right-2.5 top-2.5">
                      <svg className="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    </div>
                  )}
                </div>
                <button
                  className="px-2 py-1 text-sm text-gray-600 hover:text-gray-900"
                  onClick={() => {
                    const trimmed = searchQuery.trim();
                    const charCount = trimmed.length;
                    if (charCount >= 4) {
                      setIsDebouncing(false);
                      setDebouncedQuery(trimmed);
                    }
                  }}
                  title="Tìm ngay"
                >
                  Tìm
                </button>
                 <button
                   className="text-sm text-gray-600 hover:text-gray-900 px-2 py-1"
                   onClick={() => {
                     setIsSearchMode(false);
                     setSearchQuery('');
                     setDebouncedQuery('');
                     setActiveSearchMessageId(null);
                   }}
                 >
                   Đóng
                 </button>
              </div>

              {/* Selected Employees Display */}
              {selectedEmployees.length > 0 && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-blue-900">
                      Đang xem tin nhắn của {selectedEmployees.length} nhân viên:
                    </span>
                    <button
                      onClick={() => {
                        setSelectedEmployeeIds([]);
                        setSelectedEmployees([]);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                    >
                      Xóa tất cả
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {selectedEmployees.map(emp => (
                      <div
                        key={emp.id}
                        className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs border border-blue-200"
                      >
                        <span className="text-gray-700">{emp.name}</span>
                        <button
                          onClick={() => {
                            setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                            setSelectedEmployees(prev => prev.filter(e => e.id !== emp.id));
                          }}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Search Results / Recent */}
            <div className="flex-1 overflow-y-auto">
              {searchQuery.trim().length > 0 && searchQuery.trim().length < 4 ? (
                <div className="p-4">
                  <div className="text-sm text-gray-500 text-center">
                    Nhập từ 4 kí tự trở lên để tìm kiếm
                  </div>
                </div>
              ) : memoizedDebouncedQuery ? (
                <SearchResults
                  query={memoizedDebouncedQuery}
                  userId={targetUserId}
                  selectedEmployeeIds={selectedEmployeeIds}
                  onPickConversation={(conversation) => {
                    // If conversation is already full object from search results
                    if (conversation && typeof conversation === 'object') {
                      // Create a complete conversation object from search result
                      const completeConversation = {
                        id: conversation.id,
                        conversation_name: conversation.conversation_name || conversation.name || `Conversation ${conversation.id}`,
                        conversation_type: conversation.conversation_type || conversation.type || 'private',
                        unread_count: conversation.unread_count || 0,
                        total_messages: conversation.total_messages || 0,
                        last_message_timestamp: conversation.last_message_timestamp || new Date().toISOString(),
                        last_message: conversation.last_message || null,
                        participant: conversation.participant || null,
                        created_at: conversation.created_at || new Date().toISOString(),
                        updated_at: conversation.updated_at || new Date().toISOString(),
                        ...conversation // Include any other fields from search result
                      };
                      
                      onSelectConversation(completeConversation);
                      setIsSearchMode(false);
                      setSearchQuery('');
                      setDebouncedQuery('');
                    } else {
                      // Fallback for ID only (shouldn't happen now)
                      const found = allConversations.find(c => c.id === conversation);
                      if (found) {
                        onSelectConversation(found);
                        setIsSearchMode(false);
                        setSearchQuery('');
                        setDebouncedQuery('');
                      }
                    }
                  }}
                  onSearchMessageClick={onSearchMessageClick}
                  activeSearchMessageId={activeSearchMessageId}
                  setActiveSearchMessageId={setActiveSearchMessageId}
                />
              ) : (
                <div className="p-4">
                  <div className="text-sm font-medium text-gray-700 mb-3">Tìm gần đây</div>
                  <div className="flex flex-col">
                    {conversations.slice(0, 12).map(c => {
                      const isGroup = c.conversation_type === 'group';
                      const avatarUrl = c.participant?.avatar?.replace(/"/g, '');
                      return (
                        <button
                          key={c.id}
                          className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded-lg"
                          onClick={() => {
                            onSelectConversation(c);
                            setIsSearchMode(false);
                            setSearchQuery('');
                            setDebouncedQuery('');
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                              {avatarUrl ? (
                                <img src={avatarUrl} alt={c.conversation_name} className="w-full h-full object-cover" />
                              ) : (
                                isGroup ? (
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                  </svg>
                                ) : (
                                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                  </svg>
                                )
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-gray-900 truncate">
                                {c.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || c.conversation_name}
                              </div>
                              <div className="text-xs text-gray-500 truncate">
                                {c.last_message?.sender_name ? `${c.last_message.sender_name}: ` : ''}
                                {(() => {
                                  try {
                                    if (!c.last_message?.content) return '';
                                    if (typeof c.last_message.content === 'string') {
                                      try {
                                        const parsed = JSON.parse(c.last_message.content);
                                        return String(parsed?.text || parsed?.title || parsed?.description || '');
                                      } catch {
                                        return String(c.last_message.content);
                                      }
                                    }
                                    if (typeof c.last_message.content === 'object' && c.last_message.content !== null) {
                                      const content: any = c.last_message.content;
                                      return String(content?.text || content?.title || content?.description || '');
                                    }
                                    return String(c.last_message.content || '');
                                  } catch {
                                    return '';
                                  }
                                })()}
                              </div>
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Filter Messages */}
                  <div className="mt-6">
                    <div className="text-sm font-medium text-gray-700 mb-2">Lọc tin nhắn</div>
                    <div className="flex gap-2">
                      <button className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors">
                        Nhắc bạn
                      </button>
                      <button className="px-3 py-1.5 bg-white text-gray-700 border border-gray-200 rounded-full text-sm hover:bg-gray-50 transition-colors">
                        Biểu cảm
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          // Normal Mode
          <>
      {/* Header */}
      <div className="p-3 border-b border-gray-200">
        <button 
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 mb-3 w-full text-left hover:bg-gray-50 p-2 rounded-lg transition-colors"
          title="Quay lại Saletracker"
        >
          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          <div>
            <div className="font-medium text-gray-900">Quay lại Saletracker</div>
            <div className="text-xs text-gray-500">Hệ thống chat</div>
          </div>
        </button>
        
        {/* Search */}
        <div className="relative">
          <input 
            type="text" 
            placeholder="Tìm kiếm" 
            className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onFocus={() => setIsSearchMode(true)}
                  onClick={() => setIsSearchMode(true)}
          />
          <div className="absolute left-2.5 top-2.5 text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Selected Employees Display */}
        {selectedEmployees.length > 0 && (
          <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-blue-900">
                Đang xem tin nhắn của {selectedEmployees.length} nhân viên:
              </span>
              <button
                onClick={() => {
                  setSelectedEmployeeIds([]);
                  setSelectedEmployees([]);
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                Xóa tất cả
              </button>
            </div>
            <div className="flex flex-wrap gap-1">
              {selectedEmployees.map(emp => (
                <div
                  key={emp.id}
                  className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-xs border border-blue-200"
                >
                  <span className="text-gray-700">{emp.name}</span>
                  <button
                    onClick={() => {
                      setSelectedEmployeeIds(prev => prev.filter(id => id !== emp.id));
                      setSelectedEmployees(prev => prev.filter(e => e.id !== emp.id));
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
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
                    Chat cá nhân
                  </button>
                  <button 
                    className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
                    onClick={() => {
                      setTypeFilter('group');
                      setShowCategoryDropdown(false);
                      setActiveMinIcon(null); // Deactivate mini icon when using dropdown
                    }}
                  >
                    Chat nhóm
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
          </>
        )}
      </div>

      {/* Employee Filter Modal */}
      <EmployeeFilterModal
        isOpen={showEmployeeFilterModal}
        onClose={() => setShowEmployeeFilterModal(false)}
        onApply={(employeeIds, employees) => {
          setSelectedEmployeeIds(employeeIds);
          setSelectedEmployees(employees);
          setShowEmployeeFilterModal(false);
        }}
        selectedEmployeeIds={selectedEmployeeIds}
        isAdmin={isAdmin}
        isManager={isManager}
        isViewRole={isViewRole}
        managedDepartments={user?.departments?.map(d => d.id) || []}
      />
    </div>
  );
}

// Inline component to render search results using /web/search
function SearchResults({ query, userId, selectedEmployeeIds, onPickConversation, onSearchMessageClick, activeSearchMessageId, setActiveSearchMessageId }: { query: string; userId?: number | undefined; selectedEmployeeIds?: number[]; onPickConversation: (conversation: any) => void; onSearchMessageClick?: (conversationId: number, messageId: number, messagePosition: number, totalMessagesInConversation?: number) => void; activeSearchMessageId: number | null; setActiveSearchMessageId: (id: number | null) => void; }) {
  // State for managing pagination and accumulated results
  const [conversationPage, setConversationPage] = useState(1);
  const [messagePage, setMessagePage] = useState(1);
  const [allConversations, setAllConversations] = useState<any[]>([]);
  const [allMessages, setAllMessages] = useState<any[]>([]);
  
  // Memoize params to prevent unnecessary re-renders
  const params = useMemo(() => {
    if (!query || query.trim().length === 0) return null;
    const charCount = query.trim().length;
    if (charCount < 4) return null;
    
    // Use selectedEmployeeIds if available, otherwise fall back to userId
    let targetUserIds = userId ? [userId] : undefined;
    if (selectedEmployeeIds && selectedEmployeeIds.length > 0) {
      targetUserIds = selectedEmployeeIds;
    }
    
    return { 
      q: query.trim(), 
      user_ids: targetUserIds, 
      type: 'all' as const, 
      limit: 5, // Show 5 results per page
      conversation_page: conversationPage,
      message_page: messagePage
    };
  }, [query, userId, selectedEmployeeIds, conversationPage, messagePage]);
  
  const { data, isLoading, error } = useSearch<any>(params);
  
  // Reset accumulated results only when query changes (not selectedEmployeeIds)
  // params change will trigger useSearch automatically
  useEffect(() => {
    if (query.trim().length >= 4) {
      setAllConversations([]);
      setAllMessages([]);
      setConversationPage(1);
      setMessagePage(1);
    }
  }, [query]);
  
  // Accumulate results when new data comes in
  useEffect(() => {
    if (data?.results) {
      if (data.results.conversations && data.results.conversations.length > 0) {
        setAllConversations(prev => {
          // If it's page 1, replace all. Otherwise append
          if (conversationPage === 1) {
            return data.results.conversations;
          } else {
            // Avoid duplicates by checking IDs
            const existingIds = new Set(prev.map((c: any) => c.id));
            const newConversations = data.results.conversations.filter((c: any) => !existingIds.has(c.id));
            return [...prev, ...newConversations];
          }
        });
      }
      
      if (data.results.messages && data.results.messages.length > 0) {
        setAllMessages(prev => {
          // If it's page 1, replace all. Otherwise append
          if (messagePage === 1) {
            return data.results.messages;
          } else {
            // Avoid duplicates by checking IDs
            const existingIds = new Set(prev.map((m: any) => m.id));
            const newMessages = data.results.messages.filter((m: any) => !existingIds.has(m.id));
            return [...prev, ...newMessages];
          }
        });
      }
    }
  }, [data, conversationPage, messagePage]);

  return (
    <div className="p-4">
      {isLoading && <div className="text-sm text-gray-500">Đang tìm kiếm…</div>}
      {error && <div className="text-xs text-red-500">{error}</div>}

      {allConversations.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-2">Cuộc trò chuyện</div>
          <div className="flex flex-col">
            {allConversations.map((c: any) => (
              <button
                key={c.id}
                className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors rounded-lg"
                onClick={() => onPickConversation(c)}
              >
                <div className="flex items-center gap-3">
                  {/* Avatar */}
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                    {c.participant?.avatar ? (
                      <img 
                        src={c.participant.avatar.replace(/"/g, '')} 
                        alt={c.conversation_name || 'Avatar'} 
                        className="w-8 h-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-xs font-medium">
                        {(c.conversation_name || c.name || 'U').replace(/^(PrivateChat_|privatechat_)/i, '').charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">
                      {String(c.conversation_name || c.name || '').replace(/^(PrivateChat_|privatechat_)/i, '')}
                    </div>
                    {c.last_message?.content && (
                      <div className="text-xs text-gray-500 truncate">
                        {(() => {
                          try {
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
                            
                            // Handle text content
                            let contentStr = '';
                            if (typeof c.last_message.content === 'string') {
                              try {
                                const parsed = JSON.parse(c.last_message.content);
                                contentStr = String(parsed?.text || parsed?.title || parsed?.description || '');
                              } catch {
                                contentStr = String(c.last_message.content);
                              }
                            } else if (typeof c.last_message.content === 'object' && c.last_message.content !== null) {
                              const content: any = c.last_message.content;
                              contentStr = String(content?.text || content?.title || content?.description || '');
                            } else {
                              contentStr = String(c.last_message.content || '');
                            }
                            
                            return contentStr || 'Chưa có tin nhắn';
                          } catch {
                            return 'Tin nhắn không có nội dung';
                          }
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
          {data?.pagination?.conversation_total_pages > conversationPage && (
            <button
              onClick={() => setConversationPage(prev => prev + 1)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tải...' : 'Xem thêm cuộc hội thoại'}
            </button>
          )}
        </div>
      )}

      {allMessages.length > 0 && (
        <div className="mb-6">
          <div className="text-sm font-medium text-gray-700 mb-2">Tin nhắn</div>
          <div className="flex flex-col -mx-4">
            {allMessages.map((m: any) => (
              <button
                key={m.id}
                className={`w-full text-left py-3 transition-colors flex items-start gap-3 ${
                  activeSearchMessageId === m.id 
                    ? 'bg-blue-100' 
                    : 'hover:bg-gray-50 px-4'
                }`}
                onClick={() => {
                  setActiveSearchMessageId(m.id);
                  if (onSearchMessageClick) {
                    // Calculate message position if not provided by search results
                    const messagePosition = m.message_position || 1; // Default to 1 if not provided
                    const totalMessages = m.total_messages_in_conversation || 1000; // Default to 1000 if not provided
                    
                    onSearchMessageClick(m.conversation_id, m.id, messagePosition, totalMessages);
                  }
                }}
              >
                {/* Avatar */}
                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                  {m.sender?.avatar ? (
                    <img 
                      src={m.sender.avatar.replace(/"/g, '')} 
                      alt={m.sender.name || 'Avatar'} 
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-gray-600 text-sm font-medium">
                      {(m.sender?.name || m.conversation?.name || 'U').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {/* Sender/Group Name */}
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {(m.sender?.name || m.conversation?.name || 'Unknown').replace(/"/g, '')}
                  </div>
                  
                  {/* Message Content */}
                  <div className="text-sm text-gray-800 mt-1 overflow-hidden" style={{
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {(() => {
                      try {
                        if (typeof m.content === 'string') {
                          const parsed = JSON.parse(m.content);
                          return String(parsed?.text || parsed?.title || parsed?.description || m.content);
                        }
                        if (typeof m.content === 'object' && m.content) {
                          const content: any = m.content;
                          return String(content?.text || content?.title || content?.description || '');
                        }
                        return String(m.content || '');
                      } catch {
                        return String(m.content || '');
                      }
                    })()}
                  </div>
                  
                  {/* Timestamp */}
                  {m.timestamp && (
                    <div className="text-xs text-gray-400 mt-1">
                      {(() => {
                        const date = new Date(m.timestamp);
                        const now = new Date();
                        const diffMs = now.getTime() - date.getTime();
                        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                        
                        if (diffDays === 0) {
                          return 'Hôm nay';
                        } else if (diffDays === 1) {
                          return 'Hôm qua';
                        } else if (diffDays < 7) {
                          return `${diffDays} ngày`;
                        } else {
                          return date.toLocaleDateString('vi-VN');
                        }
                      })()}
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>
          {data?.pagination?.message_total_pages > messagePage && (
            <button
              onClick={() => setMessagePage(prev => prev + 1)}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800 font-medium mx-4"
              disabled={isLoading}
            >
              {isLoading ? 'Đang tải...' : 'Xem thêm tin nhắn'}
            </button>
          )}
        </div>
      )}

    </div>
  );
}
