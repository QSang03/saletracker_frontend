"use client";
import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useMemo,
} from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import DebtManagement from "../../../../components/debt/manager-debt/DebtManagement";
import ImportPayDateModal from "../../../../components/debt/manager-debt/ImportPayDateModal";
import ImportRollbackDialog from "../../../../components/debt/manager-debt/ImportRollbackDialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getAccessToken } from "@/lib/auth";
import {
  Accordion,
  AccordionItem,
  AccordionTrigger,
  AccordionContent,
} from "@/components/ui/accordion";
import { useApiState } from "@/hooks/useApiState";
import { PDynamic } from "@/components/common/PDynamic";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { DebtSocket } from "@/components/socket/DebtSocket";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Unique page size key for debt management
const PAGE_SIZE_KEY = "debtPageSize";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted min-w-[120px] text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

interface DebtFilters {
  search: string;
  singleDate: string; // Change to string for ISO date format
  statuses: string[];
  employees: string[];
}

export default function ManagerDebtPage() {
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [showImportPayDate, setShowImportPayDate] = useState(false);
  const [showImportRollback, setShowImportRollback] = useState(false);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const isInitializedRef = useRef(false);
  const {
    canReadDepartment,
    canCreateInDepartment,
    canUpdateInDepartment,
    canDeleteInDepartment,
    canImportInDepartment,
    canExportInDepartment,
    user,
  } = useDynamicPermission();

  const canAccessDebtManagement = canReadDepartment("cong-no");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPageSize = localStorage.getItem(PAGE_SIZE_KEY);
      return savedPageSize ? parseInt(savedPageSize, 10) : 10;
    }
    return 10;
  });
  const [filters, setFilters] = useState({
    search: "",
    singleDate: new Date().toLocaleDateString("en-CA"), // Use toLocaleDateString to avoid timezone issues
    statuses: [] as string[],
    employees: [] as string[],
  });

  const [initialFilters, setInitialFilters] = useState<DebtFilters | undefined>(
    undefined
  );

  useEffect(() => {
    // ✅ Chỉ chạy 1 lần khi component mount
    if (typeof window !== "undefined" && !isInitializedRef.current) {
      isInitializedRef.current = true;

      const filterStr = localStorage.getItem("managerDebtFilter");
      if (filterStr) {
        try {
          const filter = JSON.parse(filterStr);
          const newFilters = {
            search: filter.search || "",
            singleDate:
              filter.singleDate || new Date().toLocaleDateString("en-CA"),
            statuses: [],
            employees: [],
          };
          setFilters(newFilters);
          setInitialFilters({ ...newFilters });
          setPage(1);

          // ✅ Dọn dẹp localStorage ngay lập tức, không dùng setTimeout
          localStorage.removeItem("managerDebtFilter");

          // ✅ Reset initialFilters sau khi component đã render
          requestAnimationFrame(() => {
            setInitialFilters(undefined);
          });
        } catch (e) {
          localStorage.removeItem("managerDebtFilter");
        }
      }
    }
  }, []);

  const [customerOptions, setCustomerOptions] = useState<
    { label: string; value: string }[]
  >([]);
  const [allEmployeeOptions, setAllEmployeeOptions] = useState<
    { label: string; value: string }[]
  >([]);

  const fetchDebts = useCallback(async (): Promise<{
    data: any[];
    total: number;
  }> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }

    const params: Record<string, any> = {
      page,
      pageSize,
      date: filters.singleDate, // Use the string date directly
    };

    if (filters.search) params.search = filters.search;
    if (filters.statuses && filters.statuses.length > 0)
      params.statuses = filters.statuses;
    if (filters.employees && filters.employees.length > 0)
      params.employeeCodes = filters.employees;

    const queryStr = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");

    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/debts?${queryStr}`,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch debts: ${res.status}`);
    }

    const result = await res.json();

    return {
      data: result.data || [],
      total: result.total || 0,
    };
  }, [page, pageSize, filters]);

  const fetchStats = useCallback(async () => {
    const token = getAccessToken();
    if (!token)
      return {
        totalAmount: 0,
        totalBills: 0,
        totalCollected: 0,
        totalPaidAmount: 0,
        totalPaidBills: 0,
        totalRemaining: 0,
      };

    try {
      const params: Record<string, any> = {
        date: filters.singleDate, // Use the string date directly
        stats: 1,
      };

      if (filters.search) params.search = filters.search;
      if (filters.statuses && filters.statuses.length > 0)
        params.statuses = filters.statuses;
      if (filters.employees && filters.employees.length > 0)
        params.employeeCodes = filters.employees;

      const queryStr = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join("&");

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debts/stats?${queryStr}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error("Error fetching stats:", error);
    }

    return {
      totalAmount: 0,
      totalBills: 0,
      totalCollected: 0,
      totalPaidAmount: 0,
      totalPaidBills: 0,
      totalRemaining: 0,
    };
  }, [filters]);

  const {
    data: debtsData,
    isLoading,
    error,
    forceUpdate,
  } = useApiState(fetchDebts, { data: [], total: 0 });

  const { data: stats, forceUpdate: refreshStats } = useApiState(fetchStats, {
    totalAmount: 0,
    totalBills: 0,
    totalCollected: 0,
    totalPaidAmount: 0,
    totalPaidBills: 0,
    totalRemaining: 0,
  });

  const debts = debtsData.data;
  const total = debtsData.total;

  const handleDebtUpdate = useCallback(
    (data: any) => {
      console.log("[ManagerDebtPage] Debt updated:", data);
      if (data.refresh_request) {
        // ✅ Batch updates để tránh cascade
        React.startTransition(() => {
          forceUpdate();
          refreshStats();
        });
      }
    },
    [] // ✅ Bỏ forceUpdate khỏi dependencies để tránh re-create
  );

  // Simple debounce implementation (if lodash/debounce is not available)
  function debounce<T extends (...args: any[]) => void>(fn: T, wait: number) {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const debounced = (...args: Parameters<T>) => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), wait);
    };
    debounced.cancel = () => {
      if (timeout) clearTimeout(timeout);
    };
    return debounced as T & { cancel: () => void };
  }

  const debouncedFilterChange = useMemo(
    () =>
      debounce((newFilters: any) => {
        console.log("[ManagerDebtPage] Debounced filter change:", newFilters);
        setFilters(newFilters);
        setPage(1);
      }, 300), // Debounce 300ms để tránh quá nhiều API calls
    []
  );

  // Status options for filter
  const statusOptions = [
    { value: "paid", label: "Đã thanh toán" },
    { value: "pay_later", label: "Đã hẹn thanh toán" },
    { value: "no_information_available", label: "Không có thông tin" },
    { value: "overdue", label: "Quá hạn" },
  ];

  // Fetch customer options
  useEffect(() => {
    const fetchCustomerOptions = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/debts/customers`,
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setCustomerOptions(
            data.map((c: any) => ({
              label: c.code,
              value: c.code,
            }))
          );
        } else if (Array.isArray(data.data)) {
          setCustomerOptions(
            data.data.map((c: any) => ({
              label: c.code,
              value: c.code,
            }))
          );
        } else {
          setCustomerOptions([]);
        }
      } catch {
        setCustomerOptions([]);
      }
    };

    fetchCustomerOptions();
  }, []);

  // Fetch all filter options (employees)
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        // Fetch employees from a more appropriate endpoint
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/debts/employees`, // Use dedicated employees endpoint
          {
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllEmployeeOptions(
            data.map((emp: any) => ({
              label: emp.name || emp.fullName || emp.employee_name,
              value: emp.name || emp.fullName || emp.employee_name,
            }))
          );
        } else if (Array.isArray(data.data)) {
          setAllEmployeeOptions(
            data.data.map((emp: any) => ({
              label: emp.name || emp.fullName || emp.employee_name,
              value: emp.name || emp.fullName || emp.employee_name,
            }))
          );
        } else {
          // Fallback: get from all debts if employees endpoint doesn't exist
          const fallbackRes = await fetch(
            `${process.env.NEXT_PUBLIC_API_URL}/debts?all=1&page=1&pageSize=10000`,
            {
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const fallbackData = await fallbackRes.json();
          if (Array.isArray(fallbackData.data)) {
            // Get unique employees
            const names = fallbackData.data
              .map(
                (d: any) =>
                  d.debt_config?.employee?.fullName ||
                  d.employee_code_raw ||
                  d.sale?.fullName ||
                  d.sale_name_raw
              )
              .filter(Boolean);

            const uniqueNames = [...new Set(names)].filter(
              (name): name is string => typeof name === "string"
            );
            setAllEmployeeOptions(
              uniqueNames.map((name) => ({ label: name, value: name }))
            );
          }
        }
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };

    fetchAllFilterOptions();
  }, []);

  // Handle filter changes - following User Manager pattern
  const handleFilterChange = useCallback(
    (newFilters: any) => {
      console.log("[ManagerDebtPage] Filter changed:", newFilters);
      
      debouncedFilterChange(newFilters);
    },
    [debouncedFilterChange]
  );
  
  const handleRefresh = useCallback(() => {
    // ✅ Batch refresh operations
    React.startTransition(() => {
      forceUpdate();
      refreshStats();
    });
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
    // Save to localStorage for persistence
    if (typeof window !== "undefined") {
      localStorage.setItem(PAGE_SIZE_KEY, newPageSize.toString());
    }
  }, []);

  const handleResetFilter = useCallback(() => {
    const defaultFilters = {
      search: "",
      singleDate: new Date().toLocaleDateString("en-CA"),
      statuses: [],
      employees: [],
    };
    setFilters(defaultFilters);
    setInitialFilters(undefined); // Đảm bảo không trigger sync lại
    setPage(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PAGE_SIZE_KEY);
    }
    setPageSize(10);
  }, []);

  // Handle Excel import
  const handleExcelImport = async (file: File) => {
    const token = getAccessToken();
    if (!token || isImporting) return;

    setIsImporting(true); // Bắt đầu loading

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debts/import-excel`,
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
        // Xử lý kết quả import với thông tin chi tiết - type safety
        let importedCount = 0;
        let errorCount = 0;

        if (Array.isArray(result.imported)) {
          importedCount = result.imported.length;
        } else if (typeof result.imported === "number") {
          importedCount = result.imported;
        } else if (result.imported) {
          importedCount = Number(result.imported) || 0;
        }

        if (Array.isArray(result.errors)) {
          errorCount = result.errors.length;
        } else if (typeof result.errors === "number") {
          errorCount = result.errors;
        } else if (result.errors) {
          errorCount = Number(result.errors) || 0;
        }

        // Đảm bảo message luôn là string hợp lệ
        let message = `Import thành công ${importedCount} bản ghi`;
        if (errorCount > 0) {
          message += ` (có ${errorCount} lỗi)`;
        } else {
          message += "!";
        }

        setAlert({ type: "success", message: message });

        React.startTransition(() => {
          forceUpdate();
          refreshStats();
        });
      } else {
        // Đảm bảo message luôn là string
        let errorMessage = "Import thất bại!";
        if (result.message) {
          if (typeof result.message === "string") {
            errorMessage = result.message;
          } else if (Array.isArray(result.message)) {
            errorMessage = result.message.join(", ");
          } else if (typeof result.message === "object") {
            errorMessage = JSON.stringify(result.message);
          } else {
            errorMessage = String(result.message);
          }
        }

        setAlert({
          type: "error",
          message: errorMessage,
        });
      }
    } catch (error) {
      console.error("Import error:", error);
      setAlert({ type: "error", message: "Lỗi khi import file!" });
    } finally {
      setIsImporting(false); // Kết thúc loading
    }
  };

  // Handle debt edit
  const handleEditDebt = async (
    debt: any,
    data: { note: string; status: string }
  ) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        }
      );

      if (res.ok) {
        setAlert({ type: "success", message: "Cập nhật công nợ thành công!" });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
      } else {
        setAlert({ type: "error", message: "Cập nhật công nợ thất bại!" });
      }
    } catch (error) {
      console.error("Edit debt error:", error);
      setAlert({ type: "error", message: "Lỗi khi cập nhật công nợ!" });
    }
  };

  // Handle debt delete
  const handleDeleteDebt = async (debt: any) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.ok) {
        setAlert({ type: "success", message: "Xóa công nợ thành công!" });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
      } else {
        setAlert({ type: "error", message: "Xóa công nợ thất bại!" });
      }
    } catch (error) {
      console.error("Delete debt error:", error);
      setAlert({ type: "error", message: "Lỗi khi xóa công nợ!" });
    }
  };

  // Handle delete all debts for today
  const handleDeleteAllTodayDebts = async () => {
    const token = getAccessToken();
    if (!token) return;

    setIsDeletingAll(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/debts/bulk/today`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const result = await res.json();

      if (res.ok) {
        setAlert({
          type: "success",
          message:
            result.message || `Đã xóa ${result.deleted || 0} phiếu công nợ!`,
        });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
        setShowDeleteAllConfirm(false);
      } else {
        setAlert({
          type: "error",
          message: result.message || "Xóa công nợ thất bại!",
        });
      }
    } catch (error) {
      console.error("Delete all debts error:", error);
      setAlert({ type: "error", message: "Lỗi khi xóa tất cả công nợ!" });
    } finally {
      setIsDeletingAll(false);
    }
  };

  // Get export data - proper format
  const getExportData = () => {
    const data = debts.map((debt: any, index: number) => [
      (page - 1) * pageSize + index + 1,
      debt.customer_code || "",
      debt.customer_name || "",
      debt.bill_code || "",
      debt.created_at
        ? new Date(debt.created_at).toLocaleDateString("vi-VN")
        : "",
      debt.amount || 0,
      debt.status === "paid"
        ? "Đã thanh toán"
        : debt.status === "pay_later"
        ? "Đã hẹn thanh toán"
        : "Không có thông tin",
      debt.note || "",
      debt.debt_config?.employee?.fullName ||
        debt.employee_code_raw ||
        debt.sale?.fullName ||
        debt.sale_name_raw ||
        "",
    ]);

    return {
      headers: [
        "STT",
        "Mã KH",
        "Tên KH",
        "Số Phiếu",
        "Ngày Tạo",
        "Số Tiền",
        "Trạng Thái",
        "Ghi Chú",
        "Nhân Viên",
      ],
      data,
    };
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error && !isLoading) {
      // ✅ Chỉ show error khi không loading
      let errorMessage = "Lỗi khi tải dữ liệu công nổ!";
      if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        errorMessage = (error as any).message || String(error);
      }

      // ✅ Chỉ set alert nếu chưa có alert hoặc message khác
      setAlert((prev) => {
        if (prev?.message === errorMessage) return prev;
        return { type: "error", message: errorMessage };
      });
    }
  }, [error, isLoading]);

  useEffect(() => {
    return () => {
      debouncedFilterChange.cancel?.(); // ✅ Cancel debounce khi unmount
    };
  }, [debouncedFilterChange]);

  useEffect(() => {
  console.log("Current filters:", filters);
}, [filters]);

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
  if (!canAccessDebtManagement) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">
          Không có quyền truy cập
        </div>
        <div className="text-gray-600">Bạn không có quyền quản lý công nợ</div>
      </div>
    );
  }

  // if (isLoading && !error) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <LoadingSpinner size={32} />
  //       <span className="ml-2">Đang tải dữ liệu...</span>
  //     </div>
  //   );
  // }

  return (
    <div className="h-full overflow-hidden relative">
      {/* Loading overlay cho import */}
      {isImporting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex flex-col items-center gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-t-transparent border-r-pink-500 border-b-purple-500 border-l-indigo-500"></div>
            <span className="text-lg font-semibold">
              Đang import file Excel...
            </span>
          </div>
        </div>
      )}

      <div className="h-full overflow-y-auto overflow-x-hidden p-6">
        <DebtSocket onDebtUpdate={handleDebtUpdate} />
        <Card className="w-full max-w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">
              💰 Quản lý công nợ
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <PDynamic
                permission={{ departmentSlug: "cong-no", action: "export" }}
              >
                <Button
                  variant="export"
                  type="button"
                  onClick={() => {
                    const link = document.createElement("a");
                    link.href = "/file_mau_cong_no.xlsx";
                    link.download = "file_mau_cong_no.xlsx";
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
                    disabled={isImporting}
                    onChange={(e) => {
                      if (isImporting) return; // Ngăn import khi đang loading
                      const file = e.target.files && e.target.files[0];
                      if (file) {
                        handleExcelImport(file);
                        e.target.value = "";
                      }
                    }}
                  />
                  <Button
                    variant="import"
                    type="button"
                    disabled={isImporting}
                    onClick={() => {
                      if (isImporting) return; // Ngăn click khi đang import
                      const input = document.getElementById(
                        "excel-upload-input"
                      ) as HTMLInputElement | null;
                      if (input) input.click();
                    }}
                  >
                    {isImporting ? "Đang import..." : "+ Nhập file Excel"}
                  </Button>
                </form>
              </PDynamic>

              <PDynamic
                permission={{ departmentSlug: "cong-no", action: "delete" }}
              >
                <Button
                  variant="edit"
                  onClick={() => setShowImportRollback(true)}
                  disabled={isImporting}
                >
                  🔄 Khôi phục dữ liệu công nợ
                </Button>
              </PDynamic>

              <PDynamic
                permission={{ departmentSlug: "cong-no", action: "update" }}
              >
                <Button
                  variant="add"
                  onClick={() => setShowImportPayDate(true)}
                >
                  + Nhập ngày hẹn thanh toán
                </Button>
              </PDynamic>

              {/* <PDynamic
                permission={{ departmentSlug: "cong-no", action: "delete" }}
              >
                <Button
                  variant="delete"
                  onClick={() => setShowDeleteAllConfirm(true)}
                  disabled={isDeletingAll}
                >
                  {isDeletingAll ? "Đang xóa..." : "🗑️ Xóa tất cả hôm nay"}
                </Button>
              </PDynamic> */}

              <Button
                onClick={() => {
                  forceUpdate();
                  refreshStats();
                }}
                variant="outline"
                className="text-sm"
              >
                🔄 Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {/* Alert */}
            {alert && (
              <ServerResponseAlert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}

            {/* Accordion thống kê */}
            <Accordion type="single" collapsible defaultValue="stats">
              <AccordionItem value="stats">
                <AccordionTrigger>Thống Kê Công Nợ Trong Ngày</AccordionTrigger>
                <AccordionContent>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 pb-2">
                    <StatBox
                      label="Tổng Tiền Công Nợ"
                      value={
                        stats && typeof stats.totalAmount === "number"
                          ? stats.totalAmount.toLocaleString()
                          : "0"
                      }
                    />
                    <StatBox
                      label="Tổng Phiếu Công Nợ"
                      value={
                        stats && typeof stats.totalBills === "number"
                          ? stats.totalBills
                          : "0"
                      }
                    />
                    <StatBox
                      label="Tổng Tiền Còn Lại"
                      value={
                        stats && typeof stats.totalRemaining === "number"
                          ? stats.totalRemaining.toLocaleString()
                          : "0"
                      }
                    />
                    <StatBox
                      label="Tổng Tiền Thực Thu"
                      value={
                        stats && typeof stats.totalCollected === "number"
                          ? stats.totalCollected.toLocaleString()
                          : "0"
                      }
                    />
                    <StatBox
                      label="Tổng Tiền Phiếu Hoàn Thành"
                      value={
                        stats && typeof stats.totalPaidAmount === "number"
                          ? stats.totalPaidAmount.toLocaleString()
                          : "0"
                      }
                    />
                    <StatBox
                      label="Tổng Số Phiếu Hoàn Thành"
                      value={
                        stats && typeof stats.totalPaidBills === "number"
                          ? stats.totalPaidBills
                          : "0"
                      }
                    />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="overflow-x-auto -mx-6">
              <div className="min-w-full px-6">
                <PaginatedTable
                  key={`pagination-${page}-${pageSize}`}
                  {...(initialFilters ? { initialFilters } : {})}
                  preserveFiltersOnEmpty={true}
                  enableSearch={true}
                  enableStatusFilter={true}
                  enableSingleDateFilter={true}
                  singleDateLabel="Ngày tạo phiếu"
                  availableStatuses={statusOptions}
                  enableEmployeeFilter={true}
                  availableEmployees={allEmployeeOptions}
                  canExport={canExportInDepartment("cong-no")}
                  page={page}
                  pageSize={pageSize}
                  total={total}
                  enablePageSize={true}
                  pageSizeOptions={[5, 10, 20, 50, 100]}
                  onPageChange={handlePageChange}
                  onPageSizeChange={handlePageSizeChange}
                  onFilterChange={handleFilterChange}
                  onResetFilter={handleResetFilter}
                  buttonClassNames={{ export: "", reset: "" }}
                  getExportData={getExportData}
                >
                  <DebtManagement
                    key={`debt-mgmt-${debts.length}-${page}`}
                    debts={debts}
                    expectedRowCount={Math.min(pageSize, debts.length)}
                    startIndex={(page - 1) * pageSize}
                    onReload={handleRefresh}
                    onEdit={handleEditDebt}
                    onDelete={handleDeleteDebt}
                  />
                </PaginatedTable>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Import Pay Date Modal */}
        <ImportPayDateModal
          open={showImportPayDate}
          onClose={() => setShowImportPayDate(false)}
          customerOptions={customerOptions}
          onSubmit={async ({ customerCodes, payDate }) => {
            try {
              const token = getAccessToken();
              if (!token) return;

              const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/debts/update-pay-later`,
                {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    customerCodes,
                    payDate, // already yyyy-MM-dd string
                  }),
                }
              );

              const result = await res.json();

              if (res.ok && result.updated > 0) {
                setAlert({
                  type: "success",
                  message: `Đã cập nhật ngày hẹn cho ${result.updated} khách hàng!`,
                });
                forceUpdate(); // Refresh data
                refreshStats(); // Refresh stats
              } else if (res.ok && result.updated === 0) {
                setAlert({
                  type: "error",
                  message:
                    "Không có khách hàng nào được cập nhật (có thể là loại fixed hoặc chưa có phiếu nợ)!",
                });
              } else {
                setAlert({
                  type: "error",
                  message: result?.message || "Cập nhật thất bại!",
                });
              }
            } catch (err) {
              setAlert({
                type: "error",
                message: "Lỗi khi cập nhật ngày hẹn!",
              });
            }
          }}
        />

        {/* Import Rollback Dialog */}
        <ImportRollbackDialog
          open={showImportRollback}
          onOpenChange={setShowImportRollback}
          onSuccess={(message) => {
            setAlert({ type: "success", message });
            // Refresh data sau khi rollback thành công
            forceUpdate();
            refreshStats();
          }}
          onError={(message) => {
            setAlert({ type: "error", message });
          }}
        />

        {/* Confirm dialog cho xóa tất cả */}
        <ConfirmDialog
          isOpen={showDeleteAllConfirm}
          title="⚠️ Xác nhận xóa tất cả công nợ"
          message={
            <Alert className="text-left border-gray-200 bg-white">
              <AlertDescription>
                <div className="space-y-3 text-black text-lg">
                  <div>
                    Bạn có chắc chắn muốn xóa{" "}
                    <span className="text-red-600 font-semibold">TẤT CẢ</span>{" "}
                    phiếu công nợ có ngày cập nhật hôm nay (
                    <span className="text-red-600 font-semibold">
                      {new Date().toLocaleDateString("vi-VN")}
                    </span>
                    )?
                  </div>
                  <div className="font-semibold text-red-600">
                    Thao tác này không thể hoàn tác!
                  </div>
                  <div>
                    <div className="mb-2">
                      ⚠️{" "}
                      <span className="text-red-600 font-semibold">Lưu ý:</span>{" "}
                      Những thông tin sau đây có thể không chính xác sau khi xóa
                      và nhập lại:
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      <li className="text-red-600">Ngày hẹn thanh toán</li>
                      <li className="text-red-600">Thông tin thanh toán</li>
                    </ul>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          }
          onConfirm={handleDeleteAllTodayDebts}
          onCancel={() => setShowDeleteAllConfirm(false)}
        />
      </div>
    </div>
  );
}
