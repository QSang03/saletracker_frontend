"use client";


import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import OrderTrashedManagement from "@/components/order/order-trashed/OrderTrashedManagement";
import { getAccessToken } from "@/lib/auth";

export default function OrderTrashedPage() {
  const { canReadDepartment, user } = useDynamicPermission();
  const canAccessOrderTrash = canReadDepartment('giao-dich');

  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  const fetchOrders = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/trashed?page=${page}&pageSize=${pageSize}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error("Không thể tải danh sách đơn hàng đã xóa");
      const result = await res.json();
      setOrders(result.data || []);
      setTotal(result.total || 0);
    } catch (err: any) {
      setError(err.message || "Lỗi không xác định");
    } finally {
      setIsLoading(false);
    }
  }, [page, pageSize]);

  useEffect(() => {
    if (user && canAccessOrderTrash) fetchOrders();
  }, [user, canAccessOrderTrash, fetchOrders]);

  const handleRestore = async (order: any) => {
    const token = getAccessToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}/restore`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    fetchOrders();
  };

  const handleDelete = async (order: any) => {
    const token = getAccessToken();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${order.id}/permanent`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    fetchOrders();
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  if (!canAccessOrderTrash) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">Không có quyền truy cập</div>
        <div className="text-gray-600">Bạn không có quyền xem thùng rác đơn hàng</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Thùng rác đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          {error && <div className="text-red-600 mb-2">{error}</div>}
          {isLoading ? (
            <div className="flex justify-center items-center h-32">
              <LoadingSpinner size={32} />
              <span className="ml-2">Đang tải dữ liệu...</span>
            </div>
          ) : (
            <OrderTrashedManagement
              orders={orders}
              expectedRowCount={pageSize}
              startIndex={(page - 1) * pageSize}
              onReload={fetchOrders}
              onRestore={handleRestore}
              onDelete={handleDelete}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
