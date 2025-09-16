"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { History, Clock, MessageSquare } from "lucide-react";
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

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Lịch sử tin nhắn khách hàng
          </DialogTitle>
        </DialogHeader>
        
        <div className="mt-4 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600">Đang tải lịch sử...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-8">
              <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">Không có lịch sử tin nhắn</p>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="bg-gray-50 rounded-lg p-4 border">
                  <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
                    <Clock className="h-4 w-4" />
                    {new Date(item.created_at).toLocaleString('vi-VN')}
                  </div>
                  <div className="text-gray-800">{item.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="mt-6 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            Đóng
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
