"use client";
import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import DebtSettingManagement from "@/components/debt/debt-setting/DebtSettingManagement";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import type { Filters } from "@/components/ui/pagination/PaginatedTable";
import DebtConfigModal from "@/components/debt/debt-setting/DebtConfigModal";
import AddManualDebtModal from "@/components/debt/debt-setting/AddManualDebtModal";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth";
import { useDebtConfigs } from "@/hooks/useDebtConfigs";
import { PDynamic } from "@/components/common/PDynamic";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { DebtSocket } from "@/components/socket/DebtSocket";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function DebtSettingsPage() {
  const PAGE_SIZE_KEY = "debtConfigPageSize";

  const isInitializedRef = useRef(false);
  const alertTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const hasDataLoadedRef = useRef(false);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PAGE_SIZE_KEY);
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [filters, setFilters] = useState<Filters>(() => ({
    search: "",
    departments: [],
    roles: [],
    statuses: [],
    categories: [],
    brands: [],
    dateRange: { from: undefined, to: undefined },
    singleDate: new Date().toISOString().split('T')[0], // Mặc định ngày hiện tại
    employees: [],
    sort: undefined,
    warningLevels: [], // Add this line to match Filters type
  }));

  // Thêm state cho initialFilters riêng biệt
  const [initialFilters, setInitialFilters] = useState<Filters | undefined>(
    undefined
  );
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [alert, setAlert] = useState<{ type: any; message: string } | null>(
    null
  );
  const [importing, setImporting] = useState(false);
  const [processDebtEnabled, setProcessDebtEnabled] = useState<boolean | null>(
    null
  );
  const [showConfirmToggle, setShowConfirmToggle] = useState(false);
  const [toggleLoading, setToggleLoading] = useState(false);

  // Check permissions for debt configuration access
  const {
    canReadDepartment,
    canCreateInDepartment,
    canImportInDepartment,
    canExportInDepartment,
    getPermissionsByDepartment,
    user,
  } = useDynamicPermission();

  // Use the custom hook for debt configs
  const {
    data: apiData,
    total,
    totalPages,
    isLoading,
    error,
    forceUpdate,
    employeeOptions,
    loadingEmployees,
  } = useDebtConfigs(filters, page, pageSize, user);

  useEffect(() => {
    if (apiData && apiData.length > 0) {
      hasDataLoadedRef.current = true;
    }
  }, [apiData]);

  const handleRefresh = useCallback(() => {
    if (isRefreshingRef.current) return;

    isRefreshingRef.current = true;
    React.startTransition(() => {
      forceUpdate();
      setTimeout(() => {
        isRefreshingRef.current = false;
      }, 1000);
    });
  }, [forceUpdate]);

  // Realtime event handlers - refetch with current filters
  const handleDebtLogUpdate = useCallback(
    (data: any) => {
      console.log("Debt log updated:", data);
      if (data.refresh_request) {
        handleRefresh();
      }
    },
    [handleRefresh]
  );

  const handleDebtConfigCreate = useCallback(
    (data: any) => {
      console.log("Debt config created:", data);
      handleRefresh();
    },
    [handleRefresh]
  );

  const handleDebtConfigUpdate = useCallback(
    (data: any) => {
      console.log("Debt config updated:", data);
      if (data.refresh_request) {
        handleRefresh();
      }
    },
    [handleRefresh]
  );

  // Backend đã xử lý filter và pagination, không cần filter ở frontend nữa
  const filteredData = useMemo(() => apiData, [apiData]);
  const paginatedData = useMemo(() => apiData, [apiData]); // Backend đã trả về đúng dữ liệu cho trang hiện tại
  const statusFilterOptions = useMemo(
    () => [
      { value: "normal", label: "Không có phiếu nợ" },
      { value: "not_matched_debt", label: "Có phiếu nợ trong ngày" },
      { value: "wrong_customer_name", label: "Lỗi gửi Zalo" },
    ],
    []
  );
  const filterTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // Callback filter
  const handleFilterChange = useCallback((f: Filters) => {
    // ✅ Clear previous timeout
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    // ✅ Debounce filter changes
    filterTimeoutRef.current = setTimeout(() => {
      setFilters(f);
      setInitialFilters(undefined);
      setPage(1);
    }, 300); // ✅ 300ms debounce
  }, []);

  // Hàm reset filter
  const handleResetFilter = useCallback(() => {
    // ✅ Clear timeout
    if (filterTimeoutRef.current) {
      clearTimeout(filterTimeoutRef.current);
    }

    const resetFilters: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      categories: [],
      brands: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: new Date().toISOString().split('T')[0], // Mặc định ngày hiện tại
      employees: [],
      sort: undefined,
      warningLevels: [],
    };
    setFilters(resetFilters);
    setInitialFilters(undefined);
    setPage(1);

    // ✅ Only refresh if we have data
    if (hasDataLoadedRef.current) {
      handleRefresh();
    }
  }, [handleRefresh]);

  useEffect(() => {
    console.log("filters:", filters);
  }, [filters]);

  // Toggle handler
  const handleToggle = useCallback(
    async (
      id: string,
      type: "send" | "repeat",
      value: boolean,
      updatedRow?: any
    ) => {
      try {
        const token = getAccessToken();
        if (!token) {
          setAlert({ type: "error", message: "Không có token xác thực!" });
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/debt-configs/${id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              [type === "send" ? "is_send" : "is_repeat"]: value,
              ...updatedRow,
            }),
          }
        );

        if (res.ok) {
          setAlert({ type: "success", message: "Cập nhật thành công!" });
          handleRefresh();
        } else {
          const errorData = await res.json().catch(() => ({}));
          setAlert({
            type: "error",
            message: errorData.message || "Cập nhật thất bại!",
          });
        }
      } catch (error) {
        console.error("Toggle error:", error);
        setAlert({ type: "error", message: "Lỗi khi cập nhật!" });
      }
    },
    [handleRefresh]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const token = getAccessToken();
        if (!token) {
          setAlert({ type: "error", message: "Không có token xác thực!" });
          return;
        }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/debt-configs/${id}`,
          {
            method: "DELETE",
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (res.ok) {
          setAlert({ type: "success", message: "Xóa thành công!" });
          handleRefresh();
        } else {
          const errorData = await res.json().catch(() => ({}));
          setAlert({
            type: "error",
            message: errorData.message || "Xóa thất bại!",
          });
        }
      } catch (error) {
        console.error("Delete error:", error);
        setAlert({ type: "error", message: "Lỗi khi xóa!" });
      }
    },
    [handleRefresh]
  );

  // Edit handler - simplified to match component expectations
  const handleEditWrapper = useCallback((row: any) => {
    console.log("Edit triggered for:", row?.id);
  }, []);

  // Import Excel handler
  const handleImportExcel = useCallback(
    async (file: File) => {
      if (importing) return;

      setImporting(true);
      try {
        const token = getAccessToken();
        if (!token) {
          setAlert({ type: "error", message: "Không có token xác thực!" });
          return;
        }

        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/debt-configs/import`,
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
            },
            body: formData,
          }
        );

        const result = await res.json();

        if (res.ok) {
          setAlert({
            type: "success",
            message: `Import thành công ${result.imported || 0} bản ghi!`,
          });
          // ✅ Set hasDataLoaded after successful import
          hasDataLoadedRef.current = true;
          handleRefresh();
        } else {
          setAlert({
            type: "error",
            message: result.message || "Import thất bại!",
          });
        }
      } catch (error) {
        console.error("Import error:", error);
        setAlert({ type: "error", message: "Lỗi khi import file!" });
      } finally {
        setImporting(false);
      }
    },
    [importing, handleRefresh]
  );

  // Export Excel handler - simplified to avoid complex type matching
  const handleExportExcel = useCallback(() => {
    const data = filteredData.map((item: any, index: number) => [
      index + 1,
      item.customer_code || "",
      item.customer_name || "",
      item.employee?.fullName || "",
      item.note || "",
      item.is_send ? "Có" : "Không",
      item.is_repeat ? "Có" : "Không",
      item.created_at
        ? new Date(item.created_at).toLocaleDateString("vi-VN")
        : "",
    ]);

    return {
      headers: [
        "STT",
        "Mã Khách Hàng",
        "Tên Khách Hàng",
        "Nhân Viên",
        "Ghi Chú",
        "Có Gửi",
        "Lặp Lại",
        "Ngày Tạo",
      ],
      data,
    };
  }, [filteredData]);

  const handleModalConfigSaved = useCallback(
    (result: { success: boolean; message: string }) => {
      setAlert({
        type: result.success ? "success" : "error",
        message:
          result.message ||
          (result.success
            ? "Lưu cấu hình thành công!"
            : "Lưu cấu hình thất bại!"),
      });
      if (result.success) {
        setShowConfigModal(false);
        // ✅ Set hasDataLoaded after successful save
        hasDataLoadedRef.current = true;
        handleRefresh();
      }
    },
    [handleRefresh]
  );

  const handleModalManualSave = useCallback(
    (success: boolean) => {
      setAlert({
        type: success ? "success" : "error",
        message: success ? "Thêm thành công!" : "Thêm thất bại!",
      });
      if (success) {
        setShowAddManualModal(false);
        // ✅ Set hasDataLoaded after successful save
        hasDataLoadedRef.current = true;
        handleRefresh();
      }
    },
    [handleRefresh]
  );

  const handleToggleProcessDebt = useCallback(async () => {
    if (toggleLoading) return; // ✅ Prevent double call

    setToggleLoading(true);
    try {
      const token = getAccessToken();
      if (!token) {
        setAlert({ type: "error", message: "Không có token xác thực!" });
        return;
      }

      const newValue = processDebtEnabled ? "0" : "1";
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/system-config/by-section/system/system_processDebt`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ value: newValue }),
        }
      );

      if (res.ok) {
        setProcessDebtEnabled(!processDebtEnabled);
        setAlert({
          type: "success",
          message: `Đã ${
            !processDebtEnabled ? "bật" : "tắt"
          } chương trình công nợ!`,
        });
      } else {
        const errorData = await res.json().catch(() => ({}));
        setAlert({
          type: "error",
          message: errorData.message || "Cập nhật thất bại!",
        });
      }
    } catch (err) {
      console.error("Toggle process debt error:", err);
      setAlert({ type: "error", message: "Lỗi khi cập nhật!" });
    } finally {
      setToggleLoading(false);
      setShowConfirmToggle(false);
    }
  }, [processDebtEnabled, toggleLoading]);

  const handlePageSizeChange = useCallback((newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    if (typeof window !== "undefined") {
      localStorage.setItem(PAGE_SIZE_KEY, newSize.toString());
    }
  }, []);

  useEffect(() => {
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      if (filterTimeoutRef.current) {
        clearTimeout(filterTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (alert) {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
      alertTimeoutRef.current = setTimeout(() => {
        setAlert(null);
      }, 5000);
    }
    return () => {
      if (alertTimeoutRef.current) {
        clearTimeout(alertTimeoutRef.current);
      }
    };
  }, [alert]);

  // Update alert when there's an error
  useEffect(() => {
    if (error && !isLoading && isInitializedRef.current) {
      const errorMessage =
        typeof error === "string"
          ? error
          : "Lỗi khi tải dữ liệu cấu hình công nợ!";

      setAlert((prev) => {
        if (prev?.message === errorMessage) return prev;
        return { type: "error", message: errorMessage };
      });
    }
  }, [error, isLoading]);

  useEffect(() => {
    let isMounted = true;

    async function fetchProcessDebtStatus() {
      try {
        const token = getAccessToken();
        if (!token || !isMounted) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/system-config/by-section/system/system_processDebt`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (!isMounted) return;

        const data = await res.json();
        setProcessDebtEnabled(data?.value === "1");
      } catch (err) {
        if (isMounted) {
          console.error("Fetch process debt status error:", err);
          setProcessDebtEnabled(null);
        }
      }
    }

    if (!isInitializedRef.current) {
      isInitializedRef.current = true;
      fetchProcessDebtStatus();
    }

    return () => {
      isMounted = false;
    };
  }, []);

  // Check if user has read access to debt department
  const canAccessDebtConfig = useMemo(
    () => canReadDepartment("cong-no"),
    [canReadDepartment]
  );

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
  if (!canAccessDebtConfig) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">
          Không có quyền truy cập
        </div>
        <div className="text-gray-600">
          Bạn không có quyền xem cấu hình công nợ
        </div>
      </div>
    );
  }

  // if (isLoading && !hasDataLoadedRef.current && filters === undefined) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <LoadingSpinner size={32} />
  //       <span className="ml-2">Đang tải dữ liệu...</span>
  //     </div>
  //   );
  // }

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <DebtSocket
        onDebtLogUpdate={handleDebtLogUpdate}
        onDebtConfigCreate={handleDebtConfigCreate}
        onDebtConfigUpdate={handleDebtConfigUpdate}
      />
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            ⚙️ Cấu hình nhắc nợ
          </CardTitle>
          <div className="flex gap-2">
            <PDynamic
              permission={{ departmentSlug: "cong-no", action: "create" }}
            >
              <Button
                variant={processDebtEnabled ? "add" : "delete"}
                type="button"
                onClick={() => setShowConfirmToggle(true)}
                disabled={toggleLoading || processDebtEnabled === null}
                className="text-sm"
              >
                {processDebtEnabled === null
                  ? "Đang kiểm tra trạng thái..."
                  : processDebtEnabled
                  ? "Tắt chương trình công nợ"
                  : "Bật chương trình công nợ"}
              </Button>
            </PDynamic>
            <PDynamic
              permission={{ departmentSlug: "cong-no", action: "export" }}
            >
              <Button
                variant="export"
                type="button"
                onClick={() => {
                  const link = document.createElement("a");
                  link.href = "/file_mau_cau_hinh_cong_no.xlsx";
                  link.download = "file_mau_cau_hinh_cong_no.xlsx";
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="text-sm"
              >
                📁 Tải file mẫu Excel
              </Button>
            </PDynamic>

            <PDynamic
              permission={{ departmentSlug: "cong-no", action: "import" }}
            >
              <form id="excel-upload-form" style={{ display: "inline" }}>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  id="excel-upload-input"
                  style={{ display: "none" }}
                  onChange={(e) => {
                    const file = e.target.files && e.target.files[0];
                    if (file) {
                      handleImportExcel(file);
                      e.target.value = "";
                    }
                  }}
                />
                <Button
                  variant="import"
                  type="button"
                  onClick={() => {
                    const input = document.getElementById(
                      "excel-upload-input"
                    ) as HTMLInputElement | null;
                    if (input) input.click();
                  }}
                  disabled={importing}
                >
                  {importing
                    ? "Đang import..."
                    : "+ Nhập file Cấu hình công nợ"}
                </Button>
              </form>
            </PDynamic>

            <PDynamic
              permission={{ departmentSlug: "cong-no", action: "create" }}
            >
              <Button variant="add" onClick={() => setShowConfigModal(true)}>
                + Cấu hình công nợ
              </Button>
            </PDynamic>

            <PDynamic
              permission={{ departmentSlug: "cong-no", action: "create" }}
            >
              <Button
                variant="gradient"
                onClick={() => setShowAddManualModal(true)}
              >
                + Thêm công nợ thủ công
              </Button>
            </PDynamic>

            <Button
              onClick={() => forceUpdate()}
              variant="outline"
              className="text-sm"
            >
              🔄 Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          <PaginatedTable
            key={`debt-settings-table-${page}-${pageSize}`}
            enableSearch
            enableEmployeeFilter
            availableEmployees={employeeOptions}
            enableSingleDateFilter
            singleDateLabel="Ngày đã nhắc"
            page={page}
            enableStatusFilter={true}
            availableStatuses={statusFilterOptions}
            enablePageSize={true}
            pageSize={pageSize}
            preserveFiltersOnEmpty={true}
            {...(initialFilters !== undefined && { initialFilters })}
            total={total}
            onPageChange={setPage}
            onPageSizeChange={handlePageSizeChange}
            onFilterChange={handleFilterChange}
            onResetFilter={handleResetFilter}
            getExportData={handleExportExcel}
            canExport={canExportInDepartment("cong-no")}
            pageSizeOptions={[5, 10, 20, 50]}
          >
            <DebtSettingManagement
              key={`debt-mgmt-${paginatedData.length}-${page}`}
              data={paginatedData}
              page={page}
              pageSize={pageSize}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEditWrapper}
              onRefresh={handleRefresh}
              onSortChange={(sort) => setFilters((f) => ({ ...f, sort }))}
              onShowAlert={setAlert}
            />
          </PaginatedTable>
        </CardContent>
      </Card>

      {/* Modals */}
      <DebtConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSaved={handleModalConfigSaved}
      />

      <ConfirmDialog
        isOpen={showConfirmToggle}
        title={
          processDebtEnabled
            ? "Tắt chương trình công nợ"
            : "Bật chương trình công nợ"
        }
        message={
          processDebtEnabled
            ? "Bạn có chắc chắn muốn tắt chương trình công nợ? Các chức năng liên quan sẽ bị vô hiệu hóa."
            : "Bạn có chắc chắn muốn bật chương trình công nợ?"
        }
        onConfirm={handleToggleProcessDebt}
        onCancel={() => setShowConfirmToggle(false)}
        confirmText={processDebtEnabled ? "Tắt" : "Bật"}
        cancelText="Hủy"
      />

      <AddManualDebtModal
        open={showAddManualModal}
        onClose={() => setShowAddManualModal(false)}
        onSave={handleModalManualSave}
      />
    </div>
  );
}
