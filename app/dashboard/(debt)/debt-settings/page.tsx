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
import { useApiState } from "@/hooks/useApiState";
import { P } from "@/components/common/P";

export default function DebtSettingsPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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
  });
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAddManualModal, setShowAddManualModal] = useState(false);
  const [alert, setAlert] = useState<{ type: any; message: string } | null>(
    null
  );
  const [importing, setImporting] = useState(false);

  // Fetch function for debt configs
  const fetchDebtConfigs = useCallback(async (): Promise<any[]> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }

    console.log("fetchDebtConfigs: Starting API call");

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debt-configs`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch debt configs");
    }

    const data = await res.json();
    console.log("fetchDebtConfigs completed:", { configsCount: data.length });

    return data;
  }, []);

  // Use the custom hook for debt configs
  const {
    data: apiData,
    isLoading,
    error,
    forceUpdate,
  } = useApiState(fetchDebtConfigs, [], {
    autoRefreshInterval: 30000, // 30 seconds
  });

  // Calculate total
  const total = apiData.length;

  // Lấy danh sách nhân viên từ apiData (unique employee_id + fullName)
  const employeeOptions = useMemo(() => {
    const map = new Map();
    apiData.forEach((item) => {
      if (item.employee && item.employee.id && item.employee.fullName) {
        map.set(item.employee.id, item.employee.fullName);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({
      value: id,
      label,
    }));
  }, [apiData]);

  // Hàm kiểm tra filter rỗng
  const isAllFilterEmpty = useCallback((f: Filters) => {
    return (
      (!f.search || f.search.trim() === "") &&
      (!f.employees || f.employees.length === 0) &&
      !f.singleDate &&
      (!f.departments || f.departments.length === 0) &&
      (!f.roles || f.roles.length === 0) &&
      (!f.statuses || f.statuses.length === 0) &&
      (!f.categories || f.categories.length === 0) &&
      (!f.brands || f.brands.length === 0) &&
      (!f.dateRange || (!f.dateRange.from && !f.dateRange.to))
    );
  }, []);

  // Filter data locally when filters are applied
  const filteredData = useMemo(() => {
    if (isAllFilterEmpty(filters)) {
      return apiData;
    }

    return apiData.filter((item) => {
      // Search filter
      if (filters.search && filters.search.trim() !== "") {
        const searchTerm = filters.search.toLowerCase();
        const matchesSearch =
          item.customer_name?.toLowerCase().includes(searchTerm) ||
          item.customer_code?.toLowerCase().includes(searchTerm) ||
          item.employee?.fullName?.toLowerCase().includes(searchTerm) ||
          item.note?.toLowerCase().includes(searchTerm);
        if (!matchesSearch) return false;
      }

      // Employee filter
      if (filters.employees && filters.employees.length > 0) {
        const matchesEmployee = filters.employees.some(
          (empId) => item.employee?.id?.toString() === empId.toString()
        );
        if (!matchesEmployee) return false;
      }

      // Date filter
      if (filters.singleDate) {
        const itemDate = new Date(item.created_at);
        const filterDate = new Date(filters.singleDate);
        if (itemDate.toDateString() !== filterDate.toDateString()) return false;
      }

      return true;
    });
  }, [apiData, filters, isAllFilterEmpty]);

  // Paginated data
  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize]);

  // Callback filter
  const handleFilterChange = useCallback(
    (f: Filters) => {
      setFilters(f);
      setPage(1);
      if (isAllFilterEmpty(f)) {
        forceUpdate(); // Refresh data when clearing all filters
      }
    },
    [forceUpdate, isAllFilterEmpty]
  );

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
        console.error("Toggle error:", error);
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
        console.error("Delete error:", error);
        setAlert({ type: "error", message: "Lỗi khi xóa!" });
      }
    },
    [forceUpdate]
  );

  // Edit handler - simplified to match component expectations
  const handleEditWrapper = useCallback((row: any) => {
    // This will be handled by the component itself
    console.log("Edit row:", row);
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
        console.error("Import error:", error);
        setAlert({ type: "error", message: "Lỗi khi import file!" });
      } finally {
        setImporting(false);
      }
    },
    [forceUpdate]
  );

  // Export Excel handler - simplified to avoid complex type matching
  const handleExportExcel = () => {
    // Simple export format to avoid type errors
    const data = filteredData.map((item, index) => [
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
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({
        type: "error",
        message: "Lỗi khi tải dữ liệu cấu hình công nợ!",
      });
    }
  }, [error]);

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
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            ⚙️ Cấu hình công nợ
          </CardTitle>
          <div className="flex gap-2">
            <P name="debt-config-export" mode="any">
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
            </P>
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
                  }
                }}
              />
              <P name="debt-config-import" mode="all">
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
                  {importing ? "Đang import..." : "+ Nhập file Excel"}
                </Button>
              </P>
            </form>
            <P name="debt-config-create"  mode="all">
              <Button variant="add" onClick={() => setShowConfigModal(true)}>
                + Cấu hình công nợ
              </Button>
            </P>
            <P name="debt-config-create" mode="all">
              <Button
                variant="gradient"
                onClick={() => setShowAddManualModal(true)}
              >
                + Thêm thủ công
              </Button>
            </P>
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
            singleDateLabel="Ngày tạo"
            page={page}
            pageSize={pageSize}
            total={filteredData.length}
            onPageChange={setPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setPage(1);
            }}
            onFilterChange={handleFilterChange}
            onResetFilter={handleResetFilter}
            getExportData={handleExportExcel}
            pageSizeOptions={[5, 10, 20, 50]}
          >
            <DebtSettingManagement
              data={paginatedData}
              page={page}
              pageSize={pageSize}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEditWrapper}
              onRefresh={() => forceUpdate()}
            />
          </PaginatedTable>

          {/* Loading indicator */}
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      <DebtConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={(success: boolean) => {
          setAlert({
            type: success ? "success" : "error",
            message: success
              ? "Lưu cấu hình thành công!"
              : "Lưu cấu hình thất bại!",
          });
          if (success) {
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
