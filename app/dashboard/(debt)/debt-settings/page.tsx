"use client";
import React, { useState, useMemo, useCallback, useEffect } from "react";
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

export default function DebtSettingsPage() {
  const PAGE_SIZE_KEY = "debtConfigPageSize";
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem(PAGE_SIZE_KEY);
      return saved ? parseInt(saved, 10) : 10;
    }
    return 10;
  });
  const [filters, setFilters] = useState<Filters>({
    search: "",
    departments: [],
    roles: [],
    statuses: [],
    categories: [],
    brands: [],
    dateRange: { from: undefined, to: undefined },
    singleDate: undefined,
    employees: [],
    sort: undefined,
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [alert, setAlert] = useState<{ type: any; message: string } | null>(
    null
  );
  const [importing, setImporting] = useState(false);

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

  // Realtime event handlers - refetch with current filters
  const handleDebtLogUpdate = useCallback(
    (data: any) => {
      if (data.refresh_request) {
        forceUpdate();
      }
    },
    [forceUpdate]
  );

  const handleDebtConfigUpdate = useCallback(
    (data: any) => {
      if (data.refresh_request) {
        forceUpdate();
      }
    },
    [forceUpdate]
  );

  // Backend đã xử lý filter và pagination, không cần filter ở frontend nữa
  const filteredData = apiData;
  const paginatedData = apiData; // Backend đã trả về đúng dữ liệu cho trang hiện tại
  const statusFilterOptions = [
    { value: "normal", label: "Bình thường" },
    { value: "not_matched_debt", label: "Không trùng phiếu nợ" },
    { value: "wrong_customer_name", label: "Sai tên khách hàng" },
  ];
  // Callback filter
  const handleFilterChange = useCallback((f: Filters) => {
    setFilters(f);
  }, []);

  // Hàm reset filter
  const handleResetFilter = useCallback(() => {
    const resetFilters: Filters = {
      search: "",
      departments: [],
      roles: [],
      statuses: [],
      categories: [],
      brands: [],
      dateRange: { from: undefined, to: undefined },
      singleDate: undefined,
      employees: [],
    };
    setFilters(resetFilters);
    setPage(1);
    forceUpdate();
  }, [forceUpdate]);

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
        if (!token) return;

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
          forceUpdate(); // Refresh data
        } else {
          setAlert({ type: "error", message: "Cập nhật thất bại!" });
        }
      } catch (error) {
        setAlert({ type: "error", message: "Lỗi khi cập nhật!" });
      }
    },
    [forceUpdate]
  );

  // Delete handler
  const handleDelete = useCallback(
    async (id: string) => {
      try {
        const token = getAccessToken();
        if (!token) return;

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
          forceUpdate(); // Refresh data
        } else {
          setAlert({ type: "error", message: "Xóa thất bại!" });
        }
      } catch (error) {
        setAlert({ type: "error", message: "Lỗi khi xóa!" });
      }
    },
    [forceUpdate]
  );

  // Edit handler - simplified to match component expectations
  const handleEditWrapper = useCallback((row: any) => {
    // This will be handled by the component itself
  }, []);

  // Import Excel handler
  const handleImportExcel = useCallback(
    async (file: File) => {
      setImporting(true);
      try {
        const token = getAccessToken();
        if (!token) return;

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
          forceUpdate(); // Refresh data
        } else {
          setAlert({
            type: "error",
            message: result.message || "Import thất bại!",
          });
        }
      } catch (error) {
        setAlert({ type: "error", message: "Lỗi khi import file!" });
      } finally {
        setImporting(false);
      }
    },
    [forceUpdate]
  );

  // Export Excel handler - simplified to avoid complex type matching
  const handleExportExcel = useCallback(() => {
    // Simple export format to avoid type errors
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

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({
        type: "error",
        message: "Lỗi khi tải dữ liệu cấu hình công nợ!",
      });
    }
  }, [error]);

  // Check if user has read access to debt department
  const canAccessDebtConfig = canReadDepartment("cong-no");

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

  if (isLoading && apiData.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <DebtSocket
        onDebtLogUpdate={handleDebtLogUpdate}
        onDebtConfigUpdate={handleDebtConfigUpdate}
      />
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            ⚙️ Cấu hình nhắc nợ
          </CardTitle>
          <div className="flex gap-2">
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
            initialFilters={filters}
            total={total} // Sử dụng total từ backend
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
              if (typeof window !== "undefined") {
                localStorage.setItem(PAGE_SIZE_KEY, newSize.toString());
              }
            }}
            onFilterChange={handleFilterChange}
            onResetFilter={handleResetFilter}
            getExportData={handleExportExcel}
            canExport={canExportInDepartment("cong-no")}
            pageSizeOptions={[5, 10, 20, 50]}
          >
            <DebtSettingManagement
              data={paginatedData} // Sử dụng data từ backend (đã phân trang)
              page={page}
              pageSize={pageSize}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEditWrapper}
              onRefresh={() => forceUpdate()}
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
        onSaved={(result: { success: boolean; message: string }) => {
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
            forceUpdate();
          }
        }}
      />

      <AddManualDebtModal
        open={showAddManualModal}
        onClose={() => setShowAddManualModal(false)}
        onSave={(success: boolean) => {
          setAlert({
            type: success ? "success" : "error",
            message: success ? "Thêm thành công!" : "Thêm thất bại!",
          });
          if (success) {
            setShowAddManualModal(false);
            forceUpdate();
          }
        }}
      />
    </div>
  );
}
