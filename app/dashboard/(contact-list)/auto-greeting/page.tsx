"use client";
import React, { useMemo, useState, useCallback, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { Shield, Save, Rocket, Upload, Settings, Search } from "lucide-react";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Customer = {
  name: string;
  daysAgo: number;
  status: "ok" | "warning" | "danger";
  statusText: string;
};

type PermissionUser = {
  id: number;
  name: string;
  email: string;
  canEdit: boolean;
  customMessage: string;
};

export default function AutoGreetingPage() {
  // Settings state
  const [aiActive, setAiActive] = useState(true);
  const [cycleDays, setCycleDays] = useState<number>(10);
  const [execTime, setExecTime] = useState("09:00");
  const [template, setTemplate] = useState(
    "🌟 Chào bạn! Chúc bạn ngày mới tràn đầy năng lượng!"
  );
  const [settingsOpen, setSettingsOpen] = useState(false);

  // Permission state
  const [permissionOpen, setPermissionOpen] = useState(false);
  const [permissionData, setPermissionData] = useState<PermissionUser[]>([
    { id: 1, name: "Admin System", email: "admin@saletracker.com", canEdit: true, customMessage: "Toàn quyền" },
    { id: 2, name: "Nguyễn Văn A", email: "nva@company.com", canEdit: true, customMessage: "Chỉnh sửa template" },
    { id: 3, name: "Trần Thị B", email: "ttb@company.com", canEdit: true, customMessage: "Chỉ xem" },
    { id: 4, name: "Lê Văn C", email: "lvc@company.com", canEdit: false, customMessage: "Không có quyền" },
    { id: 5, name: "Phạm Thị D", email: "ptd@company.com", canEdit: false, customMessage: "Không có quyền" },
    { id: 6, name: "Hoàng Văn E", email: "hve@company.com", canEdit: true, customMessage: "Chỉnh sửa template" },
  ]);
  const [searchTerm, setSearchTerm] = useState("");
  const [permissionFilter, setPermissionFilter] = useState<"all" | "allowed" | "denied">("all");

  // Customers sample
  const customers: Customer[] = [
    { name: "Nguyễn Văn A", daysAgo: 8, status: "warning", statusText: "Cần gửi" },
    { name: "Trần Thị B", daysAgo: 12, status: "danger", statusText: "Khẩn cấp" },
    { name: "Lê Văn C", daysAgo: 2, status: "ok", statusText: "Ổn định" },
    { name: "Phạm Văn D", daysAgo: 6, status: "warning", statusText: "Cần gửi" },
    { name: "Vũ Thị E", daysAgo: 15, status: "danger", statusText: "Khẩn cấp" },
    { name: "Đỗ Văn F", daysAgo: 1, status: "ok", statusText: "Ổn định" },
    { name: "Hoàng Thị G", daysAgo: 10, status: "warning", statusText: "Cần gửi" },
    { name: "Lý Văn H", daysAgo: 3, status: "ok", statusText: "Ổn định" },
    { name: "Bùi Thị I", daysAgo: 18, status: "danger", statusText: "Khẩn cấp" },
    { name: "Ngô Văn K", daysAgo: 9, status: "warning", statusText: "Cần gửi" },
  ];

  // View modal state
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  // Alerts (use shared ServerResponseAlert)
  const [alert, setAlert] = useState<{ type: "success" | "error" | "warning" | "info"; message: string } | null>(null);
  const showAlert = useCallback((message: string, type: "success" | "error" | "warning" | "info" = "info") => {
    setAlert({ type, message });
  }, []);
  const closeAlert = useCallback(() => setAlert(null), []);

  // Derived filtered permission data
  const filteredPermissionData = useMemo(() => {
    let data = permissionData;
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      data = data.filter((u) => u.name.toLowerCase().includes(s) || u.email.toLowerCase().includes(s));
    }
    if (permissionFilter === "allowed") data = data.filter((u) => u.canEdit);
    if (permissionFilter === "denied") data = data.filter((u) => !u.canEdit);
    return data;
  }, [permissionData, searchTerm, permissionFilter]);

  // Handlers
  const toggleAi = () => {
    setAiActive((prev) => {
      const next = !prev;
      showAlert(next ? "Hệ thống AI đã được kích hoạt" : "Hệ thống AI đã tạm dừng", next ? "success" : "info");
      return next;
    });
  };

  const saveSettings = () => {
    showAlert("Đang lưu cấu hình...", "info");
    setTimeout(() => {
      showAlert("Cài đặt đã được lưu", "success");
    }, 1000);
  };

  const runNow = () => {
    showAlert("Đang thực thi...", "info");
    setTimeout(() => {
      showAlert("Đã gửi thành công 25 tin nhắn", "success");
    }, 1200);
  };

  const handleFileUpload: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const file = e.target.files?.[0];
    if (file) showAlert(`Đã tải lên: ${file.name}`, "success");
  };
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const getInitials = (name: string) =>
    name
      .split(" ")
      .map((w) => w[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);

  const updatePermission = (userId: number, newPermission: string) => {
    setPermissionData((list) => list.map((u) => (u.id === userId ? { ...u, customMessage: newPermission } : u)));
    const user = permissionData.find((u) => u.id === userId);
    if (user && newPermission.trim().length > 0) showAlert(`Đã cập nhật quyền "${newPermission}" cho ${user.name}`, "success");
  };

  const toggleUserPermission = (userId: number, hasPermission: boolean) => {
    setPermissionData((list) => list.map((u) => (u.id === userId ? { ...u, canEdit: hasPermission } : u)));
    const user = permissionData.find((u) => u.id === userId);
    if (user) showAlert(hasPermission ? `Đã kích hoạt quyền cho ${user.name}` : `Đã vô hiệu hóa quyền của ${user.name}`, hasPermission ? "success" : "info");
  };

  const deleteUser = (userId: number) => {
    if (userId === 1) {
      showAlert("Không thể xóa tài khoản Admin", "error");
      return;
    }
    const user = permissionData.find((u) => u.id === userId);
    setPermissionData((list) => list.filter((u) => u.id !== userId));
    if (user) showAlert(`Đã xóa user ${user.name}`, "info");
  };

  const PERMISSION_OPTIONS = [
    "Toàn quyền",
    "Chỉnh sửa template",
    "Chỉ xem",
    "Không có quyền",
  ] as const;

  // Local search + pagination for customers table
  const [customerSearch, setCustomerSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const filteredCustomers = useMemo(() => {
    const s = customerSearch.trim().toLowerCase();
    if (!s) return customers;
    return customers.filter((c) => c.name.toLowerCase().includes(s));
  }, [customers, customerSearch]);
  const pageRows = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, page, pageSize]);

  const openView = (cus: Customer) => {
    setSelectedCustomer(cus);
    setViewOpen(true);
  };

  const remindNow = () => {
    if (selectedCustomer) {
      showAlert(`Đã gửi nhắc lại tới ${selectedCustomer.name}`, "success");
      setViewOpen(false);
    }
  };

  return (
    <div className="h-full overflow-hidden">
      <div className="h-full overflow-y-auto p-6 space-y-6">
        {/* Header Card */}
        <Card className="shadow-sm border-0 bg-gradient-to-r from-blue-50 to-purple-50">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Gửi lời chào tự động
                </CardTitle>
                <p className="text-gray-600 mt-1">Hệ thống AI duy trì lịch sử chat Zalo trong vòng 14 ngày</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setPermissionOpen(true)} className="transition-all duration-200">
                  <Shield className="h-4 w-4 mr-2" /> Quản lý quyền
                </Button>
                <Button onClick={() => setSettingsOpen(true)} variant="outline" className="transition-all duration-200 hover:bg-gray-50">
                  <Settings className="h-4 w-4 mr-2" /> Cấu hình hệ thống
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="transition-all duration-200 hover:bg-gray-50">
                  <Upload className="h-4 w-4 mr-2" /> Upload danh sách
                </Button>
                <Button variant="outline" onClick={runNow} className="transition-all duration-200 hover:bg-gray-50">
                  <Rocket className="h-4 w-4 mr-2" /> Chạy ngay
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {alert && (
          <div className="animate-in slide-in-from-top duration-300">
            <ServerResponseAlert type={alert.type} message={alert.message} onClose={closeAlert} />
          </div>
        )}

        {/* Customers Table (like campaigns page) */}
        <Card className="shadow-sm border-0">
          <CardContent className="p-3">
            <PaginatedTable
              enableSearch
              enablePageSize
              page={page}
              pageSize={pageSize}
              total={filteredCustomers.length}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onFilterChange={(f) => {
                setCustomerSearch(f.search?.trim() || "");
                setPage(1);
              }}
              onResetFilter={() => {
                setCustomerSearch("");
                setPage(1);
              }}
            >
              <div className="w-full">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-muted">
                      <th className="text-left font-semibold px-3 py-2">Khách hàng</th>
                      <th className="text-left font-semibold px-3 py-2">Lần tương tác gần nhất</th>
                      <th className="text-left font-semibold px-3 py-2">Trạng thái</th>
                      <th className="text-left font-semibold px-3 py-2">Hành động</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((c, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-3 py-2 font-medium">{c.name}</td>
                        <td className="px-3 py-2">📅 {c.daysAgo} ngày trước</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              c.status === "ok"
                                ? "px-3 py-1 rounded-full text-xs font-semibold text-white bg-green-600"
                                : c.status === "warning"
                                ? "px-3 py-1 rounded-full text-xs font-semibold text-white bg-orange-600"
                                : "px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-600"
                            }
                          >
                            {c.statusText}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => openView(c)}>Xem</Button>
                            <Button size="sm" variant="secondary">Nhắc lại</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pageRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-3 py-6 text-center text-muted-foreground">
                          Không có khách hàng nào
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </PaginatedTable>
          </CardContent>
        </Card>
      </div>

      {/* Hidden file input for upload */}
      <input ref={fileInputRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFileUpload} />

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" /> Cấu hình hệ thống
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg border p-4 bg-muted/30">
              <div>
                <div className="font-semibold">Kích hoạt AI tự động</div>
                <div className="text-sm text-muted-foreground">Tự động gửi lời chào để duy trì kết nối</div>
              </div>
              <Switch checked={aiActive} onCheckedChange={toggleAi} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-semibold">Chu kỳ gửi (ngày)</label>
                <Input type="number" min={1} max={13} value={cycleDays} onChange={(e) => setCycleDays(Number(e.target.value))} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold">Thời gian thực thi</label>
                <Input type="time" value={execTime} onChange={(e) => setExecTime(e.target.value)} />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-semibold">Template tin nhắn</label>
                <Textarea
                  placeholder="Nhập nội dung..."
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  className="min-h-[88px]"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setSettingsOpen(false)}>Đóng</Button>
              <Button onClick={() => { saveSettings(); setSettingsOpen(false); }}>
                <Save className="h-4 w-4 mr-2" /> Lưu
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View Customer Dialog */}
      <Dialog open={viewOpen} onOpenChange={setViewOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              Chi tiết khách hàng{selectedCustomer ? ` — ${selectedCustomer.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Lần tương tác gần nhất</div>
                  <div className="font-semibold">📅 {selectedCustomer.daysAgo} ngày trước</div>
                </div>
                <div className="space-y-1">
                  <div className="text-sm text-muted-foreground">Trạng thái</div>
                  <div>
                    <span
                      className={
                        selectedCustomer.status === "ok"
                          ? "px-3 py-1 rounded-full text-xs font-semibold text-white bg-green-600"
                          : selectedCustomer.status === "warning"
                          ? "px-3 py-1 rounded-full text-xs font-semibold text-white bg-orange-600"
                          : "px-3 py-1 rounded-full text-xs font-semibold text-white bg-red-600"
                      }
                    >
                      {selectedCustomer.statusText}
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="text-sm font-semibold">Nội dung dự kiến</div>
                <div className="p-3 rounded-md border bg-muted/30 text-sm">
                  {template}
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setViewOpen(false)}>Đóng</Button>
                <Button onClick={remindNow}>Nhắc lại ngay</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Permission Dialog */}
      <Dialog open={permissionOpen} onOpenChange={setPermissionOpen}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" /> Quản lý quyền chỉnh sửa tin nhắn
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8"
                  placeholder="Tìm kiếm theo tên hoặc email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <select
                className="w-full sm:w-[180px] h-9 px-3 py-1.5 text-sm bg-white border rounded-md"
                value={permissionFilter}
                onChange={(e) => setPermissionFilter(e.target.value as any)}
              >
                <option value="all">Tất cả quyền</option>
                <option value="allowed">Có quyền</option>
                <option value="denied">Không có quyền</option>
              </select>
            </div>

            <div className="rounded-md border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
                  <tr>
                    <th className="text-left font-semibold px-3 py-2">Người dùng</th>
                    <th className="text-left font-semibold px-3 py-2">Quyền chỉnh sửa</th>
                    <th className="text-left font-semibold px-3 py-2">Trạng thái</th>
                    <th className="text-left font-semibold px-3 py-2">Hành động</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPermissionData.map((user) => (
                    <tr key={user.id} className="border-t">
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 text-white flex items-center justify-center text-xs font-bold">
                            {getInitials(user.name)}
                          </div>
                          <div>
                            <div className="font-semibold">{user.name}</div>
                            <div className="text-xs text-muted-foreground">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Select
                          value={
                            PERMISSION_OPTIONS.includes(
                              user.customMessage as (typeof PERMISSION_OPTIONS)[number]
                            )
                              ? (user.customMessage as string)
                              : "Chỉ xem"
                          }
                          onValueChange={(val) => updatePermission(user.id, val)}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Chọn quyền" />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={opt}>
                                {opt}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-3 py-2">
                        <Switch checked={user.canEdit} onCheckedChange={(v) => toggleUserPermission(user.id, !!v)} />
                      </td>
                      <td className="px-3 py-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteUser(user.id)}
                          disabled={user.id === 1}
                          className={user.id === 1 ? "opacity-60 cursor-not-allowed" : ""}
                        >
                          Xóa
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
