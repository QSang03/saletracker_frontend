"use client";
import React, { useState, useEffect, useMemo, useCallback } from "react";
import DebtSettingManagement from "@/components/debt/debt-setting/DebtSettingManagement";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import type { Filters } from "@/components/ui/pagination/PaginatedTable";
import DebtConfigModal from "@/components/debt/debt-setting/DebtConfigModal";
import AddManualDebtModal from "@/components/debt/debt-setting/AddManualDebtModal";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { getAccessToken } from "@/lib/auth";

export default function DebtSettingsPage() {
  const [data, setData] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
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
  const [alert, setAlert] = useState<{ type: any; message: string } | null>(null);
  const [apiData, setApiData] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  // Hàm lấy dữ liệu từ API
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ""}/debt-configs`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (!res.ok) throw new Error("Lỗi khi lấy dữ liệu công nợ");
      const apiData = await res.json();
      setApiData(apiData);
      setTotal(apiData.length);
    } catch (e) {
      setAlert({ type: "error", message: "Không thể lấy dữ liệu công nợ!" });
      setApiData([]);
      setTotal(0);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Lấy danh sách nhân viên từ apiData (unique employee_id + fullName)
  const employeeOptions = useMemo(() => {
    const map = new Map();
    apiData.forEach(item => {
      if (item.employee && item.employee.id && item.employee.fullName) {
        map.set(item.employee.id, item.employee.fullName);
      }
    });
    return Array.from(map.entries()).map(([id, label]) => ({ value: id, label }));
  }, [apiData]);

  // Hàm kiểm tra filter rỗng (dùng useCallback để không tạo lại mỗi lần render)
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

  // Callback filter, chỉ fetch lại data khi clear filter hoàn toàn
  const handleFilterChange = useCallback((f: Filters) => {
    setFilters(f);
    if (isAllFilterEmpty(f)) {
      setPage(1);
      fetchData();
    }
  }, [fetchData, isAllFilterEmpty]);

  // Hàm reset filter: trả về dữ liệu gốc như ban đầu
  const handleResetFilter = useCallback(() => {
    setFilters({
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
    setPage(1);
    fetchData();
  }, [fetchData]);

  // Memo hóa dữ liệu phân trang/filter để tránh tính lại không cần thiết
  const pagedData = useMemo(() => {
    let filtered = apiData;
    // Tìm kiếm theo mã KH hoặc tên Zalo khách
    if (filters.search && filters.search.trim() !== "") {
      const search = filters.search.trim().toLowerCase();
      filtered = filtered.filter(item =>
        (item.customer_code && item.customer_code.toLowerCase().includes(search)) ||
        (item.customer_name && item.customer_name.toLowerCase().includes(search))
      );
    }
    // Filter theo nhân viên
    if (filters.employees && filters.employees.length > 0) {
      filtered = filtered.filter(item => {
        if (!item.employee || !item.employee.id) return false;
        return filters.employees.map(String).includes(String(item.employee.id));
      });
    }
    // Filter theo ngày đã nhắc (send_last_at) chỉ dùng singleDate
    if (filters.singleDate) {
      const filterDate = new Date(filters.singleDate as Date);
      filtered = filtered.filter(item => {
        if (!item.send_last_at) return false;
        const date = new Date(item.send_last_at);
        return (
          date.getFullYear() === filterDate.getFullYear() &&
          date.getMonth() === filterDate.getMonth() &&
          date.getDate() === filterDate.getDate()
        );
      });
    }
    setTotal(filtered.length);
    return filtered.slice((page - 1) * pageSize, page * pageSize);
  }, [apiData, page, pageSize, filters]);

  // Hàm xuất file Excel/CSV
  const getExportData = () => {
    const headers = [
      "#",
      "Mã Khách Hàng",
      "Tổng Phiếu",
      "Tổng Số Nợ",
      "Loại KH",
      "Lịch Nhắc Nợ",
      "Ngày Đã Nhắc",
      "Trạng Thái Nhắc Nợ",
      "Ghi Chú",
    ];
    const exportRows = data.map((row, idx) => [
      (page - 1) * pageSize + idx + 1,
      row.customerCode,
      row.totalBills,
      row.totalDebt,
      row.customerType,
      row.remindSchedule || "--",
      row.lastRemindedDate || "--",
      row.remindStatus || "--",
      row.note || "--",
    ]);
    return { headers, data: exportRows };
  };

  // Hàm xử lý lưu cấu hình công nợ
  const handleSaveConfig = async () => {
    // Giả lập lưu thành công/thất bại (random)
    const isSuccess = Math.random() > 0.2;
    if (isSuccess) {
      setAlert({ type: "success", message: "Lưu cấu hình công nợ thành công!" });
      setShowConfigModal(false);
    } else {
      setAlert({ type: "error", message: "Lưu cấu hình công nợ thất bại!" });
    }
  };

  // Callback cập nhật trạng thái bật/tắt (chỉ cập nhật state trực tiếp, không fetch lại data)
  const handleToggle = (id: string, type: 'send' | 'repeat', value: boolean, updatedRow?: any) => {
    if (updatedRow && updatedRow.id) {
      setApiData(prev => prev.map(item => item.id === id ? updatedRow : item));
    }
  };
  // Callback xóa
  const handleDelete = (id: string) => {
    setApiData(prev => prev.filter(item => item.id !== id));
  };
  // Callback sửa (nếu có logic sửa inline)
  const handleEdit = (row: any) => {
    // Mở modal sửa hoặc cập nhật trực tiếp nếu cần
  };

  // Xử lý import file Excel
  const handleImportFile = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.xlsx,.xls';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      setImporting(true);
      try {
        const token = getAccessToken();
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || ''}/debt-configs/import`, {
          method: 'POST',
          body: formData,
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
        const result = await res.json();
        if (res.ok) {
          if (result.errors && result.errors.length > 0) {
            const errorMsg = result.errors.map((e: any) => `Dòng ${e.row}: ${e.error}`).join('\n');
            setAlert({ type: 'error', message: `Có lỗi khi import:\n${errorMsg}` });
          } else {
            setAlert({ type: 'success', message: `Import thành công: ${result.imported?.length || 0} dòng` });
            fetchData();
          }
        } else {
          setAlert({ type: 'error', message: result?.message || 'Import thất bại!' });
        }
      } catch (err) {
        setAlert({ type: 'error', message: 'Lỗi khi import file!' });
      } finally {
        setImporting(false);
      }
    };
    input.click();
  }, [fetchData]);

  const handlePageChange = useCallback((p: number) => setPage(p), []);
  const handlePageSizeChange = useCallback((s: number) => setPageSize(s), []);
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 py-6">
      {/* Hiển thị alert xác nhận lưu */}
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            🧾 Quản lý cấu hình công nợ
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="gradient" onClick={() => setShowConfigModal(true)}>
              Cấu Hình Công Nợ
            </Button>
            <Button variant="add" onClick={() => setShowAddManualModal(true)}>
              Thêm Công Nợ Thủ Công
            </Button>
            <Button variant="import" onClick={handleImportFile} disabled={importing}>
              {importing ? 'Đang nhập...' : 'Nhập File Dữ Liệu'}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <PaginatedTable
            emptyText="Không có dữ liệu"
            enableSearch={true}
            enablePageSize={true}
            enableEmployeeFilter={true}
            availableEmployees={employeeOptions}
            enableSingleDateFilter={true} // chỉ bật filter 1 ngày
            loading={isLoading}
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onFilterChange={handleFilterChange}
            getExportData={getExportData}
            onResetFilter={handleResetFilter}
          >
            <DebtSettingManagement
              data={pagedData}
              page={page}
              pageSize={pageSize}
              onToggle={handleToggle}
              onDelete={handleDelete}
              onEdit={handleEdit}
              onRefresh={fetchData}
              onShowAlert={setAlert}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
      <DebtConfigModal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        onSave={(success: boolean) => {
          if (success) {
            setAlert({ type: "success", message: "Lưu cấu hình công nợ thành công!" });
            setShowConfigModal(false);
          } else {
            setAlert({ type: "error", message: "Lưu cấu hình công nợ thất bại!" });
          }
        }}
      />
      <AddManualDebtModal
        open={showAddManualModal}
        onClose={() => setShowAddManualModal(false)}
        onSave={(success: boolean) => {
          if (success) {
            setAlert({ type: "success", message: "Thêm công nợ thủ công thành công!" });
            setShowAddManualModal(false);
          } else {
            setAlert({ type: "error", message: "Thêm công nợ thủ công thất bại!" });
          }
        }}
      />
    </div>
  );
}
