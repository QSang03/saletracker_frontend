"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable, { Filters } from "@/components/ui/pagination/PaginatedTable";
import AnalysisBlockTable from "@/components/analysis-block/AnalysisBlockTable";
import { useAnalysisBlock } from "@/hooks/useAnalysisBlock";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import { useRouter } from "next/navigation";
import { 
  BarChart3, 
  Search, 
  Filter, 
  RefreshCw, 
  Download,
  Plus,
  AlertTriangle,
  Shield,
  Users,
  TrendingUp,
  FileText
} from "lucide-react";

interface AlertType {
  type: "success" | "error" | "warning" | "info";
  message: string;
}

export default function AnalysisBlockManagementPage() {
  const [alert, setAlert] = useState<AlertType | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedBlockType, setSelectedBlockType] = useState<string>("all");
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);

  const { currentUser } = useCurrentUser();
  const router = useRouter();

  const {
    analysisBlocks,
    total,
    loading,
    error,
    filters,
    departmentOptions,
    userOptions,
    addAnalysisBlock,
    updateAnalysisBlock,
    deleteAnalysisBlock,
    setPage,
    setPageSize,
    setSearch,
    setDepartments,
    setUsers,
    setBlockType,
    resetFilters,
    refetch,
  } = useAnalysisBlock();

  // Check if user is admin
  const isAdmin = currentUser?.roles?.some(role => role.name === 'admin');

  // Redirect if not admin
  useEffect(() => {
    if (currentUser && !isAdmin) {
      router.push('/dashboard');
    }
  }, [currentUser, isAdmin, router]);

  // Show loading if checking permissions
  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!isAdmin) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Truy cập bị từ chối</h2>
          <p className="text-gray-600">Chỉ admin mới có quyền truy cập trang này.</p>
        </div>
      </div>
    );
  }

  // Handle search
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setSearch(value);
  };

  // Handle block type filter
  const handleBlockTypeChange = (value: string) => {
    setSelectedBlockType(value);
    setBlockType(value === "all" ? undefined : value);
  };

  // Handle department filter
  const handleDepartmentChange = (departments: number[]) => {
    setSelectedDepartments(departments);
    setDepartments(departments);
  };

  // Handle user filter
  const handleUserChange = (users: number[]) => {
    setSelectedUsers(users);
    setUsers(users);
  };

  // Handle refresh
  const handleRefresh = () => {
    refetch();
    setAlert({ type: "success", message: "Đã làm mới dữ liệu thành công!" });
  };

  // Handle edit
  const handleEdit = async (id: number, data: { reason?: string; blockType?: string }) => {
    try {
      await updateAnalysisBlock(id, data);
      setAlert({ type: "success", message: "Cập nhật analysis block thành công!" });
    } catch (error: any) {
      setAlert({ type: "error", message: error.message || "Lỗi khi cập nhật analysis block" });
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    try {
      await deleteAnalysisBlock(id);
      setAlert({ type: "success", message: "Xóa analysis block thành công!" });
    } catch (error: any) {
      setAlert({ type: "error", message: error.message || "Lỗi khi xóa analysis block" });
    }
  };

  // Get statistics
  const getStatistics = () => {
    const totalBlocks = analysisBlocks.length;
    const analysisBlocks_count = analysisBlocks.filter(b => b.blockType === 'analysis').length;
    const reportingBlocks_count = analysisBlocks.filter(b => b.blockType === 'reporting').length;
    const statsBlocks_count = analysisBlocks.filter(b => b.blockType === 'stats').length;

    return {
      total: totalBlocks,
      analysis: analysisBlocks_count,
      reporting: reportingBlocks_count,
      stats: statsBlocks_count,
    };
  };

  const stats = getStatistics();

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Quản lý Chặn Phân Tích</h1>
            <p className="text-gray-600">Quản lý danh sách khách hàng bị chặn khỏi các báo cáo phân tích</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Button
            onClick={handleRefresh}
            variant="outline"
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Làm mới
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-r from-orange-50 to-amber-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Tổng số chặn</p>
                <p className="text-2xl font-bold text-orange-700">{stats.total}</p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-blue-600">Chặn Phân tích</p>
                <p className="text-2xl font-bold text-blue-700">{stats.analysis}</p>
              </div>
              <BarChart3 className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Chặn Báo cáo</p>
                <p className="text-2xl font-bold text-green-700">{stats.reporting}</p>
              </div>
              <FileText className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-r from-purple-50 to-violet-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Chặn Thống kê</p>
                <p className="text-2xl font-bold text-purple-700">{stats.stats}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Bộ lọc
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Tìm kiếm</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm theo tên khách hàng..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Block Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Loại chặn</label>
              <Select value={selectedBlockType} onValueChange={handleBlockTypeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Chọn loại chặn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả</SelectItem>
                  <SelectItem value="analysis">Phân tích</SelectItem>
                  <SelectItem value="reporting">Báo cáo</SelectItem>
                  <SelectItem value="stats">Thống kê</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Department Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Phòng ban</label>
              <Select 
                value={selectedDepartments.length > 0 ? selectedDepartments.join(',') : "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    handleDepartmentChange([]);
                  } else {
                    handleDepartmentChange(value.split(',').map(Number));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn phòng ban" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả phòng ban</SelectItem>
                  {departmentOptions.map((dept) => (
                    <SelectItem key={dept.value} value={dept.value.toString()}>
                      {dept.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* User Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Người chặn</label>
              <Select 
                value={selectedUsers.length > 0 ? selectedUsers.join(',') : "all"} 
                onValueChange={(value) => {
                  if (value === "all") {
                    handleUserChange([]);
                  } else {
                    handleUserChange(value.split(',').map(Number));
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn người chặn" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tất cả người dùng</SelectItem>
                  {userOptions.map((user) => (
                    <SelectItem key={user.value} value={user.value.toString()}>
                      {user.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reset Filters */}
          <div className="mt-4 flex justify-end">
            <Button
              onClick={() => {
                setSearchTerm("");
                setSelectedBlockType("all");
                setSelectedDepartments([]);
                setSelectedUsers([]);
                resetFilters();
              }}
              variant="outline"
              size="sm"
            >
              Xóa bộ lọc
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Danh sách khách hàng bị chặn phân tích
              <Badge variant="secondary" className="ml-2">
                {total} mục
              </Badge>
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <PaginatedTable
            page={filters.page}
            total={total}
            pageSize={filters.pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            loading={loading}
            enablePageSize={true}
            controlsOnly={false}
          >
            <AnalysisBlockTable
              analysisBlocks={analysisBlocks}
              total={total}
              loading={loading}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </PaginatedTable>
        </CardContent>
      </Card>

      {/* Alert */}
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
    </div>
  );
}
