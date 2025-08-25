'use client';

import { useState, useEffect } from 'react';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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

      const params = new URLSearchParams({
        page: currentPage.toString(),
        pageSize: pageSize.toString(),
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
      });

      // date handling: if custom date range provided, send dateFrom/dateTo, else send date short token
      if (dateRangeState && dateRangeState.start && dateRangeState.end) {
        params.set('dateFrom', dateRangeState.start);
        params.set('dateTo', dateRangeState.end);
      } else if (dateFilter) {
        params.set('date', dateFilter);
      }

      // optional filters for departments / employees (CSV) - only apply if user explicitly selected departments
      if (Array.isArray(departmentsSelected) && departmentsSelected.length > 0) {
        params.set('departments', departmentsSelected.join(','));
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
      const token = getAccessToken();
  const response = await fetch(`${baseUrl}/orders?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Không thể tải dữ liệu giao dịch');
      }

  const data = await response.json();
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
  }, [isPM, isAdmin, currentPage, searchTerm, statusFilter, dateFilter]);

  // Sync effect: refetch when pageSize or dateRangeState changes
  useEffect(() => {
    if (isPM || isAdmin) fetchOrders();
  }, [pageSize, dateRangeState]);

  // Load filter options (departments/employees) similar to Order page
  useEffect(() => {
    const load = async () => {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
        const token = getAccessToken();
        const res = await fetch(`${baseUrl}/orders/filter-options`, {
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
        // not used directly now; backend may accept employees param in future
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

      // reset to page 1 after filter change
      setCurrentPage(1);
    } catch (e) {
      console.error('Error handling filters', e);
    }
  };

  // Export data
  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        status: statusFilter !== 'all' ? statusFilter : '',
        date_filter: dateFilter,
        export: 'true',
      });

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

    if (Array.isArray(pmDepartments) && pmDepartments.length > 0 && !isAdmin) {
      params.set('departments', pmDepartments.join(','));
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
    <div className="space-y-6">
      {/* Statistics Cards */}
  {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giao dịch</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.total_orders || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Tổng giá trị</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(Number(stats.total_amount || 0))}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Chờ xử lý</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.pending_orders || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Hoàn thành</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.completed_orders || 0)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Đã hủy</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{Number(stats.cancelled_orders || 0)}</div>
            </CardContent>
          </Card>
        </div>
      )}

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
        <Card>
          <CardHeader>
            <CardTitle>Danh sách giao dịch</CardTitle>
          </CardHeader>
          <CardContent>
            {error && (
              <Alert className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
              </div>
            ) : orders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Không có giao dịch nào được tìm thấy.
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Mã đơn</TableHead>
                      <TableHead>Khách hàng</TableHead>
                      <TableHead>Số điện thoại</TableHead>
                      <TableHead>Giá trị</TableHead>
                      <TableHead>Trạng thái</TableHead>
                      <TableHead>Nhân viên</TableHead>
                      <TableHead>Phòng ban</TableHead>
                      <TableHead>Ngày tạo</TableHead>
                      <TableHead>Hành động</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-medium">{order.order_code}</TableCell>
                        <TableCell>{order.customer_name}</TableCell>
                        <TableCell>{order.customer_phone}</TableCell>
                        <TableCell>{formatCurrency(order.total_amount)}</TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>{order.employee_code || '-'}</TableCell>
                        <TableCell>{order.department_name || '-'}</TableCell>
                        <TableCell>{formatDate(order.created_at)}</TableCell>
                        <TableCell>
                          <button
                            className="p-1 rounded hover:bg-muted"
                            onClick={async () => {
                              setLoading(true);
                              try {
                                const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
                                const token = getAccessToken();
                                const res = await fetch(`${baseUrl}/orders/${order.id}/messages`, {
                                  headers: { 'Authorization': `Bearer ${token}` },
                                });
                                if (res.ok) {
                                  const msgs = await res.json();
                                  setModalMessages(msgs || []);
                                  setModalOrder(order);
                                  setShowModal(true);
                                } else {
                                  setError('Không thể tải tin nhắn');
                                }
                              } catch (err) {
                                setError('Có lỗi khi tải tin nhắn');
                              } finally {
                                setLoading(false);
                              }
                            }}
                            title="Xem tin nhắn liên quan"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination built-in by PaginatedTable toolbar; keep simple extra pager if needed */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between space-x-2 py-4">
                    <div className="text-sm text-muted-foreground">
                      Trang {currentPage} của {totalPages}
                    </div>
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                        disabled={currentPage === 1}
                      >
                        Trước
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                        disabled={currentPage === totalPages}
                      >
                        Sau
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </PaginatedTable>
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
