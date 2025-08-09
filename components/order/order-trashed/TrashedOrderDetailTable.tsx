"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import PaginatedTable, {
  type Filters,
} from "@/components/ui/pagination/PaginatedTable";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ServerResponseAlert,
  type AlertType,
} from "@/components/ui/loading/ServerResponseAlert";
import type { OrderDetail } from "@/types";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useTrashedOrders } from "@/hooks/useTrashedOrders";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

export default function TrashedOrderDetailTable() {
  const { currentUser } = useCurrentUser();
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);

  const {
    data,
    total,
    isLoading,
    filters,
    setFilters,
    setPage,
    setPageSize,
    getFilterOptions,
    reload,
    bulkRestoreOrderDetails,
  } = useTrashedOrders();

  // Load filter options once
  const [filterOptions, setFilterOptions] = useState<{
    departments: Array<{
      value: number;
      label: string;
      users: Array<{ value: number; label: string }>;
    }>;
    products: Array<{ value: number; label: string }>;
  }>({ departments: [], products: [] });

  useEffect(() => {
    (async () => {
      try {
        const opts = await getFilterOptions();
        setFilterOptions(opts);
      } catch (e) {
        // ignore
      }
    })();
  }, [getFilterOptions]);

  const allEmployeeOptions = useMemo(() => {
    return filterOptions.departments.reduce((acc, dept) => {
      dept.users.forEach((u) => {
        if (!acc.find((x) => x.value === String(u.value))) {
          acc.push({ label: u.label, value: String(u.value) });
        }
      });
      return acc;
    }, [] as { label: string; value: string }[]);
  }, [filterOptions.departments]);

  const departmentOptions = filterOptions.departments.map((d) => ({
    label: d.label,
    value: String(d.value),
  }));
  const productOptions = filterOptions.products.map((p) => ({
    label: p.label,
    value: String(p.value),
  }));

  const handleFilterChange = useCallback(
    (f: Filters) => {
      const employeesValue =
        f.employees.length > 0 ? f.employees.join(",") : "";
      const departmentsValue =
        f.departments.length > 0 ? f.departments.join(",") : "";
      const productsValue =
        f.categories.length > 0 ? f.categories.join(",") : ""; // reuse categories as products

      setFilters({
        search: f.search || "",
        employees: employeesValue,
        departments: departmentsValue,
        products: productsValue,
        page: 1,
      });
    },
    [setFilters]
  );

  const handlePageChange = useCallback((p: number) => setPage(p), [setPage]);
  const handlePageSizeChange = useCallback(
    (s: number) => setPageSize(s),
    [setPageSize]
  );

  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const selectedRows = data.filter((d) => selected.has(d.id));
  const isOwner = useCallback(
    (od: OrderDetail) =>
      !!(
        od?.order?.sale_by?.id &&
        currentUser?.id &&
        od.order!.sale_by!.id === currentUser.id
      ),
    [currentUser?.id]
  );
  const canBulkRestore = selectedRows.length > 0 && selectedRows.every(isOwner);

  const handleBulkRestore = useCallback(() => {
    if (!canBulkRestore) return;

    setConfirmDialog({
      isOpen: true,
      title: "Xác nhận khôi phục",
      message: `Bạn có chắc chắn muốn khôi phục ${selectedRows.length} đơn hàng đã chọn?`,
      onConfirm: async () => {
        try {
          const ids = selectedRows.map((x) => Number(x.id));
          await bulkRestoreOrderDetails(ids);
          setAlert({
            type: "success",
            message: `Đã khôi phục ${ids.length} đơn hàng`,
          });
          setSelected(new Set());
          reload();
        } catch (e) {
          setAlert({ type: "error", message: "Khôi phục thất bại" });
        } finally {
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  }, [selectedRows, canBulkRestore, bulkRestoreOrderDetails, reload]);

  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            🗑️ Đơn hàng đã xóa
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={reload}>
              🔄 Làm mới
            </Button>
            <Button
              variant="default"
              disabled={!canBulkRestore}
              title={
                canBulkRestore
                  ? "Khôi phục"
                  : "Chỉ khôi phục được đơn thuộc quyền sở hữu của bạn"
              }
              onClick={handleBulkRestore}
            >
              ♻️ Khôi phục
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch
            enableStatusFilter={false}
            enableSingleDateFilter={false}
            enableDateRangeFilter={false}
            enableEmployeeFilter
            enableDepartmentFilter
            enableCategoriesFilter
            enableWarningLevelFilter={false}
            enablePageSize
            availableStatuses={[]}
            availableEmployees={allEmployeeOptions}
            availableDepartments={departmentOptions}
            availableCategories={productOptions}
            availableWarningLevels={[]}
            singleDateLabel=""
            dateRangeLabel=""
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onFilterChange={handleFilterChange}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onResetFilter={() =>
              setFilters({
                search: "",
                employees: "",
                departments: "",
                products: "",
                page: 1,
              })
            }
            isRestoring={false}
            loading={isLoading}
            canExport={false}
            getExportData={() => ({ headers: [], data: [] })}
            initialFilters={{
              search: filters.search || "",
              departments: filters.departments
                ? filters.departments.split(",").filter(Boolean)
                : [],
              roles: [],
              statuses: [],
              categories: filters.products
                ? filters.products.split(",").filter(Boolean)
                : [],
              brands: [],
              warningLevels: [],
              dateRange: { from: undefined, to: undefined },
              singleDate: undefined,
              employees: filters.employees
                ? filters.employees.split(",").filter(Boolean)
                : [],
            }}
          >
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[40px]">
                    <Checkbox
                      checked={
                        data.length > 0 && data.every((d) => selected.has(d.id))
                      }
                      onCheckedChange={(checked) => {
                        if (checked)
                          setSelected(new Set(data.map((d) => d.id)));
                        else setSelected(new Set());
                      }}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-[60px]">#</TableHead>
                  <TableHead>Mã đơn</TableHead>
                  <TableHead>Nhân viên</TableHead>
                  <TableHead>Khách hàng</TableHead>
                  <TableHead>Mặt hàng</TableHead>
                  <TableHead>SL</TableHead>
                  <TableHead>Đơn giá</TableHead>
                  <TableHead>Lý do xóa</TableHead>
                  <TableHead>Ngày giờ xóa</TableHead>
                  <TableHead>Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={11}
                      className="text-center py-6 text-slate-500"
                    >
                      Không có dữ liệu
                    </TableCell>
                  </TableRow>
                )}
                {data.map((od, idx) => {
                  const owner = !!(
                    od?.order?.sale_by?.id &&
                    currentUser?.id &&
                    od.order!.sale_by!.id === currentUser.id
                  );
                  return (
                    <TableRow key={String(od.id)}>
                      <TableCell className="text-center">
                        <Checkbox
                          checked={selected.has(od.id)}
                          onCheckedChange={(checked) => {
                            const s = new Set(selected);
                            if (checked) s.add(od.id);
                            else s.delete(od.id);
                            setSelected(s);
                          }}
                          aria-label="Select row"
                        />
                      </TableCell>
                      <TableCell className="text-center">
                        {(filters.page - 1) * filters.pageSize + idx + 1}
                      </TableCell>
                      <TableCell>#{od.id}</TableCell>
                      <TableCell>
                        {od.order?.sale_by?.fullName ||
                          od.order?.sale_by?.username ||
                          "--"}
                      </TableCell>
                      <TableCell>{od.customer_name || "--"}</TableCell>
                      <TableCell>{od.raw_item || "--"}</TableCell>
                      <TableCell className="text-center">
                        {od.quantity ?? 0}
                      </TableCell>
                      <TableCell className="text-right">
                        {od.unit_price
                          ? Number(od.unit_price).toLocaleString("vi-VN") + "₫"
                          : "0₫"}
                      </TableCell>
                      <TableCell>{od.reason || "--"}</TableCell>
                      <TableCell>
                        {od.deleted_at
                          ? new Date(od.deleted_at as any).toLocaleString(
                              "vi-VN"
                            )
                          : "--"}
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="edit"
                          disabled={!owner}
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: "Xác nhận khôi phục",
                              message: `Bạn có chắc chắn muốn khôi phục đơn hàng #${od.id}?`,
                              onConfirm: async () => {
                                try {
                                  await bulkRestoreOrderDetails([
                                    Number(od.id),
                                  ]);
                                  setAlert({
                                    type: "success",
                                    message: "Đã khôi phục 1 đơn",
                                  });
                                  reload();
                                } catch {
                                  setAlert({
                                    type: "error",
                                    message: "Khôi phục thất bại",
                                  });
                                } finally {
                                  setConfirmDialog((prev) => ({
                                    ...prev,
                                    isOpen: false,
                                  }));
                                }
                              },
                            });
                          }}
                        >
                          Khôi phục
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </PaginatedTable>
        </CardContent>

        <ConfirmDialog
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() =>
            setConfirmDialog((prev) => ({ ...prev, isOpen: false }))
          }
          confirmText="Khôi phục"
          cancelText="Hủy"
        />
      </Card>
    </div>
  );
}
