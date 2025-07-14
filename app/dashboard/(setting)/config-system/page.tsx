"use client";

import { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ConfigSystemMainPanel from "@/components/config-system/ConfigSystemMainPanel";
import DebtConfigModal from "@/components/config-system/DebtConfigModal";
import HolidayConfigModal from "@/components/config-system/HolidayConfigModal";
import ToolToggleConfigModal from "@/components/config-system/ToolToggleConfigModal";
import ToolScheduleConfigModal from "@/components/config-system/ToolScheduleConfigModal";
import { LoadingSpinner } from "@/components/ui/loading/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { getAccessToken } from "@/lib/auth";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { useApiState } from "@/hooks/useApiState";

export default function ConfigSystemPage() {
  const [openDebt, setOpenDebt] = useState(false);
  const [openHoliday, setOpenHoliday] = useState(false);
  const [openTool, setOpenTool] = useState(false);
  const [openToolSchedule, setOpenToolSchedule] = useState(false);

  // Thông báo trạng thái fetch
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  // Confirm dialog state for ConfigSystemMainPanel
  const [confirmState, setConfirmState] = useState<{ open: boolean; onConfirm?: () => void; message?: string }>(
    { open: false }
  );

  // Fetch function for system configs
  const fetchAllConfigs = useCallback(async (): Promise<any[]> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }



    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/system-config`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error("Failed to fetch system configs");
    }

    const data = await res.json();

    
    return data;
  }, []);

  // Use the custom hook for configs
  const {
    data: allConfigs,
    isLoading: loadingAllConfigs,
    error,
    forceUpdate
  } = useApiState(fetchAllConfigs, [], {
    autoRefreshInterval: 0 // No auto refresh for configs
  });

  // Khi mở modal chỉ cần mở, không fetch lại
  const handleOpenToolSchedule = () => {
    setOpenToolSchedule(true);
    setAlert(null);
  };

  const handleOpenToolToggle = () => {
    setOpenTool(true);
    setAlert(null);
  };

  // Sau khi lưu thành công thì fetch lại dữ liệu mới nhất
  const handleAnyConfigSaved = (result: { success: boolean; message: string }) => {
    setAlert({
      type: result.success ? "success" : "error",
      message: result.message,
    });
    if (result.success) {
      setOpenToolSchedule(false);
      setOpenTool(false);
      setOpenDebt(false);
      // setOpenHoliday(false); // Không tự động đóng modal HolidayConfigModal nữa
      // Refetch lại toàn bộ config để cập nhật UI
      forceUpdate();
    }
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: "Lỗi tải cấu hình hệ thống!" });
    }
  }, [error]);

  // Lọc dữ liệu cho từng modal
  const toolScheduleConfig = allConfigs.find(
    (item) =>
      item.section === "system" && item.name === "system_stopToolConfig"
  );
  const toolScheduleData = toolScheduleConfig?.value
    ? JSON.parse(toolScheduleConfig.value)
    : null;

  // Pass confirm dialog handler to ConfigSystemMainPanel
  const handlePanelConfirm = (message: string, onConfirm: () => void) => {
    setConfirmState({ open: true, onConfirm, message });
  };

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      {loadingAllConfigs && (
        <LoadingSpinner
          size={40}
          fullScreen={false}
          message="Đang tải cấu hình hệ thống..."
        />
      )}
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            ⚙️ Cấu hình hệ thống
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="gradient" onClick={() => setOpenDebt(true)}>
              Cấu hình Công nợ
            </Button>
            <Button variant="import" onClick={() => setOpenHoliday(true)}>
              Cấu hình Lịch nghỉ
            </Button>
            <Button variant="delete" onClick={handleOpenToolToggle}>
              Cấu hình bật/tắt tool
            </Button>
            <Button variant="add" onClick={handleOpenToolSchedule}>
              Cấu hình lịch dừng tool
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ConfigSystemMainPanel
            allConfigs={allConfigs}
            onConfirm={handlePanelConfirm}
            onSaved={handleAnyConfigSaved}
          />
        </CardContent>
      </Card>
      <DebtConfigModal
        open={openDebt}
        onClose={() => setOpenDebt(false)}
        allConfigs={allConfigs}
        onSaved={handleAnyConfigSaved}
      />
      <HolidayConfigModal
        open={openHoliday}
        allConfigs={allConfigs}
        onClose={() => setOpenHoliday(false)}
        onSaved={handleAnyConfigSaved}
      />
      <ToolToggleConfigModal
        open={openTool}
        onClose={() => setOpenTool(false)}
        allConfigs={allConfigs}
        onSaved={handleAnyConfigSaved}
      />
      <ToolScheduleConfigModal
        open={openToolSchedule}
        onClose={() => setOpenToolSchedule(false)}
        allConfigs={allConfigs}
        onSaved={handleAnyConfigSaved}
      />
      <ConfirmDialog
        isOpen={confirmState.open}
        title="Xác nhận lưu cấu hình"
        message={confirmState.message || "Bạn có chắc chắn muốn lưu cấu hình này?"}
        onConfirm={() => {
          setConfirmState({ open: false });
          confirmState.onConfirm && confirmState.onConfirm();
        }}
        onCancel={() => setConfirmState({ open: false })}
      />
    </div>
  );
}