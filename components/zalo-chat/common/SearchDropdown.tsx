"use client";

import React, { useEffect, useRef, useState } from 'react';
import { useSearch, SearchType } from '@/hooks/zalo-chat/useSearch';
import { useDebounce } from '@/hooks/useDebounce';

interface SearchDropdownProps {
  userId: number;
  onSelectConversation?: (conversation: any) => void;
  onSelectMessage?: (message: any, conversation: any) => void;
}

interface SearchResult {
  conversations?: any[];
  messages?: any[];
  contacts?: any[];
  files?: any[];
}

export default function SearchDropdown({ userId, onSelectConversation, onSelectMessage }: SearchDropdownProps) {
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SearchType>('all');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebounce(query, 300);
  
  const { data, isLoading, error } = useSearch(
    debouncedQuery.trim() ? {
      q: debouncedQuery,
      user_id: userId,
      type: activeTab,
      limit: 20
    } : null
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Open dropdown when there's a query
  useEffect(() => {
    if (debouncedQuery.trim()) {
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  }, [debouncedQuery]);

  const handleSelectResult = (item: any, type: string) => {
    if (type === 'conversation' && onSelectConversation) {
      onSelectConversation(item);
    } else if (type === 'message' && onSelectMessage) {
      onSelectMessage(item, item.conversation);
    }
    setQuery('');
    setIsOpen(false);
  };

  const searchResults = data as SearchResult;
  const hasResults = searchResults && (
    (searchResults.conversations?.length || 0) > 0 ||
    (searchResults.messages?.length || 0) > 0 ||
    (searchResults.contacts?.length || 0) > 0 ||
    (searchResults.files?.length || 0) > 0
  );

  const tabs = [
    { id: 'all', label: 'Tất cả' },
    { id: 'conversations', label: 'Cuộc trò chuyện' },
    { id: 'messages', label: 'Tin nhắn' },
    { id: 'contacts', label: 'Liên hệ' },
    { id: 'files', label: 'Tệp' }
  ];

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tìm kiếm"
          className="w-full pl-8 pr-3 py-2 text-sm bg-gray-100 rounded-lg border-0 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div className="absolute left-2.5 top-2.5 text-gray-400">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {/* Search Results Dropdown */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 max-h-[70vh] overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as SearchType)}
                className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === tab.id
                    ? 'text-blue-600 border-b-2 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Results Content */}
          <div className="overflow-y-auto max-h-[calc(70vh-45px)]">
            {isLoading ? (
              <div className="p-8 text-center">
                <div className="inline-flex items-center gap-2 text-sm text-gray-500">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Đang tìm kiếm...
                </div>
              </div>
            ) : error ? (
              <div className="p-4 text-center text-sm text-red-500">
                {error}
              </div>
            ) : !hasResults ? (
              <div className="p-8 text-center">
                <div className="text-sm text-gray-500">Không tìm thấy kết quả</div>
                <div className="text-xs text-gray-400 mt-1">Thử tìm kiếm với từ khóa khác</div>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {/* Conversations */}
                {(activeTab === 'all' || activeTab === 'conversations') && searchResults.conversations?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Cuộc trò chuyện</div>
                    {searchResults.conversations.map((conv: any) => (
                      <button
                        key={conv.id}
                        onClick={() => handleSelectResult(conv, 'conversation')}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {conv.participant?.avatar ? (
                            <img 
                              src={conv.participant.avatar.replace(/"/g, '')} 
                              alt={conv.conversation_name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm text-gray-900">
                            {conv.conversation_name?.replace(/^(PrivateChat_|privatechat_)/i, '') || conv.conversation_name}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {conv.last_message?.content || 'Chưa có tin nhắn'}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Messages */}
                {(activeTab === 'all' || activeTab === 'messages') && searchResults.messages?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Tin nhắn</div>
                    {searchResults.messages.map((msg: any) => (
                      <button
                        key={msg.id}
                        onClick={() => handleSelectResult(msg, 'message')}
                        className="w-full flex items-start gap-3 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-baseline gap-2">
                            <span className="font-medium text-sm text-gray-900">{msg.sender_name}</span>
                            <span className="text-xs text-gray-500">
                              {new Date(msg.created_at).toLocaleString('vi-VN', {
                                hour: '2-digit',
                                minute: '2-digit',
                                day: '2-digit',
                                month: '2-digit'
                              })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-700 mt-0.5">
                            {typeof msg.content === 'string' ? msg.content : msg.content?.text || 'Tin nhắn'}
                          </div>
                          {msg.conversation && (
                            <div className="text-xs text-gray-500 mt-0.5">
                              trong {msg.conversation.conversation_name}
                            </div>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Contacts */}
                {(activeTab === 'all' || activeTab === 'contacts') && searchResults.contacts?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Liên hệ</div>
                    {searchResults.contacts.map((contact: any) => (
                      <button
                        key={contact.id}
                        onClick={() => handleSelectResult(contact, 'contact')}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          {contact.avatar ? (
                            <img 
                              src={contact.avatar.replace(/"/g, '')} 
                              alt={contact.name}
                              className="w-full h-full object-cover rounded-full"
                            />
                          ) : (
                            <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm text-gray-900">{contact.name}</div>
                          <div className="text-xs text-gray-500">{contact.phone || contact.email || 'Liên hệ'}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* Files */}
                {(activeTab === 'all' || activeTab === 'files') && searchResults.files?.length > 0 && (
                  <div className="p-2">
                    <div className="text-xs font-medium text-gray-500 uppercase px-2 py-1">Tệp</div>
                    {searchResults.files.map((file: any) => (
                      <button
                        key={file.id}
                        onClick={() => handleSelectResult(file, 'file')}
                        className="w-full flex items-center gap-3 px-2 py-2 hover:bg-gray-50 rounded-md transition-colors"
                      >
                        <div className="w-8 h-8 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 text-left">
                          <div className="font-medium text-sm text-gray-900">{file.name}</div>
                          <div className="text-xs text-gray-500">
                            {file.size && `${(file.size / 1024 / 1024).toFixed(2)} MB`}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}