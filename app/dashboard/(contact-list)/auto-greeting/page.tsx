"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Settings,
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Download,
  Filter,
  Users,
  History,
} from "lucide-react";
import CustomerHistoryModal from "@/components/contact-list/zalo/auto-greeting/CustomerHistoryModal";
import CSVExportPanel from "@/components/ui/tables/CSVExportPanel";
import { getAccessToken } from "@/lib/auth";

interface Customer {
  id: string;
  userId: number;
  zaloDisplayName: string;
  salutation: string;
  greetingMessage: string;
  conversationType?: 'group' | 'private';
  lastMessageDate?: string; // ISO string format - từ customer_message_history
  customerLastMessageDate?: string; // ISO string format - từ customers.last_message_date
  customerStatus?: 'urgent' | 'reminder' | 'normal'; // Trạng thái từ bảng customers
  daysSinceLastMessage: number;
  status: "ready" | "urgent" | "stable"; // Trạng thái tính toán dựa trên ngày
}

export default function AutoGreetingPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [conversationTypeFilter, setConversationTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<string>("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [showExportModal, setShowExportModal] = useState(false);

  // Load filters from localStorage on component mount
  useEffect(() => {
    const savedFilters = localStorage.getItem('auto-greeting-filters');
    if (savedFilters) {
      try {
        const filters = JSON.parse(savedFilters);
        if (filters.searchTerm) setSearchTerm(filters.searchTerm);
        if (filters.statusFilter) setStatusFilter(filters.statusFilter);
        if (filters.conversationTypeFilter) setConversationTypeFilter(filters.conversationTypeFilter);
        if (filters.dateFilter) setDateFilter(filters.dateFilter);
        if (filters.itemsPerPage) setItemsPerPage(filters.itemsPerPage);
      } catch (error) {
        console.error('Error loading filters from localStorage:', error);
        // Clear corrupted data
        localStorage.removeItem('auto-greeting-filters');
      }
    }
  }, []);

  // Save filters to localStorage whenever they change
  useEffect(() => {
    const filters: any = {};
    
    // Only save non-empty values
    if (searchTerm.trim()) filters.searchTerm = searchTerm;
    if (statusFilter && statusFilter !== "all") filters.statusFilter = statusFilter;
    if (conversationTypeFilter && conversationTypeFilter !== "all") filters.conversationTypeFilter = conversationTypeFilter;
    if (dateFilter) filters.dateFilter = dateFilter;
    if (itemsPerPage && itemsPerPage !== 10) filters.itemsPerPage = itemsPerPage;
    
    // Only save if there are any filters to save
    if (Object.keys(filters).length > 0) {
      localStorage.setItem('auto-greeting-filters', JSON.stringify(filters));
    } else {
      // Remove from localStorage if no filters are set
      localStorage.removeItem('auto-greeting-filters');
    }
  }, [searchTerm, statusFilter, conversationTypeFilter, dateFilter, itemsPerPage]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  // Filter customers based on search term, status, and date
  useEffect(() => {
    let filtered = customers;

    // Search filter
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter((customer) => {
        return (
          customer.id.toLowerCase().includes(searchLower) ||
          customer.zaloDisplayName.toLowerCase().includes(searchLower) ||
          customer.salutation.toLowerCase().includes(searchLower) ||
          customer.greetingMessage.toLowerCase().includes(searchLower) ||
          customer.userId.toString().includes(searchLower) ||
          (customer.conversationType && customer.conversationType.toLowerCase().includes(searchLower)) ||
          (customer.customerStatus && customer.customerStatus.toLowerCase().includes(searchLower))
        );
      });
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((customer) => customer.customerStatus === statusFilter);
    }

    // Conversation type filter
    if (conversationTypeFilter !== "all") {
      filtered = filtered.filter((customer) => customer.conversationType === conversationTypeFilter);
    }

    // Date filter
    if (dateFilter) {
      const filterDate = new Date(dateFilter);
      filtered = filtered.filter((customer) => {
        if (customer.lastMessageDate) {
          const messageDate = new Date(customer.lastMessageDate);
          return messageDate.toDateString() === filterDate.toDateString();
        }
        return false;
      });
    }

    setFilteredCustomers(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [customers, searchTerm, statusFilter, conversationTypeFilter, dateFilter]);

  // Pagination logic
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentCustomers = filteredCustomers.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (newItemsPerPage: number) => {
    setItemsPerPage(newItemsPerPage);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setStatusFilter("all");
    setConversationTypeFilter("all");
    setDateFilter("");
    setCurrentPage(1);
    // Clear from localStorage when user explicitly clears filters
    localStorage.removeItem('auto-greeting-filters');
  };

  // Prepare data for CSVExportPanel
  const getExportData = () => {
    const headers = [
      "STT",
      "Mã Khách Hàng", 
      "Tên Zalo Khách",
      "Xưng hô",
      "Lời Chào",
      "Loại Hội Thoại",
      "Tin Nhắn Cuối",
      "Lần Cuối Gửi",
      "Số Ngày",
      "Trạng Thái"
    ];

    const data = currentCustomers.map((customer, index) => [
      startIndex + index + 1,
      customer.id,
      customer.zaloDisplayName,
      customer.salutation || "",
      customer.greetingMessage || "",
      customer.conversationType === 'group' ? 'Nhóm' : 
      customer.conversationType === 'private' ? 'Cá nhân' : 'Chưa xác định',
      customer.customerLastMessageDate 
        ? new Date(customer.customerLastMessageDate).toLocaleString("vi-VN")
        : "Chưa có",
      customer.lastMessageDate 
        ? new Date(customer.lastMessageDate).toLocaleString("vi-VN")
        : "Chưa gửi",
      customer.daysSinceLastMessage === 999 ? "∞" : customer.daysSinceLastMessage,
      customer.customerStatus === 'urgent' ? 'Cần báo gấp' :
      customer.customerStatus === 'reminder' ? 'Cần nhắc nhở' :
      customer.customerStatus === 'normal' ? 'Bình thường' : 'Bình thường'
    ]);

    return { headers, data };
  };

  // Fetch all data for export (with current filters)
  const getExportAllData = async () => {
    try {
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/export-customers-filtered", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({
          searchTerm,
          statusFilter,
          conversationTypeFilter,
          dateFilter
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to fetch all data");
      }

      const data = await response.json();
      const customers = data.data || [];
      
      // Convert to CSVExportPanel format
      return customers.map((customer: any, index: number) => [
        index + 1,
        customer.id,
        customer.zaloDisplayName,
        customer.salutation || "",
        customer.greetingMessage || "",
        customer.conversationType === 'group' ? 'Nhóm' : 
      customer.conversationType === 'private' ? 'Cá nhân' : 'Chưa xác định',
        customer.customerLastMessageDate 
          ? new Date(customer.customerLastMessageDate).toLocaleString("vi-VN")
          : "Chưa có",
        customer.lastMessageDate 
          ? new Date(customer.lastMessageDate).toLocaleString("vi-VN")
          : "Chưa gửi",
        customer.daysSinceLastMessage === 999 ? "∞" : customer.daysSinceLastMessage,
        customer.customerStatus === 'urgent' ? 'Cần báo gấp' :
        customer.customerStatus === 'reminder' ? 'Cần nhắc nhở' :
        customer.customerStatus === 'normal' ? 'Bình thường' : 'Bình thường'
      ]);
    } catch (error) {
      console.error("Error fetching all data:", error);
      return [];
    }
  };

  const loadCustomers = async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/customers", {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log("Fetched customers data:", data);
      console.log(
        "Data length:",
        Array.isArray(data) ? data.length : "Not an array"
      );
      setCustomers(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
      setCustomers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/import-customers", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      if (response.ok) {
        await loadCustomers();
      }
    } catch (error) {
      console.error("Failed to upload file:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };


  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-2 mb-6">
        <Settings className="h-6 w-6 text-gray-600" />
        <h1 className="text-2xl font-semibold text-gray-800">
                  Gửi lời chào tự động
        </h1>
      </div>

      {/* Search and Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div className="flex flex-wrap gap-4 items-center">
          <Input 
            placeholder="Tìm kiếm..." 
            className="w-64"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Chọn trạng thái" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả trạng thái</SelectItem>
              <SelectItem value="urgent">Cần báo gấp</SelectItem>
              <SelectItem value="reminder">Cần nhắc nhở</SelectItem>
              <SelectItem value="normal">Bình thường</SelectItem>
            </SelectContent>
          </Select>
          <Select value={conversationTypeFilter} onValueChange={setConversationTypeFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Chọn loại hội thoại" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả loại</SelectItem>
              <SelectItem value="group">Nhóm</SelectItem>
              <SelectItem value="private">Cá nhân</SelectItem>
            </SelectContent>
          </Select>
          <Input 
            type="date" 
            className="w-48"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            placeholder="Lọc theo ngày"
          />
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Dòng/trang</span>
            <Select value={itemsPerPage.toString()} onValueChange={(value) => handleItemsPerPageChange(parseInt(value))}>
              <SelectTrigger className="w-20">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5</SelectItem>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="20">20</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
              </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 mb-4 justify-end">
        <Button
          variant="outline"
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <span className="flex items-start justify-center">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Tải file mẫu Excel
          </span>
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 hover:bg-blue-700 text-white"
          disabled={uploading}
        >
          <span className="flex items-start justify-center">
            <Upload className="h-4 w-4 mr-2" />
            {uploading ? "Đang upload..." : "+ Nhập file danh sách khách hàng"}
          </span>
                </Button>
        <Button
          onClick={loadCustomers}
          variant="outline"
          className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
        >
          <span className="flex items-start justify-center">
            <RefreshCw className="h-4 w-4 mr-2" />
            Làm mới
          </span>
                </Button>
        <Button
          onClick={() => setShowExportModal(true)}
          variant="outline"
          className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        >
          <span className="flex items-start justify-center">
            <Download className="h-4 w-4 mr-2" />
            Xuất Excel
          </span>
                </Button>
        <Button
          onClick={clearFilters}
          variant="outline"
          className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
        >
          <span className="flex items-start justify-center">
            <Filter className="h-4 w-4 mr-2" />
            Xóa filter
          </span>
                </Button>
              </div>

      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-4 border-b">
          <span className="text-sm text-gray-600">
            Tổng số dòng: {filteredCustomers.length}
          </span>
          </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  #
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Tên Zalo Khách
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Lời Chào
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Loại Hội Thoại
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Tin Nhắn Cuối
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Lần Cuối Gửi
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Số Ngày
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Trạng Thái
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-gray-700 border-b">
                  Thao Tác
                </th>
                    </tr>
                  </thead>
                  <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mr-2"></div>
                      Đang tải dữ liệu...
                          </div>
                        </td>
                      </tr>
                     ) : currentCustomers.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-8 text-center text-gray-500"
                  >
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                    <div>Chưa có khách hàng nào</div>
                    <div className="text-sm mt-1">
                      Hãy upload file Excel để thêm khách hàng
                          </div>
                        </td>
                      </tr>
                     ) : (
                       currentCustomers.map((customer, index) => {
                  return (
                    <tr
                      key={customer.id}
                      className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}
                    >
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {index + 1}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-800 border-b">
                        {customer.zaloDisplayName}
                        {customer.salutation ? ` (${customer.salutation})` : ""}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b max-w-xs truncate">
                        {customer.greetingMessage}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          customer.conversationType === 'group' 
                            ? 'bg-blue-100 text-blue-800' 
                            : customer.conversationType === 'private'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.conversationType === 'group' ? 'Nhóm' : 
                           customer.conversationType === 'private' ? 'Cá nhân' : 'Chưa xác định'}
                    </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.customerLastMessageDate
                          ? (() => {
                              try {
                                // Parse ISO string from backend
                                const date = new Date(customer.customerLastMessageDate);
                                return isNaN(date.getTime())
                                  ? "Invalid Date"
                                  : date.toLocaleString("vi-VN");
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()
                          : "Chưa có"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.lastMessageDate
                          ? (() => {
                              try {
                                // Parse ISO string from backend
                                const date = new Date(customer.lastMessageDate);
                                return isNaN(date.getTime())
                                  ? "Invalid Date"
                                  : date.toLocaleString("vi-VN");
                              } catch (error) {
                                return "Invalid Date";
                              }
                            })()
                          : "Chưa gửi"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        {customer.daysSinceLastMessage === 999
                          ? "∞"
                          : customer.daysSinceLastMessage}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 border-b">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          customer.customerStatus === 'urgent' 
                            ? 'bg-red-200 text-red-900' 
                            : customer.customerStatus === 'reminder'
                            ? 'bg-yellow-100 text-yellow-800'
                            : customer.customerStatus === 'normal'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {customer.customerStatus === 'urgent' ? 'Cần báo gấp' :
                           customer.customerStatus === 'reminder' ? 'Cần nhắc nhở' :
                           customer.customerStatus === 'normal' ? 'Bình thường' :
                           'Bình thường'}
                        </span>
                      </td>
                      <td className="px-4 py-3 border-b">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setOpenCustomerId(customer.id)}
                          className="border-gray-300 text-gray-600 hover:bg-gray-50"
                        >
                          <span className="flex items-start justify-center">
                            <History className="h-4 w-4 mr-1" />
                            Lịch sử
                          </span>
                        </Button>
                        </td>
                      </tr>
                  );
                })
                    )}
                  </tbody>
                </table>
      </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-4 border-t bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    Hiển thị {startIndex + 1} - {Math.min(endIndex, filteredCustomers.length)} trong {filteredCustomers.length} kết quả
              </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Trước
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => handlePageChange(page)}
                            className="w-8 h-8 p-0"
                          >
                            {page}
                          </Button>
                        );
                      })}
            </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Sau
              </Button>
            </div>
              </div>
            </div>
          )}
            </div>

          {/* Customer History Modal */}
      <CustomerHistoryModal
        customerId={openCustomerId}
        open={!!openCustomerId}
        onClose={() => setOpenCustomerId(null)}
      />

      {/* Export Excel Panel */}
      <CSVExportPanel
        open={showExportModal}
        onClose={() => setShowExportModal(false)}
        defaultExportCount={itemsPerPage}
        {...getExportData()}
        fetchAllData={getExportAllData}
        filtersDescription={
          <div className="space-y-1">
            <div><strong>Bộ lọc hiện tại:</strong></div>
            {searchTerm && <div>• Tìm kiếm: "{searchTerm}"</div>}
            {statusFilter !== "all" && <div>• Trạng thái: {statusFilter === 'urgent' ? 'Cần báo gấp' : statusFilter === 'reminder' ? 'Cần nhắc nhở' : 'Bình thường'}</div>}
            {conversationTypeFilter !== "all" && <div>• Loại hội thoại: {conversationTypeFilter === 'group' ? 'Nhóm' : 'Cá nhân'}</div>}
            {dateFilter && <div>• Ngày: {new Date(dateFilter).toLocaleDateString('vi-VN')}</div>}
            <div>• Tổng số khách hàng: {filteredCustomers.length}</div>
                        </div>
        }
      />
    </div>
  );
}
