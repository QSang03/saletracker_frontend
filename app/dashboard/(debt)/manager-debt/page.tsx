"use client";
import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import DebtManagement from "../../../../components/debt/manager-debt/DebtManagement";
import ImportPayDateModal from "../../../../components/debt/manager-debt/ImportPayDateModal";
import { getAccessToken } from "@/lib/auth";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { useApiState } from "@/hooks/useApiState";

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
  singleDate?: Date | string;
  statuses: string[];
  employees: string[];
}

export default function ManagerDebtPage() {
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [showImportPayDate, setShowImportPayDate] = useState(false);

  // Pagination & filter state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState<DebtFilters>({
    search: "",
    singleDate: new Date(),
    statuses: [],
    employees: []
  });

  // Options for filters
  const [customerOptions, setCustomerOptions] = useState<{ label: string; value: string }[]>([]);
  const [allEmployeeOptions, setAllEmployeeOptions] = useState<{ label: string; value: string }[]>([]);

  // Fetch function for debts
  const fetchDebts = useCallback(async (): Promise<{ data: any[]; total: number }> => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }

    console.log('fetchDebts: Starting API call with page:', page, 'filters:', filters);

    // Build query parameters
    const params: Record<string, any> = {
      page,
      pageSize,
    };

    // Set date - use filter date or default to today
    let queryDate: string;
    if (filters.singleDate) {
      queryDate = filters.singleDate instanceof Date 
        ? filters.singleDate.toLocaleDateString('en-CA')
        : filters.singleDate;
    } else {
      queryDate = new Date().toLocaleDateString('en-CA');
    }
    params.date = queryDate;

    // Apply other filters
    if (filters.search) params.search = filters.search;
    if (filters.statuses && filters.statuses.length > 0) params.status = filters.statuses[0];
    if (filters.employees && filters.employees.length > 0) params.employee = filters.employees[0];

    const queryStr = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== null && v !== "")
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
      .join('&');

    console.log('API call:', `/debts?${queryStr}`);

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts?${queryStr}`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch debts: ${res.status}`);
    }

    const result = await res.json();
    console.log('fetchDebts API response:', { dataLength: result.data?.length, total: result.total });

    return {
      data: result.data || [],
      total: result.total || 0
    };
  }, [page, pageSize, filters]);

  // Fetch function for statistics
  const fetchStats = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return { totalAmount: 0, totalBills: 0, totalCollected: 0, totalPaidAmount: 0, totalPaidBills: 0 };

    try {
      let queryDate: string;
      if (filters.singleDate) {
        queryDate = filters.singleDate instanceof Date 
          ? filters.singleDate.toLocaleDateString('en-CA')
          : filters.singleDate;
      } else {
        queryDate = new Date().toLocaleDateString('en-CA');
      }

      const params: Record<string, any> = { date: queryDate, stats: 1 };
      
      // Apply same filters as main data
      if (filters.search) params.search = filters.search;
      if (filters.statuses && filters.statuses.length > 0) params.status = filters.statuses[0];
      if (filters.employees && filters.employees.length > 0) params.employee = filters.employees[0];

      const queryStr = Object.entries(params)
        .filter(([, v]) => v !== undefined && v !== null && v !== "")
        .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`)
        .join('&');

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/stats?${queryStr}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        return await res.json();
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
    
    return { totalAmount: 0, totalBills: 0, totalCollected: 0, totalPaidAmount: 0, totalPaidBills: 0 };
  }, [filters]);

  // Use the custom hook for debts
  const {
    data: debtsData,
    isLoading,
    error,
    forceUpdate
  } = useApiState(fetchDebts, { data: [], total: 0 }, {
    autoRefreshInterval: 30000 // 30 seconds
  });

  // Use the custom hook for stats
  const {
    data: stats,
    forceUpdate: refreshStats
  } = useApiState(fetchStats, { totalAmount: 0, totalBills: 0, totalCollected: 0, totalPaidAmount: 0, totalPaidBills: 0 }, {
    autoRefreshInterval: 30000 // 30 seconds
  });

  // Extract debts and total from data
  const debts = debtsData.data;
  const total = debtsData.total;

  // Refetch when page or filters change
  useEffect(() => {
    forceUpdate();
    refreshStats();
  }, [page, pageSize, filters, forceUpdate, refreshStats]);

  // Status options for filter
  const statusOptions = [
    { value: 'paid', label: 'Đã thanh toán' },
    { value: 'pay_later', label: 'Đã hẹn thanh toán' },
    { value: 'no_infomation_available', label: 'Không có thông tin' },
  ];

  // Fetch customer options
  useEffect(() => {
    const fetchCustomerOptions = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/customers`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
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

    fetchCustomerOptions();
  }, []);

  // Fetch all filter options (employees)
  useEffect(() => {
    const fetchAllFilterOptions = async () => {
      try {
        const token = getAccessToken();
        if (!token) return;

        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts?all=1&page=1&pageSize=10000`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await res.json();
        if (Array.isArray(data.data)) {
          // Get unique employees
          const names = data.data.map((d: any) => 
            d.debt_config?.employee?.fullName || 
            d.employee_code_raw || 
            d.sale?.fullName || 
            d.sale_name_raw
          ).filter(Boolean);
          
          const uniqueNames = [...new Set(names)].filter((name): name is string => typeof name === 'string');
          setAllEmployeeOptions(uniqueNames.map(name => ({ label: name, value: name })));
        }
      } catch (error) {
        console.error('Error fetching filter options:', error);
      }
    };

    fetchAllFilterOptions();
  }, []);

  // Handle filter changes
  const handleFilterChange = (newFilters: any) => {
    console.log('Filter change:', newFilters);
    setFilters(newFilters);
    setPage(1); // Reset to first page when filters change
  };

  const handlePageChange = (newPage: number) => {
    setPage(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const handleResetFilter = () => {
    setFilters({
      search: "",
      singleDate: new Date(),
      statuses: [],
      employees: []
    });
    setPage(1);
  };

  // Handle Excel import
  const handleExcelImport = async (file: File) => {
    const token = getAccessToken();
    if (!token) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/import-excel`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });

      const result = await res.json();
      
      if (res.ok) {
        setAlert({ type: "success", message: `Import thành công ${result.imported || 0} bản ghi!` });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
      } else {
        setAlert({ type: "error", message: result.message || "Import thất bại!" });
      }
    } catch (error) {
      console.error('Import error:', error);
      setAlert({ type: "error", message: "Lỗi khi import file!" });
    }
  };

  // Handle debt edit
  const handleEditDebt = async (debt: any, data: { note: string; status: string }) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data)
      });

      if (res.ok) {
        setAlert({ type: "success", message: "Cập nhật công nợ thành công!" });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
      } else {
        setAlert({ type: "error", message: "Cập nhật công nợ thất bại!" });
      }
    } catch (error) {
      console.error('Edit debt error:', error);
      setAlert({ type: "error", message: "Lỗi khi cập nhật công nợ!" });
    }
  };

  // Handle debt delete
  const handleDeleteDebt = async (debt: any) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/${debt.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setAlert({ type: "success", message: "Xóa công nợ thành công!" });
        forceUpdate(); // Refresh data
        refreshStats(); // Refresh stats
      } else {
        setAlert({ type: "error", message: "Xóa công nợ thất bại!" });
      }
    } catch (error) {
      console.error('Delete debt error:', error);
      setAlert({ type: "error", message: "Lỗi khi xóa công nợ!" });
    }
  };

  // Get export data - proper format
  const getExportData = () => {
    const data = debts.map((debt: any, index: number) => [
      (page - 1) * pageSize + index + 1,
      debt.customer_code || '',
      debt.customer_name || '',
      debt.bill_code || '',
      debt.created_at ? new Date(debt.created_at).toLocaleDateString('vi-VN') : '',
      debt.amount || 0,
      debt.status === 'paid' ? 'Đã thanh toán' : debt.status === 'pay_later' ? 'Đã hẹn thanh toán' : 'Không có thông tin',
      debt.note || '',
      debt.debt_config?.employee?.fullName || debt.employee_code_raw || debt.sale?.fullName || debt.sale_name_raw || '',
    ]);

    return {
      headers: ['STT', 'Mã KH', 'Tên KH', 'Số Phiếu', 'Ngày Tạo', 'Số Tiền', 'Trạng Thái', 'Ghi Chú', 'Nhân Viên'],
      data
    };
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: "Lỗi khi tải dữ liệu công nợ!" });
    }
  }, [error]);

  if (isLoading && debts.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang tải dữ liệu...</span>
      </div>
    );
  }

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto overflow-x-hidden p-6">
        <Card className="w-full max-w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">
              💰 Quản lý công nợ
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
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
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4 pb-2">
                    <StatBox label="Tổng Tiền Công Nợ" value={stats && typeof stats.totalAmount === 'number' ? stats.totalAmount.toLocaleString() : '0'} />
                    <StatBox label="Tổng Phiếu Công Nợ" value={stats && typeof stats.totalBills === 'number' ? stats.totalBills : '0'} />
                    <StatBox 
                      label="Tổng Tiền Thực Thu" 
                      value={stats && typeof stats.totalCollected === 'number' ? stats.totalCollected.toLocaleString() : '0'} 
                    />
                    <StatBox 
                      label="Tổng Tiền Phiếu Hoàn Thành"
                      value={stats && typeof stats.totalPaidAmount === 'number' ? stats.totalPaidAmount.toLocaleString() : '0'} 
                    />
                    <StatBox label="Tổng Số Phiếu Hoàn Thành" value={stats && typeof stats.totalPaidBills === 'number' ? stats.totalPaidBills : '0'} />
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            <div className="overflow-x-auto -mx-6">
              <div className="min-w-full px-6">
                <PaginatedTable
                  enableSearch={true}
                  enableStatusFilter={true}
                  enableSingleDateFilter={true}
                  singleDateLabel="Ngày tạo phiếu"
                  availableStatuses={statusOptions}
                  enableEmployeeFilter={true}
                  availableEmployees={allEmployeeOptions}
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
                    expectedRowCount={Math.min(pageSize, debts.length)}
                    startIndex={(page - 1) * pageSize}
                    onReload={() => {
                      forceUpdate();
                      refreshStats();
                    }}
                    onEdit={handleEditDebt}
                    onDelete={handleDeleteDebt}
                  />
                </PaginatedTable>
              </div>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="flex justify-center py-8">
                <LoadingSpinner size={32} />
              </div>
            )}
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

              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/debts/update-pay-later`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  customerCodes,
                  payDate // already yyyy-MM-dd string
                })
              });
              
              const result = await res.json();
              
              if (res.ok && result.updated > 0) {
                setAlert({ type: 'success', message: `Đã cập nhật ngày hẹn cho ${result.updated} khách hàng!` });
                forceUpdate(); // Refresh data
                refreshStats(); // Refresh stats
              } else if (res.ok && result.updated === 0) {
                setAlert({ type: 'error', message: 'Không có khách hàng nào được cập nhật (có thể là loại fixed)!' });
              } else {
                setAlert({ type: 'error', message: result?.message || 'Cập nhật thất bại!' });
              }
            } catch (err) {
              setAlert({ type: 'error', message: 'Lỗi khi cập nhật ngày hẹn!' });
            }
          }}
        />
      </div>
    </div>
  );
}