"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import CampaignManagement from "./CampaignManagement";
import CreateCampaignModal from "./CreateCampaignModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Campaign,
  CampaignStatus,
  CampaignType,
  CampaignFormData,
  User,
} from "@/types";
import { getAccessToken } from "@/lib/auth";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { PDynamic } from "@/components/common/PDynamic";

interface MessageConfigFilters {
  search: string;
  statuses: (string | number)[];
  campaign_types: (string | number)[];
  employees: (string | number)[];
}

const campaignTypeOptions = [
  { value: CampaignType.HOURLY_KM, label: "Chương trình KM 1 giờ" },
  { value: CampaignType.DAILY_KM, label: "Chương trình KM 1 ngày" },
  { value: CampaignType.THREE_DAY_KM, label: "Chương trình KM trong 3 ngày" },
  { value: CampaignType.WEEKLY_SP, label: "Chương trình gửi SP 1 tuần / lần" },
  {
    value: CampaignType.WEEKLY_BBG,
    label: "Chương trình gửi BBG 1 tuần / lần",
  },
];

const statusOptions = [
  { value: CampaignStatus.DRAFT, label: "Bản nháp" },
  { value: CampaignStatus.SCHEDULED, label: "Đã lên lịch" },
  { value: CampaignStatus.RUNNING, label: "Đang chạy" },
  { value: CampaignStatus.PAUSED, label: "Tạm dừng" },
  { value: CampaignStatus.COMPLETED, label: "Hoàn thành" },
  { value: CampaignStatus.ARCHIVED, label: "Đã lưu trữ" },
];

