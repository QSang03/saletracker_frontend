"use client";
import React, { useEffect } from 'react';
import { useLogs } from '@/hooks/contact-list/useLogs';
import { MessageCircleIcon, ClockIcon, UserIcon, XIcon } from 'lucide-react';

export default function LogsDrawer({ 
  open, 
  onClose, 
  contactId 
}: { 
  open: boolean; 
  onClose: () => void; 
  contactId: number | null; 
}) {
  const { conversation, messages, fetchConversation, fetchMessages } = useLogs(contactId);
  
  useEffect(() => { 
    if (open) fetchConversation(); 
  }, [open, fetchConversation]);

  // Handle ESC key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onClose();
      }
    };

    if (open) {
      document.addEventListener('keydown', handleEscape);
      // Prevent body scroll when drawer is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />
      
      {/* Drawer */}
      <div 
        className={`fixed right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
        style={{ zIndex: 51 }}
      >
        {/* Header */}
        <div className="p-6 pb-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/30">
                <MessageCircleIcon className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Logs chi tiết
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Contact ID: {contactId || 'N/A'}
                </p>
              </div>
            </div>
            
            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              <XIcon className="w-5 h-5 text-gray-500 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 h-[calc(100vh-140px)]">
          {/* Conversation Status */}
          {conversation ? (
            <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <div className="flex items-start space-x-3">
                <div className="p-1.5 rounded-full bg-white dark:bg-gray-800 shadow-sm">
                  <UserIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-4 text-sm">
                    <span className="font-medium text-gray-900 dark:text-white">
                      Trạng thái: <span className="text-blue-600 dark:text-blue-400">{conversation.state}</span>
                    </span>
                    <span className="text-gray-600 dark:text-gray-300">•</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      Follow-up: <span className="text-green-600 dark:text-green-400">{conversation.followupStage}</span>
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                <span>Không có hội thoại</span>
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="space-y-3">
            <div className="flex items-center space-x-2 mb-4">
              <ClockIcon className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <h4 className="font-semibold text-gray-900 dark:text-white">
                Tin Nhắn ({messages?.length || 0})
              </h4>
            </div>

            {!messages || messages.length === 0 ? (
              <div className="text-center py-12">
                <MessageCircleIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                <p className="text-gray-600 dark:text-gray-400">Chưa có tin nhắn nào</p>
              </div>
            ) : (
              messages.map((m, index) => (
                <div 
                  key={`${m.msgId || index}`}
                  className="group border border-gray-200 dark:border-gray-700 rounded-lg px-4 py-3 bg-white dark:bg-gray-800 hover:shadow-md hover:border-blue-300 dark:hover:border-blue-600 transition-all duration-200"
                >
                  {/* Message Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        m.role === 'user' ? 'bg-blue-400' : 'bg-green-400'
                      }`}></div>
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                        {m.role}
                      </span>
                    </div>
                    <time className="text-xs text-gray-500 dark:text-gray-400 flex items-center">
                      <ClockIcon className="w-3 h-3 mr-1" />
                      {new Date(m.createdAt).toLocaleString('vi-VN')}
                    </time>
                  </div>

                  {/* Message Content */}
                  <div className="text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                    {m.textContent}
                  </div>

                  {/* Message Number Badge */}
                  <div className="flex justify-end mt-2">
                    <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full">
                      #{index + 1}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/80">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
              <span>Cập nhật: {new Date().toLocaleTimeString('vi-VN')}</span>
            </span>
            <span>{messages?.length || 0} tin nhắn</span>
          </div>
        </div>
      </div>
    </div>
  );
}
