"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

export default function DebtTrashedPage() {
  // Check permissions for debt trash access
  const { 
    canReadDepartment, 
    user 
  } = useDynamicPermission();

  // Check if user has read access to debt department
  const canAccessDebtTrash = canReadDepartment('cong-no');

  // Loading state for permissions
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  // Access denied state
  if (!canAccessDebtTrash) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">Không có quyền truy cập</div>
        <div className="text-gray-600">Bạn không có quyền xem thùng rác công nợ</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Thùng rác công nợ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Trang thùng rác công nợ đang phát triển...</p>
        </CardContent>
      </Card>
    </div>
  );
}