"use client";
import React, { useEffect, useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

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
  customerId: number | null;
  open: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!open || !customerId) return;
    setLoading(true);
    fetch(`/api/customers/${customerId}/message-history`)
      .then((r) => r.json())
      .then((data) => {
        setItems(data || []);
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }, [open, customerId]);

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <div className="p-4">
        <h3 className="text-lg font-semibold">Lịch sử tin nhắn khách hàng</h3>
        <div className="mt-3">
          {loading ? (
            <div>Đang tải...</div>
          ) : items.length === 0 ? (
            <div className="text-sm text-muted-foreground">Không có lịch sử</div>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-auto">
              {items.map((it) => (
                <li key={it.id} className="p-2 border rounded">
                  <div className="text-sm text-muted-foreground">{new Date(it.created_at).toLocaleString()}</div>
                  <div className="mt-1">{it.message}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="mt-4 text-right">
          <Button variant="ghost" onClick={onClose}>Đóng</Button>
        </div>
      </div>
    </Dialog>
  );
}
