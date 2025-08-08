"use client";

import React, { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useOrders } from "@/hooks/useOrders";
import type { OrderDetail } from "@/types";
import PaginatedTable, { Filters } from "@/components/ui/pagination/PaginatedTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ServerResponseAlert, type AlertType } from "@/components/ui/loading/ServerResponseAlert";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

function OrderTrashedContent() {
  const { currentUser } = useCurrentUser();
  const [alert, setAlert] = useState<{ type: AlertType; message: string } | null>(null);

  const {
    filters,
    setFilters,
    setPage,
    setPageSize,
    getFilterOptions,
    isLoading,
    // custom trashed APIs
    fetchTrashedOrders,
    bulkRestoreOrderDetails,
  } = useOrders() as ReturnType<typeof useOrders> & {
    fetchTrashedOrders: (filters: Partial<any>) => Promise<{ data: OrderDetail[]; total: number; page: number; pageSize: number }>;
    bulkRestoreOrderDetails: (ids: number[]) => Promise<void>;
  };

  const [filterOptions, setFilterOptions] = useState<{
    departments: Array<{ value: number; label: string; users: Array<{ value: number; label: string }> }>;
    products: Array<{ value: number; label: string }>;
  }>({ departments: [], products: [] });

  const [data, setData] = useState<OrderDetail[]>([]);
  const [total, setTotal] = useState(0);

  const loadData = useCallback(async () => {
    try {
      const res = await fetchTrashedOrders(filters);
      setData(res.data || []);
      setTotal(res.total || 0);
    } catch (e) {
      console.error(e);
      setAlert({ type: "error", message: "Tải danh sách đã xóa thất bại" });
    }
  }, [fetchTrashedOrders, filters]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Load filter options once
  useEffect(() => {
    (async () => {
      try {
        const opts = await getFilterOptions();
        setFilterOptions(opts);
      } catch {}
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

  const departmentOptions = filterOptions.departments.map((d) => ({ label: d.label, value: String(d.value) }));
  const productOptions = filterOptions.products.map((p) => ({ label: p.label, value: String(p.value) }));

  const handleFilterChange = useCallback((f: Filters) => {
    const employeesValue = f.employees.length > 0 ? f.employees.join(",") : "";
    const departmentsValue = f.departments.length > 0 ? f.departments.join(",") : "";
    const productsValue = f.categories.length > 0 ? f.categories.join(",") : ""; // reuse categories as products

    setFilters({
      ...filters,
      search: f.search || "",
      employees: employeesValue,
      departments: departmentsValue,
      products: productsValue,
      page: 1,
    });
  }, [filters, setFilters]);

  const handlePageChange = useCallback((p: number) => setPage(p), [setPage]);
  const handlePageSizeChange = useCallback((s: number) => setPageSize(s), [setPageSize]);

  const [selected, setSelected] = useState<Set<number | string>>(new Set());
  const selectedRows = data.filter((d) => selected.has(d.id));
  const isOwner = useCallback((od: OrderDetail) => !!(od?.order?.sale_by?.id && currentUser?.id && od.order!.sale_by!.id === currentUser.id), [currentUser?.id]);
  const canBulkRestore = selectedRows.length > 0 && selectedRows.every(isOwner);

  const handleBulkRestore = useCallback(async () => {
    if (!canBulkRestore) return;
    try {
      const ids = selectedRows.map((x) => Number(x.id));
      await bulkRestoreOrderDetails(ids);
      setAlert({ type: "success", message: `Đã khôi phục ${ids.length} đơn hàng` });
      setSelected(new Set());
      loadData();
    } catch (e) {
      setAlert({ type: "error", message: "Khôi phục thất bại" });
    }
  }, [selectedRows, canBulkRestore, bulkRestoreOrderDetails, loadData]);

  return (
    <div className="h-full overflow-hidden relative">
      {alert && (
        <ServerResponseAlert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />
      )}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">🗑️ Đơn hàng đã xóa</CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData}>🔄 Làm mới</Button>
            <Button variant="default" disabled={!canBulkRestore} title={canBulkRestore ? "Khôi phục" : "Chỉ khôi phục được đơn thuộc quyền sở hữu của bạn"} onClick={handleBulkRestore}>♻️ Khôi phục</Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={false}
            enableSingleDateFilter={false}
            enableDateRangeFilter={false}
            enableEmployeeFilter={true}
            enableDepartmentFilter={true}
            enableCategoriesFilter={true}
            enableWarningLevelFilter={false}
            enablePageSize={true}
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
            onResetFilter={() => setFilters({ search: "", employees: "", departments: "", products: "", page: 1 })}
            isRestoring={false}
            loading={isLoading}
            canExport={false}
            getExportData={() => ({ headers: [], data: [] })}
            initialFilters={{
              search: filters.search || "",
              departments: filters.departments ? filters.departments.split(",").filter(Boolean) : [],
              roles: [],
              statuses: [],
              categories: filters.products ? filters.products.split(",").filter(Boolean) : [],
              brands: [],
              warningLevels: [],
              dateRange: { from: undefined, to: undefined },
              singleDate: undefined,
              employees: filters.employees ? filters.employees.split(",").filter(Boolean) : [],
            }}
          >
            <div className="overflow-x-auto">
              <table className="min-w-[1400px] w-full text-sm">
                <thead>
                  <tr className="bg-slate-100">
                    <th className="p-2 w-[40px]"><input type="checkbox" checked={data.length>0 && data.every((d)=>selected.has(d.id))} onChange={(e)=>{
                      const checked = e.currentTarget.checked;
                      if (checked) setSelected(new Set(data.map((d)=>d.id)));
                      else setSelected(new Set());
                    }} /></th>
                    <th className="p-2 w-[60px]">#</th>
                    <th className="p-2">Mã đơn</th>
                    <th className="p-2">Nhân viên</th>
                    <th className="p-2">Khách hàng</th>
                    <th className="p-2">Mặt hàng</th>
                    <th className="p-2">SL</th>
                    <th className="p-2">Đơn giá</th>
                    <th className="p-2">Lý do xóa</th>
                    <th className="p-2">Ngày giờ xóa</th>
                    <th className="p-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 && (
                    <tr>
                      <td colSpan={11} className="text-center py-6 text-slate-500">Không có dữ liệu</td>
                    </tr>
                  )}
                  {data.map((od, idx) => {
                    const owner = !!(od?.order?.sale_by?.id && currentUser?.id && od.order!.sale_by!.id === currentUser.id);
                    return (
                      <tr key={String(od.id)} className="border-b">
                        <td className="p-2 text-center">
                          <input type="checkbox" checked={selected.has(od.id)} onChange={()=>{
                            const s = new Set(selected);
                            if (s.has(od.id)) s.delete(od.id); else s.add(od.id);
                            setSelected(s);
                          }} />
                        </td>
                        <td className="p-2 text-center">{(filters.page - 1) * filters.pageSize + idx + 1}</td>
                        <td className="p-2">#{od.id}</td>
                        <td className="p-2">{od.order?.sale_by?.fullName || od.order?.sale_by?.username || "--"}</td>
                        <td className="p-2">{od.customer_name || "--"}</td>
                        <td className="p-2">{od.raw_item || "--"}</td>
                        <td className="p-2 text-center">{od.quantity ?? 0}</td>
                        <td className="p-2 text-right">{od.unit_price ? Number(od.unit_price).toLocaleString("vi-VN") + "₫" : "0₫"}</td>
                        <td className="p-2">{od.reason || "--"}</td>
                        <td className="p-2">{od.deleted_at ? new Date(od.deleted_at as any).toLocaleString("vi-VN") : "--"}</td>
                        <td className="p-2">
                          <Button size="sm" variant="outline" disabled={!owner} title={owner?"Khôi phục":"Chỉ chủ sở hữu"} onClick={async()=>{
                            try { await bulkRestoreOrderDetails([Number(od.id)]); setAlert({type:"success", message:"Đã khôi phục 1 đơn"}); loadData(); }
                            catch { setAlert({type:"error", message:"Khôi phục thất bại"}); }
                          }}>Khôi phục</Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </PaginatedTable>
        </CardContent>
      </Card>
    </div>
  );
}

function Loading() {
  return (
    <div className="p-6">Đang tải...</div>
  );
}

export default function OrderTrashedPage() {
  return (
    <Suspense fallback={<Loading />}> 
      <OrderTrashedContent />
    </Suspense>
  );
}
