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
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted min-w-[120px] text-center">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

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

  // Lưu filter cũ để so sánh
  const [lastFilter, setLastFilter] = useState<any>({});

  // Lưu danh sách khách hàng unique
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);

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

  // Fetch all debts, truyền ngày filter lên backend
  const fetchAll = async (date?: Date) => {
    setIsLoading(true);
    try {
      let queryDate: string;
      if (date) {
        // Sử dụng toLocaleDateString('en-CA') để lấy đúng yyyy-MM-dd theo local, tránh lệch ngày do UTC
        queryDate = date.toLocaleDateString('en-CA');
      } else {
        const now = new Date();
        queryDate = now.toLocaleDateString('en-CA');
      }
      const debtsData = await fetchWithToken(`/debts?date=${queryDate}`);
      setDebts(Array.isArray(debtsData) ? debtsData : debtsData.data || []);
    } catch {
      setAlert({ type: "error", message: "Lỗi tải dữ liệu nợ!" });
    }
    setIsLoading(false);
  };

  // Fetch lại khi filterDate đổi
  useEffect(() => {
    fetchAll(filterDate);
  }, [filterDate]);

  // Fetch unique customers from backend
  const fetchCustomerOptions = async () => {
    try {
      const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/customers`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setCustomerOptions(data.map((c: any) => ({
          label: c.customer_name || c.name || c.customer_code || c.code,
          value: c.customer_code || c.code
        })));
      } else if (Array.isArray(data.data)) {
        setCustomerOptions(data.data.map((c: any) => ({
          label: c.customer_name || c.name || c.customer_code || c.code,
          value: c.customer_code || c.code
        })));
      } else {
        setCustomerOptions([]);
      }
    } catch {
      setCustomerOptions([]);
    }
  };

  // Fetch customer options on mount
  useEffect(() => {
    fetchCustomerOptions();
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

  // Lấy danh sách mã khách hàng unique
  const customerCodeOptions = useMemo(() => {
    const codes = debts.map(d => d.customer_raw_code || d.debt_config?.customer_code).filter(Boolean);
    return Array.from(new Set(codes)).map(code => ({ label: code, value: code }));
  }, [debts]);

  // Lấy danh sách NV công nợ unique
  const debtEmployeeOptions = useMemo(() => {
    const names = debts.map(d => d.debt_config?.employee?.fullName || d.employee_code_raw).filter(Boolean);
    return Array.from(new Set(names)).map(name => ({ label: name, value: name }));
  }, [debts]);

  // Lấy danh sách NV bán hàng unique
  const saleEmployeeOptions = useMemo(() => {
    const names = debts.map(d => d.sale?.fullName || d.sale_name_raw).filter(Boolean);
    return Array.from(new Set(names)).map(name => ({ label: name, value: name }));
  }, [debts]);

  // Lấy danh sách số chứng từ unique
  const invoiceCodeOptions = useMemo(() => {
    const codes = debts.map(d => d.invoice_code).filter(Boolean);
    return Array.from(new Set(codes)).map(code => ({ label: code, value: code }));
  }, [debts]);

  // Lấy danh sách số hóa đơn unique
  const billCodeOptions = useMemo(() => {
    const codes = debts.map(d => d.bill_code).filter(Boolean);
    return Array.from(new Set(codes)).map(code => ({ label: code, value: code }));
  }, [debts]);

  // Lấy danh sách nhân viên (gộp công nợ + bán hàng, loại trùng)
  const allEmployeeOptions = useMemo(() => {
    const names = [
      ...debts.map(d => d.debt_config?.employee?.fullName || d.employee_code_raw),
      ...debts.map(d => d.sale?.fullName || d.sale_name_raw)
    ].filter(Boolean);
    return Array.from(new Set(names)).map(name => ({ label: name, value: name }));
  }, [debts]);

  // Filter & phân trang ở frontend (lọc theo tất cả các trường filter)
  const filteredDebts = useMemo(() => {
    return Array.isArray(debts)
      ? debts.filter((d) => {
          // Lọc theo nhân viên (gộp cả công nợ và bán hàng)
          if (filterEmployee.length > 0) {
            const empList = [
              d.debt_config?.employee?.fullName,
              d.employee_code_raw,
              d.sale?.fullName,
              d.sale_name_raw
            ];
            if (!empList.some(emp => filterEmployee.includes(emp))) return false;
          }
          // Lọc theo trạng thái
          if (filterStatus.length > 0 && !filterStatus.includes(d.status)) return false;
          // Lọc theo mã khách hàng
          if (lastFilter.customerCodes && lastFilter.customerCodes.length > 0) {
            const code = d.customer_raw_code || d.debt_config?.customer_code;
            if (!lastFilter.customerCodes.includes(code)) return false;
          }
          // Lọc theo NV công nợ
          if (lastFilter.debtEmployees && lastFilter.debtEmployees.length > 0) {
            const emp = d.debt_config?.employee?.fullName || d.employee_code_raw;
            if (!lastFilter.debtEmployees.includes(emp)) return false;
          }
          // Lọc theo NV bán hàng
          if (lastFilter.saleEmployees && lastFilter.saleEmployees.length > 0) {
            const emp = d.sale?.fullName || d.sale_name_raw;
            if (!lastFilter.saleEmployees.includes(emp)) return false;
          }
          // Lọc theo số chứng từ
          if (lastFilter.invoiceCodes && lastFilter.invoiceCodes.length > 0) {
            if (!lastFilter.invoiceCodes.includes(d.invoice_code)) return false;
          }
          // Lọc theo số hóa đơn
          if (lastFilter.billCodes && lastFilter.billCodes.length > 0) {
            if (!lastFilter.billCodes.includes(d.bill_code)) return false;
          }
          // Tìm kiếm từ khóa (tìm trên nhiều trường)
          if (search) {
            const keyword = search.toLowerCase();
            const searchFields = [
              d.customer_name,
              d.customer_raw_code,
              d.debt_config?.customer_code,
              d.debt_config?.employee?.fullName,
              d.employee_code_raw,
              d.sale?.fullName,
              d.sale_name_raw,
              d.invoice_code,
              d.bill_code
            ];
            if (!searchFields.some(f => typeof f === 'string' && f.toLowerCase().includes(keyword))) {
              return false;
            }
          }
          return true;
        })
      : [];
  }, [debts, search, filterEmployee, filterStatus, lastFilter]);

  const pagedDebts = useMemo(() => {
    const start = (page - 1) * pageSize;
    return Array.isArray(filteredDebts)
      ? filteredDebts.slice(start, start + pageSize)
      : [];
  }, [filteredDebts, page, pageSize]);

  // Handler cho filter của PaginatedTable
  const handleFilterChange = (filters: any) => {
    // So sánh filter cũ và mới (bỏ qua page)
    const filterKeys = ["search", "departments", "statuses", "singleDate"];
    let isFilterChanged = false;
    for (const key of filterKeys) {
      if (JSON.stringify(filters[key]) !== JSON.stringify(lastFilter[key])) {
        isFilterChanged = true;
        break;
      }
    }
    setSearch(filters.search || "");
    setFilterEmployee(filters.departments || []);
    setFilterStatus(filters.statuses || []);
    // Chỉ setFilterDate, fetchAll sẽ tự động gọi lại qua useEffect
    if (filters.singleDate !== undefined) {
      setFilterDate(filters.singleDate);
    } else {
      setFilterDate(undefined);
    }
    if (isFilterChanged) {
      setPage(1);
    }
    setLastFilter(filters);
  };

  // Upload Excel và import công nợ
  const handleExcelImport = async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    setIsLoading(true);
    setAlert(null);
    try {
      const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/import-excel`, {
        method: 'POST',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });
      const result = await res.json();
      if (res.ok) {
        // Nếu có lỗi chi tiết, show từng lỗi
        if (Array.isArray(result.errors) && result.errors.length > 0) {
          result.errors.forEach((err: any) => {
            setAlert({ type: 'error', message: `Dòng ${err.row}: ${err.error}` });
          });
        } else {
          setAlert({ type: 'success', message: `Import thành công: ${result.imported?.length || 0} dòng, lỗi: 0` });
        }
        fetchAll();
      } else {
        setAlert({ type: 'error', message: result?.message || 'Import thất bại!' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi import file!' });
    }
    setIsLoading(false);
  };

  // Thống kê
  const totalAmount = filteredDebts.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0);
  const totalRemaining = filteredDebts.reduce((sum, d) => sum + (Number(d.remaining) || 0), 0);
  const totalCollected = totalAmount - totalRemaining;
  const totalBills = filteredDebts.length;
  const totalPaidBills = filteredDebts.filter(d => d.status === 'paid' || d.status === 'Đã thanh toán').length;

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 py-6">
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
                    handleExcelImport(file);
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
          {/* Accordion thống kê */}
          <Accordion type="single" collapsible defaultValue="stats">
            <AccordionItem value="stats">
              <AccordionTrigger>Thống Kê Công Nợ Trong Ngày</AccordionTrigger>
              <AccordionContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pb-2">
                  <StatBox label="Tổng Tiền" value={totalAmount.toLocaleString()} />
                  <StatBox label="Tổng Phiếu" value={totalBills} />
                  <StatBox label="Tổng Tiền Đã Thu" value={totalCollected.toLocaleString()} />
                  <StatBox label="Tổng Phiếu Đã Thu Tiền" value={totalPaidBills} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
          <div className="max-w-[calc(100vw-20rem)]">
            {/* Tổng số dòng dưới filter */}
            <PaginatedTable
              enableSearch={true}
              enableStatusFilter={true}
              enableSingleDateFilter={true}
              singleDateLabel="Ngày tạo phiếu"
              availableStatuses={statusOptions}
              availableDepartments={allEmployeeOptions.map(e => e.value)}
              enableEmployeeFilter={true}
              availableEmployees={allEmployeeOptions}
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
          </div>
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
        customerOptions={customerOptions}
        onSubmit={async ({ customerCodes, payDate }) => {
          setIsLoading(true);
          setAlert(null);
          try {
            const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/update-pay-later`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                customerCodes,
                payDate // đã là yyyy-MM-dd string
              })
            });
            const result = await res.json();
            if (res.ok && result.updated > 0) {
              setAlert({ type: 'success', message: `Đã cập nhật ngày hẹn cho ${result.updated} khách hàng!` });
              fetchAll();
            } else if (res.ok && result.updated === 0) {
              setAlert({ type: 'error', message: 'Không có khách hàng nào được cập nhật (có thể là loại fixed)!' });
            } else {
              setAlert({ type: 'error', message: result?.message || 'Cập nhật thất bại!' });
            }
          } catch (err) {
            setAlert({ type: 'error', message: 'Lỗi khi cập nhật ngày hẹn!' });
          }
          setIsLoading(false);
        }}
      />
    </div>
  );
}
