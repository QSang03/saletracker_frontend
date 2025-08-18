"use client";
import React, { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ReorderProductsDialogProps {
  open: boolean;
  keyword: string;
  productIds: number[]; // initial order
  onClose: () => void;
  onSubmit: (ordered: number[]) => Promise<void> | void;
}

export default function ReorderProductsDialog({ open, keyword, productIds, onClose, onSubmit }: ReorderProductsDialogProps) {
  const [order, setOrder] = useState<number[]>([]);

  useEffect(() => { setOrder(productIds); }, [productIds, open]);

  const move = (idx: number, dir: -1 | 1) => {
    setOrder((prev) => {
      const next = [...prev];
      const ni = idx + dir;
      if (ni < 0 || ni >= next.length) return prev;
      const tmp = next[idx];
      next[idx] = next[ni];
      next[ni] = tmp;
      return next;
    });
  };

  const removeAt = (idx: number) => {
    setOrder((prev) => prev.filter((_, i) => i !== idx));
  };

  const reset = () => setOrder(productIds);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle>Ưu tiên sản phẩm cho "{keyword}"</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {order.length === 0 ? (
            <div className="text-sm text-gray-500">Chưa có sản phẩm trong keyword này.</div>
          ) : (
            <ul className="space-y-1">
              {order.map((pid, idx) => (
                <li key={pid} className="flex items-center gap-2 bg-gray-50 rounded-md border px-2 py-1">
                  <div className="text-xs font-mono text-gray-700">#{idx + 1}</div>
                  <div className="text-sm font-medium">Product ID: {pid}</div>
                  <div className="ml-auto flex items-center gap-1">
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => move(idx, -1)} disabled={idx === 0}>Lên</Button>
                    <Button variant="outline" size="sm" className="h-7 px-2" onClick={() => move(idx, 1)} disabled={idx === order.length - 1}>Xuống</Button>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-red-600" onClick={() => removeAt(idx)}>Bỏ</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <DialogFooter>
          <div className="flex w-full justify-between">
            <Button variant="outline" onClick={reset}>Hoàn tác</Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>Đóng</Button>
              <Button onClick={async () => { await onSubmit(order); onClose(); }}>Lưu ưu tiên</Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