export default function MessageConfig() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<MessageConfigFilters>({
    search: "",
    statuses: [],
    campaign_types: [],
    employees: [],
  });

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    campaign: Campaign;
    newStatus: CampaignStatus;
  } | null>(null);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableEmployees, setAvailableEmployees] = useState<
    Array<{ value: string; label: string }>
  >([]);

  // Permission hooks
  const {
    canReadDepartment,
    canCreateInDepartment,
    canUpdateInDepartment,
    canDeleteInDepartment,
    canExportInDepartment,
    isAdmin,
    userDepartments,
    user,
  } = useDynamicPermission();

  // Department slug cho sale
  const saleDepartmentSlug = "ban-hang";

  const fetchCampaigns = useCallback(async () => {
    setLoading(true);
    try {
      const token = getAccessToken();
      const params = new URLSearchParams({
        page: page.toString(),
        pageSize: pageSize.toString(),
        search: filters.search,
        statuses: filters.statuses.join(","),
        campaign_types: filters.campaign_types.join(","),
        employees: filters.employees.join(","),
      });

      const response = await fetch(`/campaigns?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setCampaigns(data.data || []);
        setTotal(data.total || 0);
      } else {
        throw new Error("Failed to fetch campaigns");
      }
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      setAlert({
        type: "error",
        message: "Không thể tải danh sách chiến dịch. Vui lòng thử lại.",
      });
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, filters]);

  const fetchUsers = useCallback(async () => {
    try {
      const token = getAccessToken();
      const response = await fetch("/users", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.data || []);
        setAvailableEmployees(
          (data.data || []).map((user: User) => ({
            value: user.id.toString(),
            label: user.fullName || user.username,
          }))
        );
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    fetchCampaigns();
    fetchUsers();
  }, [fetchCampaigns, fetchUsers]);

  const handleCreateCampaign = async (campaignData: CampaignFormData) => {
    try {
      const token = getAccessToken();
      const response = await fetch("/campaigns", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(campaignData),
      });

      if (response.ok) {
        setAlert({
          type: "success",
          message: "Tạo chiến dịch thành công!",
        });
        fetchCampaigns();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to create campaign");
      }
    } catch (error) {
      console.error("Error creating campaign:", error);
      setAlert({
        type: "error",
        message: "Không thể tạo chiến dịch. Vui lòng thử lại.",
      });
    }
  };

  const handleStatusChange = async (
    campaign: Campaign,
    newStatus: CampaignStatus
  ) => {
    setPendingStatusChange({ campaign, newStatus });
    setShowConfirmDialog(true);
  };

  const confirmStatusChange = async () => {
    if (!pendingStatusChange) return;

    try {
      const token = getAccessToken();
      const response = await fetch(
        `/campaigns/${pendingStatusChange.campaign.id}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status: pendingStatusChange.newStatus,
          }),
        }
      );

      if (response.ok) {
        setAlert({
          type: "success",
          message: "Cập nhật trạng thái chiến dịch thành công!",
        });
        fetchCampaigns();
      } else {
        throw new Error("Failed to update campaign status");
      }
    } catch (error) {
      console.error("Error updating campaign status:", error);
      setAlert({
        type: "error",
        message: "Không thể cập nhật trạng thái chiến dịch. Vui lòng thử lại.",
      });
    } finally {
      setShowConfirmDialog(false);
      setPendingStatusChange(null);
    }
  };

  const handleArchiveCampaign = async (campaign: Campaign) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`/campaigns/${campaign.id}/archive`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setAlert({
          type: "success",
          message: "Lưu trữ chiến dịch thành công!",
        });
        fetchCampaigns();
      } else {
        throw new Error("Failed to archive campaign");
      }
    } catch (error) {
      console.error("Error archiving campaign:", error);
      setAlert({
        type: "error",
        message: "Không thể lưu trữ chiến dịch. Vui lòng thử lại.",
      });
    }
  };

  const handleDeleteCampaign = async (campaign: Campaign) => {
    try {
      const token = getAccessToken();
      const response = await fetch(`/campaigns/${campaign.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        setAlert({
          type: "success",
          message: "Xóa chiến dịch thành công!",
        });
        fetchCampaigns();
      } else {
        throw new Error("Failed to delete campaign");
      }
    } catch (error) {
      console.error("Error deleting campaign:", error);
      setAlert({
        type: "error",
        message: "Không thể xóa chiến dịch. Vui lòng thử lại.",
      });
    }
  };

  const handleFilterChange = (newFilters: any) => {
    setFilters({
      search: newFilters.search || "",
      statuses: newFilters.statuses || [],
      campaign_types: newFilters.categories || [], // Using categories for campaign types
      employees: newFilters.employees || [],
    });
    setPage(1); // Reset to first page when filtering
  };

  const getStatusChangeMessage = () => {
    if (!pendingStatusChange) return "";

    const { campaign, newStatus } = pendingStatusChange;
    const statusLabels = {
      [CampaignStatus.DRAFT]: "Bản nháp",
      [CampaignStatus.SCHEDULED]: "Đã lên lịch",
      [CampaignStatus.RUNNING]: "Đang chạy",
      [CampaignStatus.PAUSED]: "Tạm dừng",
      [CampaignStatus.COMPLETED]: "Hoàn thành",
      [CampaignStatus.ARCHIVED]: "Đã lưu trữ",
    };

    return `Bạn có chắc chắn muốn thay đổi trạng thái chiến dịch "${campaign.name}" thành "${statusLabels[newStatus]}"?`;
  };

  // Loading state for permissions
  if (!user) {
    return (
      <div className="flex justify-center items-center h-64">
        <LoadingSpinner size={32} />
        <span className="ml-2">Đang kiểm tra quyền truy cập...</span>
      </div>
    );
  }

  // Access denied state
  if (!canReadDepartment(saleDepartmentSlug)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <div className="text-6xl">🚫</div>
        <p className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Bạn không có quyền truy cập trang này
        </p>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Vui lòng liên hệ quản trị viên để được cấp quyền truy cập phù hợp.
        </p>
      </div>
    );
  }

  if (loading && campaigns.length === 0) {
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
        {/* Alerts */}
        {alert && (
          <ServerResponseAlert
            type={alert.type}
            message={alert.message}
            onClose={() => setAlert(null)}
          />
        )}

        {/* Header Section */}

        {/* Main Table */}
        <Card className="w-full max-w-full">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">
              💰 Quản lý công nợ
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              <PDynamic
                permission={{
                  departmentSlug: saleDepartmentSlug,
                  action: "create",
                }}
                fallback={null}
              >
                <Button onClick={() => setShowCreateModal(true)} variant="add">
                  + Tạo Chiến Dịch
                </Button>
              </PDynamic>
            </div>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <PaginatedTable
              enableSearch={true}
              enableStatusFilter={true}
              enableEmployeeFilter={true}
              enableCategoriesFilter={true}
              availableStatuses={statusOptions}
              availableEmployees={availableEmployees}
              availableCategories={campaignTypeOptions.map((opt) => opt.label)}
              enablePageSize={true}
              page={page}
              total={total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
              onFilterChange={handleFilterChange}
              loading={loading}
              emptyText="Không có chiến dịch nào"
            >
              <CampaignManagement
                campaigns={campaigns}
                expectedRowCount={pageSize}
                startIndex={(page - 1) * pageSize}
                onReload={fetchCampaigns}
                onStatusChange={
                  canUpdateInDepartment(saleDepartmentSlug)
                    ? handleStatusChange
                    : undefined
                }
                onArchive={
                  canUpdateInDepartment(saleDepartmentSlug)
                    ? handleArchiveCampaign
                    : undefined
                }
                onDelete={
                  canDeleteInDepartment(saleDepartmentSlug)
                    ? handleDeleteCampaign
                    : undefined
                }
              />
            </PaginatedTable>
          </CardContent>
        </Card>

        {/* Create Campaign Modal */}
        <CreateCampaignModal
          open={showCreateModal}
          onOpenChange={setShowCreateModal}
          onSubmit={handleCreateCampaign}
          availableUsers={availableUsers.map((user) => ({
            id: user.id.toString(),
            fullName: user.fullName || user.username,
            email: user.email || "",
          }))}
        />

        {/* Confirm Status Change Dialog */}
        <ConfirmDialog
          isOpen={showConfirmDialog}
          onConfirm={confirmStatusChange}
          onCancel={() => {
            setShowConfirmDialog(false);
            setPendingStatusChange(null);
          }}
          title="Xác nhận thay đổi trạng thái"
          message={getStatusChangeMessage()}
          confirmText="Xác nhận"
          cancelText="Hủy"
        />

        {/* Loading Spinner */}
        {loading && <LoadingSpinner />}
      </div>
    </div>
  );
}
