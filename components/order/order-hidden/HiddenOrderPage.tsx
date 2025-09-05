"use client";

import { Suspense, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useHiddenOrders } from "@/hooks/useHiddenOrders";
import { AlertType, ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import HiddenOrderManagement from "./HiddenOrderDetailTable";

interface AlertState {
  type: AlertType;
  message: string;
  show: boolean;
}

export default function HiddenOrderPage() {
  const hiddenOrdersHook = useHiddenOrders();
  const [alert, setAlert] = useState<AlertState>({ type: "info", message: "", show: false });

  const showAlert = (type: AlertType, message: string) => {
    setAlert({ type, message, show: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  const handleReload = async () => {
    try {
      // Only refresh data using existing filters; do not show a success toast to keep UI minimal
      await hiddenOrdersHook.refreshData();
    } catch (error) {
      // Only surface errors
      showAlert("error", "Lỗi khi làm mới dữ liệu");
    }
  };

  // ✅ THÊM: Handle reset filter with localStorage clear
  const handleResetFilter = async () => {
    try {
      hiddenOrdersHook.resetFilters();
      showAlert("success", "Đã xóa tất cả bộ lọc và làm mới dữ liệu");
    } catch (error) {
      showAlert("error", "Lỗi khi xóa bộ lọc");
    }
  };

  return (
    <>
      {/* Server Response Alert */}
      {alert.show && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
        />
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            👻 Quản lý đơn hàng đã ẩn
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleReload}
              disabled={hiddenOrdersHook.loading}
              title="Làm mới dữ liệu (giữ nguyên bộ lọc)"
            >
              {hiddenOrdersHook.loading ? "⏳" : "🔄"} Làm mới
            </Button>
            {/* ✅ THÊM: Reset Filter Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetFilter}
              disabled={hiddenOrdersHook.loading}
              title="Xóa tất cả bộ lọc và làm mới dữ liệu"
            >
              🧹 Xóa Bộ Lọc
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Đang tải...</div>}>
            <HiddenOrderManagement
              {...hiddenOrdersHook}
              isRestoring={hiddenOrdersHook.isRestoring}
              resetKey={hiddenOrdersHook.resetKey}
              onAlert={showAlert}
            />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
