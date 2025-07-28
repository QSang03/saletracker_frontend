"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { getAccessToken } from "@/lib/auth";
import { useApiState } from "@/hooks/useApiState";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { Order } from "@/types";
const PAGE_SIZE_KEY = "orderPageSize";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted min-w-[120px] text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

interface OrderFilters {
  search: string;
  singleDate: string;
  statuses: string[];
  employees: string[];
}

export default function ManagerOrderPage() {
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const {
    canReadDepartment,
    canExportInDepartment,
    user,
  } = useDynamicPermission();

  const canAccessOrderManagement = canReadDepartment("smc");

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(() => {
    if (typeof window !== "undefined") {
      const savedPageSize = localStorage.getItem(PAGE_SIZE_KEY);
      return savedPageSize ? parseInt(savedPageSize, 10) : 10;
    }
    return 10;
  });
  const [filters, setFilters] = useState<OrderFilters>({
    search: "",
    singleDate: new Date().toLocaleDateString("en-CA"),
    statuses: [],
    employees: [],
  });

  const [initialFilters, setInitialFilters] = useState<OrderFilters | undefined>(undefined);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const filterStr = localStorage.getItem("managerOrderFilter");
      if (filterStr) {
        try {
          const filter = JSON.parse(filterStr);
          const newFilters = {
            search: filter.search || "",
            singleDate: filter.singleDate || new Date().toLocaleDateString("en-CA"),
            statuses: [],
            employees: [],
          };
          setFilters(newFilters);
          setInitialFilters({ ...newFilters });
          setPage(1);
          setTimeout(() => {
            setInitialFilters(undefined);
            localStorage.removeItem("managerOrderFilter");
          }, 500);
        } catch (e) {
          localStorage.removeItem("managerOrderFilter");
        }
      }
    }
  }, []);

  // TODO: Thay fetchOrders bằng API thực tế cho orders
  const fetchOrders = useCallback(async (): Promise<{ data: Order[]; total: number }> => {
    const token = getAccessToken();
    if (!token) throw new Error("No token available");
    const params: Record<string, any> = {
      page,
      pageSize,
      search: filters.search,
      status: filters.statuses && filters.statuses.length > 0 ? filters.statuses[0] : undefined,
      date: filters.singleDate,
    };
    const queryStr = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join("&");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders?${queryStr}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
    const result = await res.json();
    
    // Handle different response formats
    if (Array.isArray(result)) {
      return { data: result, total: result.length };
    } else if (result.data && Array.isArray(result.data)) {
      return { data: result.data, total: result.total || result.data.length };
    } else {
      return { data: [], total: 0 };
    }
  }, [page, pageSize, filters]);

  const {
    data: ordersData,
    isLoading,
    error,
    forceUpdate,
  } = useApiState(fetchOrders, { data: [], total: 0 });

  const orders: Order[] = ordersData.data;
  const total = ordersData.total;

  const statusOptions = [
    { value: "completed", label: "Đã hoàn thành" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "cancelled", label: "Đã hủy" },
  ];

  // TODO: Lấy danh sách nhân viên thực tế nếu cần
  const allEmployeeOptions: { label: string; value: string }[] = [];

  // Handle filter changes
  const handleFilterChange = useCallback((newFilters: any) => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, []);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
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
    setPage(1);
    if (typeof window !== "undefined") {
      localStorage.removeItem(PAGE_SIZE_KEY);
    }
    setPageSize(10);
  }, []);

  useEffect(() => {
    if (error) {
      let errorMessage = "Lỗi khi tải dữ liệu đơn hàng!";
      if (typeof error === "string") errorMessage = error;
      else if (error && typeof error === "object") errorMessage = (error as any).message || String(error);
      setAlert({ type: "error", message: errorMessage });
    }
  }, [error]);

  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }


  // Nếu user chưa sẵn sàng, show loading kiểm tra quyền
  if (typeof user === "undefined" || user === null) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  // Nếu không có quyền truy cập
  if (!canAccessOrderManagement) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <div className="text-xl font-semibold text-red-600">Không có quyền truy cập</div>
        <div className="text-gray-600">Bạn không có quyền quản lý đơn hàng</div>
      </div>
    );
  }

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      <div className="h-full overflow-y-auto overflow-x-hidden p-6">
        <Card className="w-full max-w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">📦 Quản lý đơn hàng</CardTitle>
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => {
                  forceUpdate();
                }}
                variant="outline"
                className="text-sm"
              >
                🔄 Làm mới
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            {alert && (
              <ServerResponseAlert
                type={alert.type}
                message={alert.message}
                onClose={() => setAlert(null)}
              />
            )}
            <div className="overflow-x-auto -mx-6">
              <div className="min-w-full px-6">
                <PaginatedTable
                  {...(initialFilters ? { initialFilters } : {})}
                  preserveFiltersOnEmpty={true}
                  enableSearch={true}
                  enableStatusFilter={true}
                  enableSingleDateFilter={true}
                  singleDateLabel="Ngày tạo đơn"
                  availableStatuses={statusOptions}
                  enableEmployeeFilter={true}
                  availableEmployees={allEmployeeOptions}
                  canExport={canExportInDepartment("smc")}
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
                  getExportData={() => ({ headers: [], data: [] })}
                >
                  {/* Hiển thị chi tiết từng sản phẩm trong đơn hàng */}
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead>
                      <tr>
                        <th className="px-2 py-2">ID</th>
                        <th className="px-2 py-2">Gia hạn</th>
                        <th className="px-2 py-2">T/g bắt đầu</th>
                        <th className="px-2 py-2">T/g kết thúc</th>
                        <th className="px-2 py-2">Nhân viên bán hàng</th>
                        <th className="px-2 py-2">Khách hàng</th>
                        <th className="px-2 py-2">Sản phẩm</th>
                        <th className="px-2 py-2">Số lượng</th>
                        <th className="px-2 py-2">Đơn giá</th>
                        <th className="px-2 py-2">Status</th>
                        <th className="px-2 py-2">Customer Request</th>
                        
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(orders) && orders.length > 0 ? (
                        orders.flatMap((order, orderIdx) => {
                          if (!Array.isArray(order.details) || order.details.length === 0) return null;
                          return order.details
                            .filter((detail) => {
                              // Ẩn nếu extended = 0 hoặc có deleted_at
                              if (detail.extended === 0) return false;
                              if (detail.deleted_at) return false;
                              return true;
                            })
                            .map((detail, detailIdx) => (
                              <tr key={`${detail.id || order.id || orderIdx}-detail-${detailIdx}`} className="border-b">
                                <td className="px-2 py-2">{detail.id}</td>
                                <td className="px-2 py-2">{detail.extended} ngày</td>
                                <td className="px-2 py-2">{detail.created_at ? new Date(detail.created_at).toLocaleString("vi-VN") : ''}</td>
                                {detail.created_at && detail.extended ? (
                                    <td className="px-2 py-2">
                                      {
                                        new Date(
                                          new Date(detail.created_at).getTime() + Number(detail.extended) * 24 * 60 * 60 * 1000
                                        ).toLocaleString("vi-VN")
                                      }
                                    </td>
                                  ) : (
                                    <td className="px-2 py-2"></td>
                                  )}
                                <td className="px-2 py-2">{order.sale_by?.fullName || order.sale_by?.username || ''}</td>
                                <td className="px-2 py-2">
                                  {/* Ưu tiên in customer_name từ detail nếu có, nếu không thì gọi CustomerNameCell */}
                                  {detail.customer_name || ''}
                                </td>
                                <td className="px-2 py-2">{detail.raw_item || ''}</td>
                                <td className="px-2 py-2">{detail.quantity}</td>
                                <td className="px-2 py-2">{detail.unit_price ? Number(detail.unit_price).toLocaleString() : '0'}</td>
                                <td className="px-2 py-2">{detail.status}</td>
                                <td className="px-2 py-2">{detail.customer_request_summary || ''}</td>
                                
                              </tr>
                            ));
                        })
                      ) : (
                        <tr>
                          <td colSpan={14} className="text-center py-4 text-gray-400">Không có dữ liệu chi tiết đơn hàng</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </PaginatedTable>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
