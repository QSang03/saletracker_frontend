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

  return (
    <>
      {/* Server Response Alert */}
      {alert.show && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={hideAlert}
          className="fixed top-4 right-4 z-50 max-w-md shadow-lg"
        />
      )}

      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle className="text-xl font-semibold text-gray-800 flex items-center gap-2">
            👻 Quản lý đơn hàng đã ẩn
          </CardTitle>
          <Button
            onClick={handleReload}
            variant="outline"
            className="flex items-center gap-2"
            disabled={hiddenOrdersHook.loading}
          >
            {hiddenOrdersHook.loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            ) : (
              "🔄"
            )}
            Làm mới
          </Button>
        </CardHeader>
        
        <CardContent>
          <Suspense fallback={
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2">Đang tải...</span>
            </div>
          }>
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
