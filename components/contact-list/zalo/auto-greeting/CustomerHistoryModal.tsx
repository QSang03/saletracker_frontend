"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { 
  History, 
  Clock, 
  MessageSquare, 
  Sparkles, 
  Zap, 
  Star, 
  X,
  User,
  Calendar,
  MessageCircle
} from "lucide-react";
import { getAccessToken } from "@/lib/auth";

type HistoryItem = {
  id: number;
  customer_id: number;
  message: string;
  created_at: string;
};

export default function CustomerHistoryModal({
  customerId,
  open,
  onClose,
}: {
  customerId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    
    const token = getAccessToken();
    fetch(`/api/auto-greeting/customers/${customerId}/message-history`, {
      headers: {
        ...(token && { 'Authorization': `Bearer ${token}` }),
      },
    })
      .then((r) => r.json())
      .then((data) => {
        setItems(Array.isArray(data) ? data : []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, customerId]);

  const handleClose = () => {
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="!max-w-[40vw] !max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal" style={{ msOverflowStyle: 'none', scrollbarWidth: 'none' }}>
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>
        
        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-blue-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-indigo-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-purple-300 animate-ping"
            style={{ animationDelay: "1s" }}
          >
            <Star className="w-2 h-2 opacity-30" />
          </div>
          <div
            className="absolute bottom-12 right-6 text-blue-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
          <div
            className="absolute top-1/2 left-4 text-indigo-200 animate-bounce"
            style={{ animationDelay: "2s" }}
          >
            <MessageCircle className="w-3 h-3 opacity-40" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-blue-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* History icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div
                    className="absolute inset-0 bg-purple-400 rounded-full animate-ping opacity-10"
                    style={{ animationDelay: "1s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <History className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                📜 Lịch sử tin nhắn khách hàng
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Xem lại toàn bộ lịch sử tin nhắn đã gửi cho khách hàng
                <br />
                <span className="text-blue-500 font-bold text-sm">
                  💬 Tổng cộng: {items.length} tin nhắn
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* Messages list */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-white p-4 rounded-2xl border-2 border-blue-200 shadow-inner max-h-[50vh] overflow-y-auto">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="relative">
                        <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                        <div
                          className="absolute inset-2 w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
                          style={{ animationDirection: "reverse" }}
                        ></div>
                      </div>
                      <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mt-4">
                        Đang tải lịch sử...
                      </p>
                    </div>
                  ) : items.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="relative mb-6">
                        <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center mx-auto">
                          <MessageSquare className="w-10 h-10 text-gray-400" />
                        </div>
                        <div className="absolute -top-2 -right-2 w-6 h-6 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-full flex items-center justify-center">
                          <X className="w-3 h-3 text-white" />
                        </div>
                      </div>
                      <p className="text-gray-500 text-lg font-medium">Không có lịch sử tin nhắn</p>
                      <p className="text-gray-400 text-sm mt-2">Chưa có tin nhắn nào được gửi cho khách hàng này</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {items.map((item, index) => (
                        <div key={item.id} className="group relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl blur opacity-0 group-hover:opacity-50 transition-opacity duration-300"></div>
                          <div className="relative bg-white rounded-xl p-4 border border-blue-100 shadow-sm group-hover:shadow-md transition-all duration-300">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                                <MessageCircle className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <Clock className="h-4 w-4" />
                                  <span className="font-medium">
                                    {new Date(item.created_at).toLocaleString('vi-VN')}
                                  </span>
                                </div>
                                <div className="text-xs text-gray-400 mt-1">
                                  Tin nhắn #{index + 1}
                                </div>
                              </div>
                            </div>
                            <div className="text-gray-800 leading-relaxed bg-gray-50 rounded-lg p-3 border-l-4 border-blue-400">
                              {item.message}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Action buttons with stunning effects */}
            <div className="flex justify-end gap-4 p-8 pt-0">
              {/* Close Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={loading}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out min-w-[120px]"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Đóng</span>
                </span>
              </Button>
            </div>

            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Đang tải lịch sử tin nhắn...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
