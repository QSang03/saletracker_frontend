"use client";
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

export default function OrderSettingsPage() {
  const PAGE_SIZE_KEY = "orderConfigPageSize";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PAGE_SIZE_KEY);
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [alert, setAlert] = useState<{ type: any; message: string } | null>(null);
  const { canReadDepartment, user } = useDynamicPermission();
  const canAccessOrderSettings = canReadDepartment("giao-dich");

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  if (!canAccessOrderSettings) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">Không có quyền truy cập</div>
        <div className="text-gray-600">Bạn không có quyền cấu hình đơn hàng</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Cấu hình đơn hàng
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Trang cấu hình đơn hàng đang phát triển...</p>
        </CardContent>
      </Card>
    </div>
  );
}
