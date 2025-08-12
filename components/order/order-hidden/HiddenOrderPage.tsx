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

  const handleReload = () => {
    hiddenOrdersHook.refreshData();
    showAlert("info", "Đã làm mới dữ liệu thành công");
  };

  // ✅ THÊM: Handle reset filter with localStorage clear
  const handleResetFilter = () => {
    hiddenOrdersHook.resetFilters();
    showAlert("info", "Đã xóa tất cả filter và làm mới dữ liệu");
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
            >
              {hiddenOrdersHook.loading ? (
                "🔄"
              ) : (
                "🔄"
              )}
              Làm mới
            </Button>
            {/* ✅ THÊM: Reset Filter Button */}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetFilter}
              disabled={hiddenOrdersHook.loading}
            >
              🗑️ Xóa Filter
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<div>Đang tải...</div>}>
            <HiddenOrderManagement
              {...hiddenOrdersHook}
              onAlert={showAlert}
            />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
