"use client";
import React, { useEffect, useRef, useState } from 'react';
import { useLogs } from '@/hooks/contact-list/useLogs';
import { 
  MessageCircleIcon, 
  ClockIcon, 
  UserIcon, 
  XIcon, 
  CopyIcon,
  CheckIcon,
  SendIcon,
  BotIcon,
  SparklesIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from 'lucide-react';

export default function LogsDrawer({ 
  open, 
  onClose, 
  contactId 
}: { 
  open: boolean; 
  onClose: () => void; 
  contactId: number | null; 
}) {
  const { conversation, messages, loading, fetchConversation, fetchMessages } = useLogs(contactId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [messagesVisible, setMessagesVisible] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  
  useEffect(() => { 
    if (open) {
      fetchConversation();
      setCurrentPage(1); // Reset to first page when opening
      setTimeout(() => setMessagesVisible(true), 300);
    } else {
      setMessagesVisible(false);
    }
  }, [open, fetchConversation]);

  // Fixed auto-scroll - chỉ scroll khi có tin nhắn mới
  useEffect(() => {
    if (messages?.length && scrollRef.current && open) {
      const scrollElement = scrollRef.current;
      // Đợi DOM render xong
      setTimeout(() => {
        scrollElement.scrollTop = scrollElement.scrollHeight;
      }, 100);
    }
  }, [messages, open]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  const copyMessage = async (text: string, messageId: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(messageId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Calculate pagination
  const totalMessages = messages?.length || 0;
  const totalPages = Math.ceil(totalMessages / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const currentMessages = messages?.slice(startIndex, endIndex) || [];

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Scroll to top when changing page
    if (scrollRef.current) {
      scrollRef.current.scrollTop = 0;
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex overflow-hidden">
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-md transition-opacity duration-300 ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={onClose}
      />
      
      {/* Drawer - Fixed dimensions */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-2xl bg-white dark:bg-gray-900 shadow-2xl border-l border-gray-200 dark:border-gray-700 transition-transform duration-300 ease-out overflow-hidden ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 51 }}
      >
        {/* Header - Fixed height */}
        <div className="flex-shrink-0 h-20 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative flex-shrink-0">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-500 shadow-lg">
                  <MessageCircleIcon className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full border-2 border-white dark:border-gray-900" />
              </div>
              
              <div className="min-w-0">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
                  Logs Chi Tiết
                </h2>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="flex items-center space-x-1 px-2 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
                    <SparklesIcon className="w-3 h-3 text-blue-500 flex-shrink-0" />
                    <span className="text-xs font-medium text-blue-700 dark:text-blue-300">
                      ID: {contactId || 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="flex-shrink-0 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-500 hover:text-red-500 transition-colors" />
            </button>
          </div>
        </div>

        {/* Content Area - Fixed dimensions */}
        <div 
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden h-[calc(100vh-140px)]"
          style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#cbd5e1 transparent'
          }}
        >
          <div className="px-6 py-4 space-y-4 min-h-full">
            {/* Loading State */}
            {loading && (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="animate-pulse">
                    <div className="flex items-start space-x-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-800">
                      <div className="w-10 h-10 bg-gray-200 dark:bg-gray-600 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2 min-w-0">
                        <div className="h-4 bg-gray-200 dark:bg-gray-600 rounded w-3/4" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-600 rounded w-1/2" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Conversation Status */}
            {!loading && conversation && (
              <div className="overflow-hidden rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800">
                <div className="p-4">
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-sm">
                      <UserIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Trạng Thái
                          </p>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
                            <span className="font-semibold text-blue-600 dark:text-blue-400 truncate">
                              {conversation.state}
                            </span>
                          </div>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                            Follow-up
                          </p>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" />
                            <span className="font-semibold text-green-600 dark:text-green-400 truncate">
                              {conversation.followupStage}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Messages Section */}
            {!loading && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-gradient-to-r from-green-500 to-blue-500">
                      <ClockIcon className="w-4 h-4 text-white" />
                    </div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                      Tin Nhắn
                    </h4>
                    <div className="px-3 py-1 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium">
                      {totalMessages}
                    </div>
                  </div>
                </div>

                {!messages || messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full mx-auto flex items-center justify-center mb-4">
                      <MessageCircleIcon className="w-10 h-10 text-gray-400 dark:text-gray-500" />
                    </div>
                    <p className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Chưa có tin nhắn nào
                    </p>
                    <p className="text-sm text-gray-500 dark:text-gray-500">
                      Tin nhắn sẽ xuất hiện ở đây khi có cuộc trò chuyện
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 overflow-hidden">
                    {currentMessages.map((m, index) => (
                      <div 
                        key={`${m.msgId || index}`}
                        className="group w-full overflow-hidden"
                      >
                        <div className={`relative rounded-xl border transition-all duration-200 hover:shadow-lg ${
                          m.role === 'user'
                            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-700 ml-4'
                            : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700 mr-4'
                        }`}>
                          
                          {/* Message Header */}
                          <div className="flex items-center justify-between p-4 pb-2">
                            <div className="flex items-center space-x-3 min-w-0 flex-1">
                              <div className={`flex-shrink-0 p-2 rounded-lg shadow-sm ${
                                m.role === 'user'
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-green-500 text-white'
                              }`}>
                                {m.role === 'user' ? (
                                  <UserIcon className="w-4 h-4" />
                                ) : (
                                  <BotIcon className="w-4 h-4" />
                                )}
                              </div>
                              <div className="min-w-0 flex-1">
                                <span className="text-sm font-bold text-gray-900 dark:text-white block truncate">
                                  {m.role === 'user' ? 'Người dùng' : 'AI Assistant'}
                                </span>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(m.createdAt).toLocaleString('vi-VN')}
                                </p>
                              </div>
                            </div>
                            
                            <div className="flex items-center space-x-2 flex-shrink-0">
                              <button
                                onClick={() => copyMessage(m.textContent, `${m.msgId || index}`)}
                                className={`p-2 rounded-lg transition-colors ${
                                  copiedId === `${m.msgId || index}`
                                    ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                                    : 'opacity-0 group-hover:opacity-100 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                                }`}
                              >
                                {copiedId === `${m.msgId || index}` ? (
                                  <CheckIcon className="w-4 h-4" />
                                ) : (
                                  <CopyIcon className="w-4 h-4" />
                                )}
                              </button>
                              <div className="text-xs bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full font-medium">
                                #{startIndex + index + 1}
                              </div>
                            </div>
                          </div>

                          {/* Message Content */}
                          <div className="px-4 pb-4">
                            <div className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap break-words">
                              {m.textContent}
                            </div>
                          </div>

                          <div className={`absolute top-0 left-0 w-full h-1 ${
                            m.role === 'user'
                              ? 'bg-blue-500'
                              : 'bg-green-500'
                          }`} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Trang {currentPage} / {totalPages}
                      </span>
                      <span className="text-gray-400">•</span>
                      <span>
                        Hiển thị {startIndex + 1}-{Math.min(endIndex, totalMessages)} / {totalMessages} tin nhắn
                      </span>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                        <span>Trước</span>
                      </button>
                      
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => handlePageChange(pageNum)}
                              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : 'text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="flex items-center space-x-1 px-3 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <span>Sau</span>
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer - Fixed height */}
        <div className="flex-shrink-0 h-16 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <div className="h-full px-6 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                Cập nhật: {new Date().toLocaleTimeString('vi-VN')}
              </span>
            </div>
            <div className="flex items-center space-x-2 px-3 py-1 bg-blue-100 dark:bg-blue-900/30 rounded-full">
              <SendIcon className="w-3 h-3 text-blue-600 dark:text-blue-400" />
              <span className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                {totalMessages} tin nhắn
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
