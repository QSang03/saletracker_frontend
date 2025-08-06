"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { getAccessToken } from "@/lib/auth";
import { User } from "@/types";
import { useApiState } from "@/hooks/useApiState";
import ZaloTable from "./ZaloTable";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable, { Filters } from "@/components/ui/pagination/PaginatedTable";

export default function ZaloManager() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userPage, setUserPage] = useState(1);
  const userLimit = 10;
  const [userFilters, setUserFilters] = useState<{
    search: string;
    statuses: (string | number)[];
    zaloLinkStatuses: (string | number)[];
    departments: (string | number)[];
  }>({
    search: "",
    statuses: [],
    zaloLinkStatuses: [],
    departments: [],
  });
  const [confirmAction, setConfirmAction] = useState<{
    type: "listening" | "autoMessage" | null;
    user?: User;
    checked?: boolean;
    onConfirm?: (() => void) | null;
  }>({ type: null });

  // State để quản lý trạng thái toggle của từng user
  const [listeningStates, setListeningStates] = useState<Record<number, boolean>>({});
  const [autoMessageStates, setAutoMessageStates] = useState<Record<number, boolean>>({});

  // State để lấy danh sách phòng ban
  const [departments, setDepartments] = useState<string[]>([]);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const router = useRouter();

  const fetchZaloUsers = useCallback(async (): Promise<{ data: User[]; total: number }> => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      throw new Error("No token available");
    }

    const searchParams = new URLSearchParams({
      page: userPage.toString(),
      limit: userLimit.toString(),
    });

    if (userFilters.search) {
      searchParams.append("search", userFilters.search);
    }

    if (userFilters.statuses.length > 0) {
      searchParams.append("statuses", userFilters.statuses.join(','));
    }

    if (userFilters.zaloLinkStatuses.length > 0) {
      searchParams.append("zaloLinkStatus", userFilters.zaloLinkStatuses.join(','));
    }

    if (userFilters.departments.length > 0) {
      searchParams.append("departments", userFilters.departments.join(','));
    }

    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users?${searchParams}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    
    if (res.status === 401) {
      router.push("/login");
      throw new Error("Unauthorized");
    }
    
    if (!res.ok) {
      throw new Error('Failed to fetch users');
    }

    const result = await res.json();
    
    return {
      data: result.data || [],
      total: result.total || 0
    };
  }, [userPage, userLimit, userFilters, router]);

  const {
    data: usersData,
    isLoading,
    error,
    forceUpdate
  } = useApiState(fetchZaloUsers, { data: [], total: 0 });

  const users = usersData.data;
  const userTotal = usersData.total;

  // Remove problematic useEffect that causes dropdown to close
  // useApiState already handles re-fetching when dependencies change

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data: User = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Lỗi lấy profile:", err);
      }
    };
    fetchProfile();
  }, []);

  // Fetch danh sách phòng ban
  useEffect(() => {
    const fetchDepartments = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/departments?pageSize=10000`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          console.log("Departments response:", data); // Debug log
          
          // Kiểm tra cấu trúc response
          if (Array.isArray(data)) {
            setDepartments(data.map((dept: any) => dept.name));
          } else if (data.data && Array.isArray(data.data)) {
            setDepartments(data.data.map((dept: any) => dept.name));
          } else {
            console.warn("Unexpected departments response structure:", data);
            setDepartments([]);
          }
        }
      } catch (err) {
        console.error("Lỗi lấy danh sách phòng ban:", err);
        setDepartments([]); // Fallback to empty array
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: "Lỗi khi tải danh sách người dùng!" });
    }
  }, [error]);

  const handleToggleListening = async (user: User, checked: boolean) => {
    const token = getAccessToken();
    if (!token) return;
    
    try {
      // TODO: Implement listening toggle API call
      setListeningStates(prev => ({ ...prev, [user.id]: checked }));
      setAlert({
        type: "success",
        message: checked
          ? `Đã bật lắng nghe cho ${user.fullName}!`
          : `Đã tắt lắng nghe cho ${user.fullName}!`,
      });
      forceUpdate();
    } catch (err) {
      setAlert({
        type: "error",
        message: "Cập nhật trạng thái lắng nghe thất bại!",
      });
    }
  };

  const handleToggleAutoMessage = async (user: User, checked: boolean) => {
    const token = getAccessToken();
    if (!token) return;
    
    try {
      // TODO: Implement auto message toggle API call
      setAutoMessageStates(prev => ({ ...prev, [user.id]: checked }));
      setAlert({
        type: "success",
        message: checked
          ? `Đã bật tự động nhắn tin cho ${user.fullName}!`
          : `Đã tắt tự động nhắn tin cho ${user.fullName}!`,
      });
      forceUpdate();
    } catch (err) {
      setAlert({
        type: "error",
        message: "Cập nhật trạng thái tự động nhắn tin thất bại!",
      });
    }
  };

  const handleConfirm = async () => {
    if (typeof confirmAction.onConfirm === 'function') {
      await confirmAction.onConfirm();
    } else if (confirmAction.type === "listening" && confirmAction.user) {
      await handleToggleListening(confirmAction.user, !!confirmAction.checked);
    } else if (confirmAction.type === "autoMessage" && confirmAction.user) {
      await handleToggleAutoMessage(confirmAction.user, !!confirmAction.checked);
    }
    setConfirmAction({ type: null });
  };

  const handleFilterChange = useCallback((filters: Filters) => {
    setUserFilters({
      search: filters.search,
      statuses: filters.statuses,
      zaloLinkStatuses: filters.zaloLinkStatuses ?? [],
      departments: filters.departments,
    });
    setUserPage(1); // Reset to first page when filters change
  }, []);

  const handleResetFilter = useCallback(() => {
    setUserFilters({
      search: "",
      statuses: [],
      zaloLinkStatuses: [],
      departments: [],
    });
    setUserPage(1);
  }, []);

  // Memoized callback functions to prevent ZaloTable re-renders
  const handleRequestListeningConfirm = useCallback((user: User, checked: boolean, onConfirm?: () => void) => {
    setConfirmAction({ type: "listening", user, checked, onConfirm });
  }, []);

  const handleRequestAutoMessageConfirm = useCallback((user: User, checked: boolean, onConfirm?: () => void) => {
    setConfirmAction({ type: "autoMessage", user, checked, onConfirm });
  }, []);

  // Calculate startIndex once to avoid re-computation
  const tableStartIndex = useMemo(() => (userPage - 1) * userLimit, [userPage, userLimit]);

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size={48} />
        <span className="ml-2">Đang tải thông tin người dùng...</span>
      </div>
    );
  }

  // if (isLoading && users.length === 0) {
  //   return (
  //     <div className="flex justify-center items-center h-64">
  //       <LoadingSpinner size={32} />
  //       <span className="ml-2">Đang tải dữ liệu...</span>
  //     </div>
  //   );
  // }

  return (
    <>
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      
      <Card className="w-full">
        <CardHeader>
        <CardTitle className="text-xl font-bold flex items-center gap-2">
            <span>Quản lý Zalo</span>
            <span className="flex items-center">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#0084FF"/>
                <text
                x="16"
                y="21"
                textAnchor="middle"
                fontFamily="Arial, Helvetica, sans-serif"
                fontWeight="bold"
                fontSize="14"
                fill="#fff"
                style={{ userSelect: "none" }}
                >
                Zalo
                </text>
            </svg>
            </span>
        </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <PaginatedTable
            enableSearch={true}
            enableStatusFilter={true}
            enableZaloLinkStatusFilter={true}
            enableDepartmentFilter={true}
            availableStatuses={[
              { value: "active", label: "Hoạt động" },
              { value: "inactive", label: "Không hoạt động" }
            ]}
            availableZaloLinkStatuses={[
              { value: 0, label: "Chưa liên kết" },
              { value: 1, label: "Đã liên kết" },
              { value: 2, label: "Lỗi liên kết" }
            ]}
            availableDepartments={departments}
            initialFilters={{
              search: userFilters.search,
              statuses: userFilters.statuses,
              zaloLinkStatuses: userFilters.zaloLinkStatuses,
              departments: userFilters.departments,
            }}
            preserveFiltersOnEmpty={true}
            page={userPage}
            total={userTotal}
            pageSize={userLimit}
            onPageChange={setUserPage}
            onFilterChange={handleFilterChange}
            onResetFilter={handleResetFilter}
            loading={isLoading}
            emptyText="Không có dữ liệu người dùng"
          >
            <ZaloTable
              users={users}
              onToggleListening={handleToggleListening}
              onToggleAutoMessage={handleToggleAutoMessage}
              onRequestListeningConfirm={handleRequestListeningConfirm}
              onRequestAutoMessageConfirm={handleRequestAutoMessageConfirm}
              startIndex={tableStartIndex}
              expectedRowCount={userLimit}
              listeningStates={listeningStates}
              autoMessageStates={autoMessageStates}
            />
          </PaginatedTable>
        </CardContent>

        {/* Confirm Dialog for Toggle Actions */}
        <ConfirmDialog
          isOpen={!!confirmAction.type}
          title={
            confirmAction.type === "listening"
              ? confirmAction.checked
                ? "Xác nhận bật lắng nghe"
                : "Xác nhận tắt lắng nghe"
              : confirmAction.type === "autoMessage"
              ? confirmAction.checked
                ? "Xác nhận bật tự động nhắn tin"
                : "Xác nhận tắt tự động nhắn tin"
              : ""
          }
          message={
            confirmAction.type === "listening"
              ? `Bạn có chắc chắn muốn ${
                  confirmAction.checked ? "bật" : "tắt"
                } lắng nghe cho "${confirmAction.user?.fullName}"?`
              : confirmAction.type === "autoMessage"
              ? `Bạn có chắc chắn muốn ${
                  confirmAction.checked ? "bật" : "tắt"
                } tự động nhắn tin cho "${confirmAction.user?.fullName}"?`
              : ""
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction({ type: null })}
        />
      </Card>
    </>
  );
}
