"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import DebtManagement from "../../../../components/debt/manager-debt/DebtManagement";
import ImportPayDateModal from "../../../../components/debt/manager-debt/ImportPayDateModal";
import { getAccessToken } from "@/lib/auth";
import { DatePicker } from "@/components/ui/date-picker";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";

export default function ManagerDebtPage() {
  const [debts, setDebts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showImportPayDate, setShowImportPayDate] = useState(false);

  // Pagination & filter state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Bộ lọc
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Hàm fetch có header và token
  const fetchWithToken = async (url: string) => {
    const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok ? res.json() : [];
  };

  // Fetch all debts
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const debtsData = await fetchWithToken("/debts");
      setDebts(Array.isArray(debtsData) ? debtsData : debtsData.data || []);
    } catch {
      setAlert({ type: "error", message: "Lỗi tải dữ liệu nợ!" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // Lấy danh sách nhân viên từ dữ liệu nợ (unique)
  const employeeOptions = useMemo(() => {
    const names = debts.map(d => d.employee_name || d.sale_name_raw || d.sale_name).filter(Boolean);
    return Array.from(new Set(names)).map(name => ({ label: name, value: name }));
  }, [debts]);

  // Lấy danh sách trạng thái từ dữ liệu nợ (unique)
  const statusOptions = useMemo(() => {
    const statuses = debts.map(d => d.status).filter(Boolean);
    return Array.from(new Set(statuses)).map(s => ({ label: s, value: s }));
  }, [debts]);

  // Lấy danh sách mã khách hàng từ dữ liệu nợ (unique)
  const customerCodeOptions = useMemo(() => {
    const codes = debts.map(d => d.customer_code).filter(Boolean);
    return Array.from(new Set(codes)).map(code => ({ label: code, value: code }));
  }, [debts]);

  // Filter & phân trang ở frontend
  const filteredDebts = useMemo(() => {
    return Array.isArray(debts)
      ? debts.filter((d) => {
          // Lọc theo ngày tạo phiếu (singleDate)
          if (filterDate) {
            const created = d.created_at ? new Date(d.created_at) : undefined;
            if (!created || created.toDateString() !== filterDate.toDateString()) return false;
          }
          // Lọc theo nhân viên
          if (filterEmployee.length > 0) {
            const emp = d.employee_name || d.sale_name_raw || d.sale_name;
            if (!filterEmployee.includes(emp)) return false;
          }
          // Lọc theo trạng thái
          if (filterStatus.length > 0 && !filterStatus.includes(d.status)) return false;
          // Tìm kiếm từ khóa (bổ sung bill_code)
          if (search) {
            const keyword = search.toLowerCase();
            if (
              !(
                d.customer_name?.toLowerCase().includes(keyword) ||
                (d.employee_name || d.sale_name_raw || d.sale_name)?.toLowerCase().includes(keyword) ||
                d.invoice_code?.toLowerCase().includes(keyword) ||
                d.bill_code?.toLowerCase().includes(keyword)
              )
            ) {
              return false;
            }
          }
          return true;
        })
      : [];
  }, [debts, search, filterDate, filterEmployee, filterStatus]);

  const pagedDebts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return Array.isArray(filteredDebts)
      ? filteredDebts.slice(start, start + pageSize)
      : [];
  }, [filteredDebts, page, pageSize]);

  // Handler cho filter của PaginatedTable
  const handleFilterChange = (filters: any) => {
    setSearch(filters.search || "");
    setFilterEmployee(filters.departments || []); // dùng departments cho employee
    setFilterStatus(filters.statuses || []);
    // Nếu có filter ngày tạo phiếu (singleDate)
    if (filters.singleDate) {
      setFilterDate(filters.singleDate);
    } else {
      setFilterDate(undefined);
    }
    setPage(1);
  };

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            💰 Quản lý công nợ
          </CardTitle>
          <div className="flex gap-2">
            <form id="excel-upload-form" style={{ display: 'inline' }}>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                id="excel-upload-input"
                style={{ display: 'none' }}
                onChange={e => {
                  const file = e.target.files && e.target.files[0];
                  if (file) {
                    window.alert(`Đã chọn file: ${file.name}`);
                  }
                }}
              />
              <Button
                variant="import"
                type="button"
                onClick={() => {
                  const input = document.getElementById('excel-upload-input') as HTMLInputElement | null;
                  if (input) input.click();
                }}
              >
                + Nhập file Excel
              </Button>
            </form>
            <Button variant="add" onClick={() => setShowImportPayDate(true)}>
              + Nhập ngày hẹn thanh toán
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {/* Bộ lọc nâng cao dùng PaginatedTable */}
          <PaginatedTable
            enableSearch={true}
            enableDepartmentFilter={true}
            enableStatusFilter={true}
            enableSingleDateFilter={true}
            singleDateLabel="Ngày tạo phiếu"
            availableDepartments={employeeOptions.map(e => e.value)}
            availableStatuses={statusOptions}
            page={page}
            pageSize={pageSize}
            total={filteredDebts.length}
            onPageChange={setPage}
            onFilterChange={handleFilterChange}
            buttonClassNames={{ export: '', reset: '' }}
          >
            <DebtManagement
              debts={pagedDebts}
              expectedRowCount={pageSize}
              startIndex={(page - 1) * pageSize}
              onReload={fetchAll}
            />
          </PaginatedTable>
          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          {isLoading && (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} />
            </div>
          )}
        </CardContent>
      </Card>
      <ImportPayDateModal
        open={showImportPayDate}
        onClose={() => setShowImportPayDate(false)}
        customerOptions={customerCodeOptions}
        onSubmit={({ customerCodes, payDate }) => {
          // TODO: Gửi API cập nhật ngày hẹn thanh toán cho các mã khách hàng
          window.alert(`Đã chọn ${customerCodes.length} khách hàng, ngày: ${payDate ? payDate.toLocaleDateString() : ''}`);
        }}
      />
    </div>
  );
}
