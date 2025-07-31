"use client";

import React, { useState, useEffect, useCallback } from "react";
import { OrderDetail } from "@/types"; // ✅ Thay đổi từ Order thành OrderDetail
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { useOrders } from "@/hooks/useOrders";
import PaginatedTable, { Filters } from "@/components/ui/pagination/PaginatedTable";
import OrderManagement from "@/components/order/manager-order/OrderManagement";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useOrderPermissions } from "@/hooks/useOrderPermissions";

export default function ManagerOrderPage() {
  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  
  const { canExportInDepartment, user } = useDynamicPermission();
  const { 
    orders, 
    total, 
    filters, 
    setFilters,
    setPage, 
    setPageSize, 
    setSearch, 
    setStatus, 
    setDate, 
    setEmployee, 
    refetch,
    resetFilters,
    updateOrderDetail, 
    deleteOrderDetail, // ✅ Thay đổi từ deleteOrder thành deleteOrderDetail
    isLoading, 
    error 
  } = useOrders();

  const {
    canAccessOrderManagement,
    canCreateOrder,
    canImportOrder,
    canExportOrder,
    user: orderPermissionsUser
  } = useOrderPermissions();
  // Available options for filters
  const statusOptions = [
    { value: "completed", label: "Đã hoàn thành" },
    { value: "pending", label: "Chờ xử lý" },
    { value: "demand", label: "Nhu cầu" },
    { value: "quoted", label: "Đã báo giá" },
  ];

  // TODO: Lấy danh sách nhân viên thực tế từ API
  const allEmployeeOptions: { label: string; value: string }[] = [];

  // Convert PaginatedTable filters to useOrders filters
  const handleFilterChange = useCallback((paginatedFilters: Filters) => {
    // Update search
    setSearch(paginatedFilters.search || '');
    
    // Update status (take first status from array)
    setStatus(paginatedFilters.statuses.length > 0 ? paginatedFilters.statuses[0].toString() : '');
    
    // Update date
    if (paginatedFilters.singleDate) {
      const dateStr = paginatedFilters.singleDate instanceof Date ? 
        paginatedFilters.singleDate.toLocaleDateString("en-CA") : 
        paginatedFilters.singleDate.toString();
      setDate(dateStr);
    } else {
      setDate('');
    }
    
    // Update employee
    setEmployee(paginatedFilters.employees.length > 0 ? paginatedFilters.employees[0].toString() : '');
    
    // Reset to page 1 when filter changes
    setPage(1);
  }, [setSearch, setStatus, setDate, setEmployee, setPage]);

  const handlePageChange = useCallback((newPage: number) => {
    setPage(newPage);
  }, [setPage]);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
  }, [setPageSize]);

  const handleResetFilter = useCallback(() => {
    resetFilters();
  }, [resetFilters]);

  // ✅ Cập nhật handleEdit - nhận OrderDetail và data
  const handleEdit = useCallback(async (orderDetail: OrderDetail, data: any) => {
    try {
      await updateOrderDetail(Number(orderDetail.id), {
        status: data.status,
        unit_price: data.unit_price,
        customer_request_summary: data.customer_request_summary,
        extended: data.extended,
        notes: data.notes,
      });
      
      setAlert({ type: "success", message: "Cập nhật order detail thành công!" });
      refetch();
    } catch (err) {
      console.error("Error updating order detail:", err);
      setAlert({ type: "error", message: "Lỗi khi cập nhật order detail!" });
    }
  }, [updateOrderDetail, refetch]);

  // ✅ Cập nhật handleDelete - chỉ nhận OrderDetail và reason
  const handleDelete = useCallback(async (orderDetail: OrderDetail, reason: string) => {
    if (!confirm("Bạn có chắc chắn muốn xóa order detail này?")) return;
    
    try {
      await deleteOrderDetail(Number(orderDetail.id));
      setAlert({ type: "success", message: "Xóa order detail thành công!" });
      refetch();
    } catch (err) {
      console.error("Error deleting order detail:", err);
      setAlert({ type: "error", message: "Lỗi khi xóa order detail!" });
    }
  }, [deleteOrderDetail, refetch]); // ✅ Thay đổi dependency

  const handleReload = useCallback(() => {
    refetch();
  }, [refetch]);

  // Effects
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: error });
    }
  }, [error]);

  // Auto hide alert after 5 seconds
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setAlert(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [alert]);

  if (!user) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <div className={`mb-4 p-4 rounded-lg border ${
          alert.type === "error" 
            ? "bg-red-50 text-red-700 border-red-200" 
            : "bg-green-50 text-green-700 border-green-200"
        }`}>
          <div className="flex justify-between items-center">
            <span>{alert.message}</span>
            <button 
              onClick={() => setAlert(null)}
              className="ml-2 text-xl font-bold hover:opacity-70"
            >
              ×
            </button>
          </div>
        </div>
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">📦 Quản lý đơn hàng</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleReload}
              className="text-sm"
            >
              🔄 Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableSingleDateFilter={true}
            enableEmployeeFilter={true}
            enablePageSize={true}
            availableStatuses={statusOptions}
            availableEmployees={allEmployeeOptions}
            singleDateLabel="Ngày tạo đơn"
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onResetFilter={handleResetFilter}
            loading={isLoading}
            canExport={canExportInDepartment && canExportInDepartment(user?.departments?.[0]?.slug || "")}
            getExportData={() => ({
              headers: ["Mã đơn", "Gia hạn", "Khách hàng", "Ngày tạo", "Tổng tiền", "Trạng thái", "Customer Request"],
              // ✅ Sửa export data logic - orders giờ là OrderDetail[]
              data: orders.map(orderDetail => [
                orderDetail.id || '',
                orderDetail.extended || '',
                orderDetail.customer_name || '',
                orderDetail.created_at ? new Date(orderDetail.created_at).toLocaleDateString("vi-VN") : '',
                orderDetail.unit_price ? Number(orderDetail.unit_price).toLocaleString() : '0',
                orderDetail.status || '',
                orderDetail.customer_request_summary || '',
              ])
            })}
            initialFilters={{
              search: filters.search || "",
              departments: [],
              roles: [],
              statuses: filters.status ? [filters.status] : [],
              categories: [],
              brands: [],
              dateRange: { from: undefined, to: undefined },
              singleDate: filters.date,
              employees: filters.employee ? [filters.employee] : [],
            }}
          >
            <OrderManagement
              orders={orders}
              expectedRowCount={filters.pageSize}
              startIndex={(filters.page - 1) * filters.pageSize}
              onReload={handleReload}
              onEdit={handleEdit}
              onDelete={handleDelete}
              loading={isLoading}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
    </div>
  );
}
