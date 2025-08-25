'use client';

import { useState, useEffect } from 'react';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import OrderManagement from '@/components/order/manager-order/OrderManagement';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Download, Search, Filter, Calendar, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { vi } from 'date-fns/locale';
import PaginatedTable, { Filters as PaginatedFilters } from '@/components/ui/pagination/PaginatedTable';
import { getAccessToken } from '@/lib/auth';

interface Order {
  id: number;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  total_amount: number;
  status: string;
  created_at: string;
  updated_at: string;
  employee_code?: string;
  department_name?: string;
}

interface OrderStats {
  total_orders: number;
  total_amount: number;
  pending_orders: number;
  completed_orders: number;
  cancelled_orders: number;
}

export default function PmTransactionManagement() {
  const { isPM, getPMDepartments, isAdmin, getAccessibleDepartments } = useDynamicPermission();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [dateRangeState, setDateRangeState] = useState<{ start?: string; end?: string } | null>(null);
  const [pageSize, setPageSize] = useState(10);
  const [error, setError] = useState<string | null>(null);
  const [employeesSelected, setEmployeesSelected] = useState<(string | number)[]>([]);
  const [warningLevelFilter, setWarningLevelFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalOrder, setModalOrder] = useState<Order | null>(null);
  const [modalMessages, setModalMessages] = useState<any[]>([]);
  const [filterOptions, setFilterOptions] = useState<{ departments: any[]; products?: any[] }>({ departments: [], products: [] });
  const [departmentsSelected, setDepartmentsSelected] = useState<(string | number)[]>([]);

  // Nếu là admin, dùng danh sách departments khả dụng; nếu không, dùng pm-{dept}
  const pmDepartments = isAdmin ? getAccessibleDepartments() : getPMDepartments;
  // Admin luôn được xem toàn bộ phòng ban — nếu là admin bỏ qua kiểm tra pm-specific
  const hasSpecificPMRole = isAdmin || (pmDepartments && pmDepartments.length > 0);

  // Fetch orders data
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams();
      params.set('page', currentPage.toString());
      params.set('pageSize', pageSize.toString());

      // only add search/status when provided to avoid sending empty values
      if (searchTerm && String(searchTerm).trim()) {
        params.set('search', String(searchTerm).trim());
      }

      if (statusFilter && statusFilter !== 'all') {
        params.set('status', statusFilter);
      }

      // date handling: if custom date range provided, send dateFrom/dateTo, else send date short token
      if (dateRangeState && dateRangeState.start && dateRangeState.end) {
        params.set('dateFrom', dateRangeState.start);
        params.set('dateTo', dateRangeState.end);
      } else if (dateFilter && dateFilter !== 'all') {
        params.set('date', dateFilter);
      }

      // optional filters for departments / employees (CSV) - only apply if user explicitly selected departments
      if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
        params.set('departments', departmentsSelected.join(','));
      }
      if (Array.isArray(employeesSelected) && employeesSelected.length > 0) {
        params.set('employees', employeesSelected.join(','));
      }

      if (warningLevelFilter && warningLevelFilter !== '') {
        params.set('warningLevel', warningLevelFilter);
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const token = getAccessToken();
      const url = `${baseUrl}/orders?${params.toString()}`;
      // Debug: log request URL and token presence
      // eslint-disable-next-line no-console
  console.debug('[PM] fetchOrders URL:', url, 'departmentsSelected=', departmentsSelected);
      // eslint-disable-next-line no-console
      console.debug('[PM] token present:', !!token);
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu giao dịch');
      }

      // capture body for debugging when necessary
      let data: any;
      try {
        data = await response.json();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.debug('[PM] fetchOrders: failed to parse json response', e);
        const text = await response.text();
        // eslint-disable-next-line no-console
        console.debug('[PM] fetchOrders response text:', text.slice ? text.slice(0, 2000) : text);
        throw e;
      }
      // eslint-disable-next-line no-console
      console.debug('[PM] fetchOrders result count:', Array.isArray(data?.data) ? data.data.length : (Array.isArray(data) ? data.length : 0), 'total:', data?.total);
  setOrders(data.data || []);
  const total = Number(data.total || 0);
  setTotalItems(total);
  setTotalPages(Math.ceil(total / pageSize));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const token = getAccessToken();
  const response = await fetch(`${baseUrl}/orders/stats/overview?period=day`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    // Nếu là PM hoặc admin thì tải dữ liệu
    if (isPM || isAdmin) {
      fetchOrders();
      fetchStats();
    }
  }, [isPM, isAdmin, currentPage, searchTerm, statusFilter, dateFilter, departmentsSelected]);

  // Sync effect: refetch when pageSize or dateRangeState changes
  useEffect(() => {
    if (isPM || isAdmin) fetchOrders();
  }, [pageSize, dateRangeState, departmentsSelected]);

  // Load filter options (departments/employees) similar to Order page
  useEffect(() => {
    const load = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const token = getAccessToken();
        const foUrl = `${baseUrl}/orders/filter-options`;
        // eslint-disable-next-line no-console
        console.debug('[PM] fetch filter-options URL:', foUrl, ' token present:', !!token);
        const res = await fetch(foUrl, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) return;
        const json = await res.json();
        const departments = json.departments || [];
        setFilterOptions({ departments, products: json.products || [] });

        // If user is PM (non-admin) and hasn't selected departments explicitly,
        // try to map their pm-<slug> roles to department values and apply as default selection
        if (!isAdmin && Array.isArray(pmDepartments) && pmDepartments.length > 0) {
          // don't overwrite if user already selected departments
          if (!departmentsSelected || departmentsSelected.length === 0) {
            const mapped: (string | number)[] = [];

            pmDepartments.forEach((pm: any) => {
              // pm might be slug (string)
              const slug = String(pm).toLowerCase();
              const found = departments.find((d: any) => {
                // try matching value, label or slug fields
                if (d == null) return false;
                const val = d.value != null ? String(d.value).toLowerCase() : '';
                const label = d.label != null ? String(d.label).toLowerCase() : '';
                const deptSlug = d.slug != null ? String(d.slug).toLowerCase() : '';
                return val === slug || label === slug || deptSlug === slug || label.includes(slug);
              });
              if (found) mapped.push(found.value != null ? found.value : slug);
              else mapped.push(pm);
            });

            if (mapped.length > 0) {
              // eslint-disable-next-line no-console
              console.debug('[PM] mapped pm departments ->', mapped);
              setDepartmentsSelected(mapped);
              // trigger fetch with mapped departments
              try {
                // small delay to ensure state updates propagate
                setTimeout(() => {
                  fetchOrders();
                }, 50);
              } catch (e) {}
            }
          }
        }
      } catch (err) {
        console.error('Error loading filter options', err);
      }
    };

    if (isPM || isAdmin) load();
  }, [isPM, isAdmin]);

  const handleFilterChange = (f: PaginatedFilters) => {
    try {
  // eslint-disable-next-line no-console
  console.debug('[PM] handleFilterChange', f);
      // search
      setSearchTerm(f.search || '');

      // statuses -> join CSV or set 'all'
      if (f.statuses && f.statuses.length > 0) {
        setStatusFilter((f.statuses as string[]).join(','));
      } else {
        setStatusFilter('all');
      }

      // employees / departments
      if (f.employees && f.employees.length > 0) {
  const emps = f.employees as (string | number)[];
  // eslint-disable-next-line no-console
  console.debug('[PM] employees selected', emps);
  setEmployeesSelected(emps);
      } else {
        setEmployeesSelected([]);
      }

      // departments selected by user in the filter UI
      if (f.departments && f.departments.length > 0) {
        setDepartmentsSelected(f.departments as string[]);
      } else {
        setDepartmentsSelected([]);
      }

      // date handling
      if (f.singleDate) {
        const d = f.singleDate instanceof Date ? f.singleDate : new Date(f.singleDate as string);
        const val = d.toLocaleDateString('en-CA');
        setDateFilter(val);
        setDateRangeState(null);
      } else if (f.dateRange && (f.dateRange as any).from && (f.dateRange as any).to) {
        const from = (f.dateRange as any).from.toLocaleDateString('en-CA');
        const to = (f.dateRange as any).to.toLocaleDateString('en-CA');
        setDateRangeState({ start: from, end: to });
        setDateFilter('custom');
      } else {
        // keep 'all' or previous
        setDateFilter('all');
        setDateRangeState(null);
      }

      // warning levels mapping (PaginatedTable passes labels)
      if (f.warningLevels && f.warningLevels.length > 0) {
        const mappedLevels = (f.warningLevels as (string | number)[]).map((w) => {
          const found = warningLevelOptions.find((opt) => String(opt.label) === String(w) || String(opt.value) === String(w));
          return found ? String(found.value) : String(w);
        });
        // eslint-disable-next-line no-console
        console.debug('[PM] warning levels selected (mapped) ->', mappedLevels);
        setWarningLevelFilter(mappedLevels.join(','));
      } else {
        setWarningLevelFilter('');
      }

      // reset to page 1 after filter change
      setCurrentPage(1);
    } catch (e) {
      console.error('Error handling filters', e);
    }
  };

  // Export data
  const handleExport = async () => {
    try {
  const params = new URLSearchParams();
  if (searchTerm && String(searchTerm).trim()) params.set('search', String(searchTerm).trim());
  if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter);
  if (dateFilter && dateFilter !== 'all') params.set('date_filter', dateFilter);
  params.set('export', 'true');

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const token = getAccessToken();
      const response = await fetch(`${baseUrl}/orders/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `giao-dich-pm-${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Error exporting data:', err);
    }
  };

  // Get status badge color
  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return <Badge variant="secondary">Chờ xử lý</Badge>;
      case 'processing':
        return <Badge variant="default">Đang xử lý</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-500">Hoàn thành</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">Đã hủy</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  // Format date
  const formatDate = (dateString: string) => {
    return format(new Date(dateString), 'dd/MM/yyyy HH:mm', { locale: vi });
  };

  // Status options and warning levels (match Order page labels)
  const statusOptions = [
    { value: 'completed', label: 'Đã chốt' },
    { value: 'pending', label: 'Chờ xử lý' },
    { value: 'processing', label: 'Đang xử lý' },
    { value: 'cancelled', label: 'Đã hủy' },
  ];

  const warningLevelOptions = [
    { value: '1', label: 'Cảnh báo 1 (Ngày cuối)' },
    { value: '2', label: 'Cảnh báo 2' },
    { value: '3', label: 'Cảnh báo 3' },
    { value: '4', label: 'Bình thường' },
  ];

  // Reset filters handler mapped to local state and refetch
  const handleResetFilter = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setDateFilter('all');
    setDateRangeState(null);
    setPageSize(10);
    setCurrentPage(1);
    // trigger fetch after resetting
    fetchOrders();
  };

  // Export data helper (returns headers + mapped rows for current visible orders)
  const getExportData = () => {
    const headers = [
      'Mã đơn',
      'Khách hàng',
      'Số điện thoại',
      'Giá trị',
      'Trạng thái',
      'Nhân viên',
      'Phòng ban',
      'Ngày tạo',
    ];

    const data = orders.map((o) => [
      o.order_code || '--',
      o.customer_name || '--',
      o.customer_phone || '--',
      o.total_amount != null ? Number(o.total_amount) : '--',
      o.status || '--',
      o.employee_code || '--',
      o.department_name || '--',
      o.created_at || '--',
    ]);

    return { headers, data };
  };

  // Export all data helper - fetches all rows from backend respecting current filters
  const getExportAllData = async () => {
    const params = new URLSearchParams({
      page: '1',
      pageSize: '1000000',
      search: searchTerm || '',
      status: statusFilter !== 'all' ? statusFilter : '',
    });

    if (dateRangeState && dateRangeState.start && dateRangeState.end) {
      params.set('dateFrom', dateRangeState.start);
      params.set('dateTo', dateRangeState.end);
    } else if (dateFilter && dateFilter !== 'all') {
      params.set('date', dateFilter);
    }

    // prefer explicit selection, otherwise for non-admin use pmDepartments
    if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
      params.set('departments', departmentsSelected.join(','));
    } else if (!isAdmin && Array.isArray(pmDepartments) && pmDepartments.length > 0) {
      params.set('departments', pmDepartments.join(','));
    }

    if (Array.isArray(employeesSelected) && employeesSelected.length > 0) {
      params.set('employees', employeesSelected.join(','));
    }

    if (warningLevelFilter && warningLevelFilter !== '') {
      params.set('warningLevel', warningLevelFilter);
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const token = getAccessToken();
    const res = await fetch(`${baseUrl}/orders?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const json = await res.json();
    const list = Array.isArray(json) ? json : Array.isArray(json.data) ? json.data : [];
    return list.map((o: any) => [
      o.order_code || '--',
      o.customer_name || '--',
      o.customer_phone || '--',
      o.total_amount != null ? Number(o.total_amount) : '--',
      o.status || '--',
      o.employee_code || '--',
      o.department_name || '--',
      o.created_at || '--',
    ]);
  };

  if (!isPM && !isAdmin) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Bạn không có quyền truy cập vào chức năng này.
        </AlertDescription>
      </Alert>
    );
  }

  // Nếu không phải admin và cũng không có role PM cụ thể thì hiện thông báo
  if (!isAdmin && !hasSpecificPMRole) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Không có dữ liệu</CardTitle>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn chưa được phân quyền cho phòng ban cụ thể nào. 
              Dữ liệu sẽ được hiển thị khi bạn được cấp quyền xem phòng ban.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="h-full overflow-hidden relative">
      {/* Statistics Cards removed per request */}

      <Card className="w-full max-w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">Danh sách giao dịch</CardTitle>
          <div className="flex gap-2 flex-wrap">
            <Button variant="outline" onClick={() => fetchOrders()} className="text-sm">
              🔄 Làm mới
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <PaginatedTable
        enableSearch={true}
        enableStatusFilter={true}
  enableEmployeeFilter={true}
  // Show department filter control so users can select departments
  enableDepartmentFilter={true}
        enableDateRangeFilter={true}
        enableSingleDateFilter={true}
        enableWarningLevelFilter={true}
        enablePageSize={true}
        enableGoToPage={true}
        page={currentPage}
        total={totalItems}
        pageSize={pageSize}
        onPageChange={(p) => setCurrentPage(p)}
        onPageSizeChange={(s) => setPageSize(s)}
        onFilterChange={handleFilterChange}
        onDepartmentChange={(vals) => {
          // immediate handler when user changes departments in the toolbar
          // eslint-disable-next-line no-console
          console.debug('[PM] onDepartmentChange immediate', vals);
          setDepartmentsSelected(vals as (string | number)[]);
          setCurrentPage(1);
          try {
            fetchOrders();
          } catch (e) {}
        }}
        onResetFilter={handleResetFilter}
        loading={loading}
        canExport={true}
        getExportData={getExportData}
        getExportAllData={getExportAllData}
        availableStatuses={statusOptions}
        availableDepartments={
          isAdmin
            ? (filterOptions.departments || []).map((d: any) => ({ value: d.value, label: d.label }))
            : ((): any => {
                const depts = (filterOptions.departments || []).map((d: any) => ({ value: d.value, label: d.label }));
                const matched = depts.filter((d: any) => pmDepartments.includes(String(d.value)) || pmDepartments.includes(d.label?.toLowerCase()));
                return matched.length > 0 ? matched : (Array.isArray(pmDepartments) ? pmDepartments : []);
              })()
        }
        availableWarningLevels={warningLevelOptions}
        availableEmployees={
          (filterOptions.departments || [])
            .reduce((acc: any[], dept: any) => {
              const users = Array.isArray(dept.users) ? dept.users : [];
              users.forEach((u: any) => acc.push({ label: u.label, value: String(u.value) }));
              return acc;
            }, [])
        }
        singleDateLabel="Ngày tạo"
        dateRangeLabel="Khoảng thời gian"
        isRestoring={false}
        initialFilters={{
          search: searchTerm,
          // do NOT pre-filter by departments; keep department selection empty so results are not restricted
          departments: [],
          statuses: statusFilter && statusFilter !== 'all' ? statusFilter.split(',') : [],
          warningLevels: [],
          dateRange: dateRangeState
            ? { from: new Date(dateRangeState.start || ''), to: new Date(dateRangeState.end || '') }
            : { from: undefined, to: undefined },
          singleDate: dateFilter && dateFilter !== 'all' ? new Date(dateFilter) : undefined,
          employees: [],
        }}
      >
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <OrderManagement
              orders={orders as any}
              expectedRowCount={pageSize}
              startIndex={(currentPage - 1) * pageSize}
              onReload={fetchOrders}
              loading={loading}
              showActions={true}
              actionMode="view-only"
              onSearch={(s) => {
                setSearchTerm(s || '');
                setCurrentPage(1);
              }}
            />
          </PaginatedTable>
        </CardContent>
      </Card>
      {/* Simple modal for viewing messages */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowModal(false)} />
          <div className="bg-white rounded shadow-lg z-60 max-w-3xl w-full p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold">Tin nhắn liên quan - {modalOrder?.order_code}</h3>
              <button className="px-2 py-1" onClick={() => setShowModal(false)}>Đóng</button>
            </div>
            <div className="max-h-80 overflow-auto">
              {modalMessages.length === 0 ? (
                <div className="text-muted-foreground">Không có tin nhắn nào.</div>
              ) : (
                <ul className="space-y-2">
                  {modalMessages.map((m, idx) => (
                    <li key={idx} className="p-2 border rounded">
                      <div className="text-sm text-muted-foreground">{m.from}</div>
                      <div className="mt-1">{m.text || m.message || JSON.stringify(m)}</div>
                      <div className="text-xs text-muted-foreground mt-1">{m.created_at}</div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
