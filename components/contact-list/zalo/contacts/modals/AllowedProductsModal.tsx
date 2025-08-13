"use client";
import React, { useEffect, useState } from 'react';
// We need the full product list here; fetch directly instead of using paginated hook
import { api } from '@/lib/api';
import { useContactAllowedProducts } from '@/hooks/contact-list/useContactAllowedProducts';
import { useCurrentUser } from '@/contexts/CurrentUserContext';
import type { AutoReplyProduct } from '@/types/auto-reply';

export default function AllowedProductsModal({ open, onClose, contactId }: { open: boolean; onClose: () => void; contactId: number; }) {
  const [products, setProducts] = useState<AutoReplyProduct[]>([]);
  const { items, patchBulk, fetchAll } = useContactAllowedProducts(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const [selected, setSelected] = useState<Set<number>>(new Set());

  useEffect(() => { 
    if (open) {
      fetchAll();
      // fetch all products (non-paginated endpoint)
      api.get<AutoReplyProduct[]>(`auto-reply/products`).then(({ data }) => setProducts(data || [])).catch(() => setProducts([]));
    }
  }, [open, fetchAll]);
  useEffect(() => {
    const on = new Set(items.filter(i => i.active).map(i => i.productId));
    setSelected(on);
  }, [items]);

  const toggle = (id: number) => {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  };

  const save = async () => {
    if (zaloDisabled) return;
    const ids = Array.from(selected);
    await patchBulk(ids, true);
    // Optionally, turn off others (not in selected)
  const offIds = products.map(p => p.productId).filter(id => !selected.has(id));
    if (offIds.length) await patchBulk(offIds, false);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-md shadow-lg w-full max-w-3xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Sản phẩm được bán</h3>
          <button onClick={onClose}>×</button>
        </div>
        <div className="h-96 overflow-auto border rounded">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2">Chọn</th>
                <th className="px-3 py-2 text-left">Mã</th>
                <th className="px-3 py-2 text-left">Tên</th>
                <th className="px-3 py-2 text-left">Thương hiệu</th>
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.productId} className="border-t">
                  <td className="px-3 py-2 text-center">
                    <input type="checkbox" disabled={zaloDisabled} checked={selected.has(p.productId)} onChange={() => toggle(p.productId)} />
                  </td>
                  <td className="px-3 py-2">{p.code}</td>
                  <td className="px-3 py-2">{p.name}</td>
                  <td className="px-3 py-2">{p.brand}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 flex justify-end gap-2">
          <button onClick={onClose} className="px-3 py-2 border rounded">Đóng</button>
          <button disabled={zaloDisabled} onClick={save} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Lưu</button>
        </div>
      </div>
    </div>
  );
}
