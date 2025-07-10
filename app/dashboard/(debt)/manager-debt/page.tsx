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
  const [total, setTotal] = useState(0);

  // Bộ lọc
  const [filterDate, setFilterDate] = useState<Date | undefined>(undefined);
  const [filterEmployee, setFilterEmployee] = useState<string[]>([]);
  const [filterStatus, setFilterStatus] = useState<string[]>([]);

  // Lưu filter cũ để so sánh
  const [lastFilter, setLastFilter] = useState<any>({});

  // Lưu danh sách khách hàng unique
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);

  // Định nghĩa sẵn statusOptions
  const statusOptions = [
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'pay_later', label: 'Đã hẹn thanh toán' },
    { value: 'no_infomation_available', label: 'Không có thông tin' },
  ];

  // State cho filter nhân viên và ngày hẹn thanh toán (toàn bộ, không phụ thuộc filter)
  const [allEmployeeOptions, setAllEmployeeOptions] = useState<{ label: string; value: string }[]>([]);
  const [allPayLaterDates, setAllPayLaterDates] = useState<{ label: string; value: string }[]>([]);

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

  // Fetch debts với phân trang backend
  const fetchAll = async (date?: Date, pageNum = page, pageSizeNum = pageSize, filters: any = lastFilter) => {
    setIsLoading(true);
    try {
      let queryDate: string;
      if (date) {
        queryDate = date.toLocaleDateString('en-CA');
      } else {
        const now = new Date();
        queryDate = now.toLocaleDateString('en-CA');
      }
      // Gom filter
      const params: Record<string, any> = {
        date: queryDate,
        page: pageNum,
        pageSize: pageSizeNum,
      };
      if (filters.search) params.search = filters.search;
      if (filters.statuses && filters.statuses.length > 0) params.status = filters.statuses[0];
      if (filters.employees && filters.employees.length > 0) params.employeeCode = filters.employees[0];
      if (filters.customerCode) params.customerCode = filters.customerCode;
      if (filters.singleDate) params.singleDate = filters.singleDate instanceof Date ? filters.singleDate.toLocaleDateString('en-CA') : filters.singleDate;
      // Có thể mở rộng thêm các filter khác nếu cần
      const queryStr = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      const res = await fetchWithToken(`/debts?${queryStr}`);
      if (res && res.data) {
        setDebts(res.data);
        setTotal(res.total || 0);
      } else if (Array.isArray(res)) {
        setDebts(res);
        setTotal(res.length);
      } else {
        setDebts([]);
        setTotal(0);
      }
    } catch {
      setAlert({ type: "error", message: "Lỗi tải dữ liệu nợ!" });
      setDebts([]);
      setTotal(0);
    }
    setIsLoading(false);
  };

  // Fetch lại khi filterDate, page, pageSize đổi
  useEffect(() => {
    fetchAll(filterDate, page, pageSize, lastFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterDate, page, pageSize, lastFilter]);

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

  // Fetch toàn bộ nhân viên và ngày hẹn thanh toán khi mount (không phụ thuộc filter)
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
      try {
        const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
        // Lấy danh sách nhân viên và ngày hẹn thanh toán (không phân trang, không filter)
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts?all=1&page=1&pageSize=10000`, {
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const data = await res.json();
        if (Array.isArray(data.data)) {
          // Lấy unique nhân viên
          const names = data.data.map((d: any) => d.debt_config?.employee?.fullName || d.employee_code_raw || d.sale?.fullName || d.sale_name_raw).filter(Boolean);
          const uniqueNames = Array.from(new Set(names)).map(name => ({ label: String(name), value: String(name) }));
          setAllEmployeeOptions(uniqueNames);
          // Lấy unique ngày hẹn thanh toán
          const payLaterDates = data.data.map((d: any) => d.pay_later).filter(Boolean);
          const uniqueDates = Array.from(new Set(payLaterDates)).map(date => ({ label: new Date(String(date)).toLocaleDateString(), value: String(date) }));
          setAllPayLaterDates(uniqueDates);
        } else {
          setAllEmployeeOptions([]);
          setAllPayLaterDates([]);
        }
      } catch {
        setAllEmployeeOptions([]);
        setAllPayLaterDates([]);
      }
    };
    fetchAllFilterOptions();
  }, []);

  // Lấy danh sách nhân viên từ dữ liệu nợ (unique)
  const employeeOptions = useMemo(() => {
    const names = debts.map(d => d.employee_name || d.sale_name_raw || d.sale_name).filter(Boolean);
    return Array.from(new Set(names)).map(name => ({ label: name, value: name }));
  }, [debts]);

  // Lấy danh sách trạng thái từ dữ liệu nợ (unique)
  const statusOptionsFromData = useMemo(() => {
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

  // Thống kê công nợ từ dữ liệu debts hiện tại
  const totalAmount = useMemo(() => debts.reduce((sum, d) => sum + (Number(d.total_amount) || 0), 0), [debts]);
  const totalBills = debts.length;
  const totalCollected = useMemo(() => debts.reduce((sum, d) => sum + (d.status === 'paid' ? (Number(d.total_amount) || 0) : 0), 0), [debts]);
  const totalPaidBills = useMemo(() => debts.filter(d => d.status === 'paid').length, [debts]);

  // State thống kê công nợ lấy từ backend
  const [stats, setStats] = useState<{ totalAmount: number; totalBills: number; totalCollected: number; totalPaidBills: number } | null>(null);

  // Hàm fetch thống kê từ backend
  const fetchStats = async (filters: any = lastFilter) => {
    try {
      const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
      // Gom filter giống fetchAll
      const params: Record<string, any> = {};
      if (filters.search) params.search = filters.search;
      if (filters.statuses && filters.statuses.length > 0) params.status = filters.statuses[0];
      if (filters.employees && filters.employees.length > 0) params.employeeCode = filters.employees[0];
      if (filters.customerCode) params.customerCode = filters.customerCode;
      if (filters.singleDate) params.singleDate = filters.singleDate instanceof Date ? filters.singleDate.toLocaleDateString('en-CA') : filters.singleDate;
      const queryStr = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/stats${queryStr ? `?${queryStr}` : ''}`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const data = await res.json();
      setStats(data);
    } catch {
      setStats(null);
    }
  };

  // Fetch stats khi mount và khi filter đổi
  useEffect(() => {
    fetchStats(lastFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastFilter]);

  // Khi filter thay đổi từ PaginatedTable, truyền filter lên fetchAll
  const handleFilterChange = (filters: any) => {
    const isFilterChanged = JSON.stringify(filters) !== JSON.stringify(lastFilter);
    setSearch(filters.search || "");
    if (isFilterChanged) {
      setPage(1); // Reset về page 1 khi filter đổi
      setLastFilter(filters);
      fetchAll(filterDate, 1, pageSize, filters); // fetch lại với filter mới
    }
  };

  // Khi đổi page hoặc pageSize, fetch lại với filter hiện tại
  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
    fetchAll(filterDate, 1, newSize, lastFilter);
  };
  const handlePageChange = (newPage: number) => {
    setPage(newPage);
    fetchAll(filterDate, newPage, pageSize, lastFilter);
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

  // Hàm xuất CSV: loại bỏ cột số thứ tự và thao tác
  const getExportData = () => {
    const headers = [
      "Tên khách hàng",
      "NV Công nợ",
      "NV Bán hàng",
      "Số chứng từ",
      "Số hóa đơn",
      "Ngày chứng từ",
      "Ngày đến hạn",
      "Số ngày công nợ",
      "Số ngày quá hạn",
      "Ngày hẹn thanh toán",
      "Số tiền chứng từ",
      "Số tiền còn lại",
      "Trạng thái",
      "Ghi chú"
    ];
    const today = new Date();
    const getDaysBetween = (date1?: string | Date, date2?: string | Date) => {
      if (!date1 || !date2) return "";
      const d1 = new Date(date1);
      const d2 = new Date(date2);
      return Math.floor((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
    };
    const data = debts.map(debt => [
      debt?.debt_config?.customer_code || debt?.customer_raw_code || "",
      debt?.debt_config?.employee?.fullName || debt?.employee_code_raw || "",
      debt?.sale?.fullName || debt?.sale_name_raw || "",
      debt.invoice_code,
      debt.bill_code,
      debt.issue_date ? new Date(debt.issue_date).toLocaleDateString() : "",
      debt.due_date ? new Date(debt.due_date).toLocaleDateString() : "",
      debt.issue_date && debt.due_date ? getDaysBetween(debt.issue_date, debt.due_date) : "",
      debt.due_date ? getDaysBetween(debt.due_date, today) : "",
      debt?.pay_later ? new Date(debt.pay_later).toLocaleDateString() : "--",
      debt.total_amount ? Number(debt.total_amount).toLocaleString() : "",
      debt.remaining ? Number(debt.remaining).toLocaleString() : "",
      debt.status,
      debt.note || "--"
    ]);
    return { headers, data };
  };

  // Handler reset filter từ PaginatedTable
  const handleResetFilter = () => {
    setSearch("");
    setPage(1);
    setPageSize(10); // hoặc giá trị mặc định bạn muốn
    setFilterDate(undefined);
    setLastFilter({});
    fetchAll(undefined, 1, 10, {});
  };

  // Hàm xử lý cập nhật công nợ (patch)
  const handleEditDebt = async (debt: any, data: { note: string; status: string }) => {
    setIsLoading(true);
    setAlert(null);
    try {
      const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'Cập nhật thành công!' });
        fetchAll();
      } else {
        setAlert({ type: 'error', message: result?.message || 'Cập nhật thất bại!' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi cập nhật!' });
    }
    setIsLoading(false);
  };

  // Hàm xử lý xóa công nợ (delete)
  const handleDeleteDebt = async (debt: any) => {
    setIsLoading(true);
    setAlert(null);
    try {
      const token = getAccessToken ? getAccessToken() : (typeof window !== "undefined" ? localStorage.getItem("access_token") : undefined);
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      const result = await res.json();
      if (res.ok) {
        setAlert({ type: 'success', message: 'Xóa thành công!' });
        fetchAll();
      } else {
        setAlert({ type: 'error', message: result?.message || 'Xóa thất bại!' });
      }
    } catch (err) {
      setAlert({ type: 'error', message: 'Lỗi xóa công nợ!' });
    }
    setIsLoading(false);
  };

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
                  <StatBox label="Tổng Tiền" value={stats && typeof stats.totalAmount === 'number' ? stats.totalAmount.toLocaleString() : '0'} />
                  <StatBox label="Tổng Phiếu" value={stats && typeof stats.totalBills === 'number' ? stats.totalBills : '0'} />
                  <StatBox label="Tổng Tiền Đã Thu" value={stats && typeof stats.totalCollected === 'number' ? stats.totalCollected.toLocaleString() : '0'} />
                  <StatBox label="Tổng Phiếu Đã Thu Tiền" value={stats && typeof stats.totalPaidBills === 'number' ? stats.totalPaidBills : '0'} />
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
              enableEmployeeFilter={true}
              availableEmployees={allEmployeeOptions}
              // Nếu muốn tách filter NV công nợ và NV bán hàng, có thể truyền thêm availableDebtEmployees={debtEmployeeOptions} availableSaleEmployees={saleEmployeeOptions}
              page={page}
              pageSize={pageSize}
              total={total}
              enablePageSize={true}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              onFilterChange={handleFilterChange}
              onResetFilter={handleResetFilter}
              buttonClassNames={{ export: '', reset: '' }}
              getExportData={getExportData}
            >
              <DebtManagement
                debts={debts}
                expectedRowCount={pageSize}
                startIndex={(page - 1) * pageSize}
                onReload={() => fetchAll()}
                onEdit={handleEditDebt}
                onDelete={handleDeleteDebt}
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
              fetchAll(filterDate, page, pageSize);
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
