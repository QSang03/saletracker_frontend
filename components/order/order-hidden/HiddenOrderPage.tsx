"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
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

  // ✅ Thêm state để lưu vị trí scroll và page
  const [preservedState, setPreservedState] = useState<{
    scrollPosition: number;
    currentPage: number;
  } | null>(null);

  const showAlert = (type: AlertType, message: string) => {
    setAlert({ type, message, show: true });
  };

  const hideAlert = () => {
    setAlert(prev => ({ ...prev, show: false }));
  };

  // ✅ Helper functions để lưu và khôi phục vị trí
  const saveCurrentPosition = useCallback(() => {
    const scrollPosition = window.scrollY || document.documentElement.scrollTop;
    setPreservedState({
      scrollPosition,
      currentPage: hiddenOrdersHook.filters.page,
    });
  }, [hiddenOrdersHook.filters.page]);

  const restorePosition = useCallback(() => {
    if (preservedState) {
      // Khôi phục page trước
      if (preservedState.currentPage !== hiddenOrdersHook.filters.page) {
        hiddenOrdersHook.updateFilters({ page: preservedState.currentPage });
      }
      
      // Khôi phục scroll position sau khi data đã load
      setTimeout(() => {
        window.scrollTo(0, preservedState.scrollPosition);
        setPreservedState(null);
      }, 100);
    }
  }, [preservedState, hiddenOrdersHook.filters.page, hiddenOrdersHook.updateFilters]);

  const handleReload = async () => {
    try {
      // Only refresh data using existing filters; do not show a success toast to keep UI minimal
      await hiddenOrdersHook.refreshData();
    } catch (error) {
      // Only surface errors
      showAlert("error", "Lỗi khi làm mới dữ liệu");
    }
  };

  // ✅ Wrapper functions để lưu vị trí trước khi thực hiện thao tác
  const handleBulkUnhide = useCallback(async () => {
    saveCurrentPosition();
    const result = await hiddenOrdersHook.bulkUnhide();
    if (result.success) {
      showAlert("success", result.message);
    } else {
      showAlert("error", result.message);
    }
    return result;
  }, [hiddenOrdersHook.bulkUnhide, saveCurrentPosition]);

  const handleSingleUnhide = useCallback(async (id: number) => {
    saveCurrentPosition();
    const result = await hiddenOrdersHook.singleUnhide(id);
    if (result.success) {
      showAlert("success", result.message);
    } else {
      showAlert("error", result.message);
    }
    return result;
  }, [hiddenOrdersHook.singleUnhide, saveCurrentPosition]);

  const handleBulkSoftDelete = useCallback(async () => {
    saveCurrentPosition();
    const result = await hiddenOrdersHook.bulkSoftDelete();
    if (result.success) {
      showAlert("success", result.message);
    } else {
      showAlert("error", result.message);
    }
    return result;
  }, [hiddenOrdersHook.bulkSoftDelete, saveCurrentPosition]);

  const handleSingleSoftDelete = useCallback(async (id: number) => {
    saveCurrentPosition();
    const result = await hiddenOrdersHook.singleSoftDelete(id);
    if (result.success) {
      showAlert("success", result.message);
    } else {
      showAlert("error", result.message);
    }
    return result;
  }, [hiddenOrdersHook.singleSoftDelete, saveCurrentPosition]);

  // ✅ THÊM: Handle reset filter with localStorage clear
  const handleResetFilter = async () => {
    try {
      hiddenOrdersHook.resetFilters();
      showAlert("success", "Đã xóa tất cả bộ lọc và làm mới dữ liệu");
    } catch (error) {
      showAlert("error", "Lỗi khi xóa bộ lọc");
    }
  };

  // ✅ Khôi phục vị trí sau khi data được refetch
  useEffect(() => {
    if (!hiddenOrdersHook.loading && preservedState) {
      restorePosition();
    }
  }, [hiddenOrdersHook.loading, preservedState, restorePosition]);

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
              bulkUnhide={handleBulkUnhide}
              singleUnhide={handleSingleUnhide}
              bulkSoftDelete={handleBulkSoftDelete}
              singleSoftDelete={handleSingleSoftDelete}
            />
          </Suspense>
        </CardContent>
      </Card>
    </>
  );
}
