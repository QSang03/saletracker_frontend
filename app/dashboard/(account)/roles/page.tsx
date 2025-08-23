"use client";

import { useCallback, useState, useMemo, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import RoleManagement from "@/components/roles/RoleManagement";
import AddMainRoleModal from "@/components/roles/AddMainRoleModal";
import type { User, Department, Permission, RolePermission } from "@/types";
import { getAccessToken } from "@/lib/auth";
import { useApiState } from "@/hooks/useApiState";
import { PDynamic } from "@/components/common/PDynamic";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

// Thêm type cho role-permissions
interface UserRolePermissionsMap {
  [userId: number]: { roleId: number; permissionId: number; isActive: boolean }[];
}

export default function RolesPage() {
  const { canReadDepartment, canCreateInDepartment, canExportInDepartment } = useDynamicPermission();
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination & filter state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const handlePageSizeChange = useCallback((newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1); // Reset to first page when page size changes
  }, []);

  // Modal state cho thêm vai trò chính
  const [showAddMainRole, setShowAddMainRole] = useState(false);

  // Fetch function for all roles data
  const fetchRolesData = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      throw new Error("No token available");
    }



    const [usersData, rolesGroupedData, departmentsData, permissionsData, allRolePermsData] = await Promise.all([
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/for-permission-management`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.ok ? res.json() : []),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles/grouped`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.ok ? res.json() : { main: [], sub: [] }),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/departments?pageSize=10000`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.ok ? res.json() : []),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/permissions`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.ok ? res.json() : []),
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles-permissions/all`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      }).then(res => res.ok ? res.json() : [])
    ]);

    const usersList = Array.isArray(usersData) ? usersData : usersData.data || [];
    
    return {
      users: usersList,
      rolesGrouped: rolesGroupedData || { main: [], sub: [] },
      departments: Array.isArray(departmentsData) ? departmentsData : departmentsData.data || [],
      permissions: Array.isArray(permissionsData) ? permissionsData : permissionsData.data || [],
      allRolePermissions: Array.isArray(allRolePermsData) ? allRolePermsData : allRolePermsData.data || []
    };
  }, []);

  // Use the custom hook for roles data
  const {
    data: rolesData,
    isLoading,
    error,
    forceUpdate
  } = useApiState(fetchRolesData, {
    users: [],
    rolesGrouped: { main: [], sub: [] },
    departments: [],
    permissions: [],
    allRolePermissions: []
  });

  // Extract data from the response
  const { users, rolesGrouped, departments, permissions, allRolePermissions } = rolesData;

  // Filter & phân trang ở frontend
  const filteredUsers = useMemo(() => {
    return Array.isArray(users)
      ? users.filter((u) =>
          u.fullName?.toLowerCase().includes(search.toLowerCase()) ||
          u.username?.toLowerCase().includes(search.toLowerCase()) ||
          u.email?.toLowerCase().includes(search.toLowerCase())
        )
      : [];
  }, [users, search]);

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * pageSize;
    return Array.isArray(filteredUsers)
      ? filteredUsers.slice(start, start + pageSize)
      : [];
  }, [filteredUsers, page, pageSize]);

  // Xử lý thêm vai trò chính
  const handleAddMainRole = async (role: { name: string }) => {
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(role),
      });
      if (!res.ok) {
        throw new Error("Thêm vai trò thất bại");
      }
      setAlert({ type: "success", message: "Thêm vai trò thành công!" });
      forceUpdate();
    } catch {
      setAlert({ type: "error", message: "Thêm vai trò thất bại!" });
    }
  };

  // Xử lý cập nhật phân quyền user
  const handleUpdateUserRolesPermissions = async (
    userId: number,
    data: { departmentIds: number[]; roleIds: number[]; permissionIds: number[] }
  ) => {
    try {
      const token = getAccessToken
        ? getAccessToken()
        : localStorage.getItem("access_token");
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/roles-permissions`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify(data),
        }
      );
      if (!res.ok) throw new Error("Cập nhật phân quyền thất bại");
      setAlert({ type: "success", message: "Cập nhật phân quyền thành công!" });
      forceUpdate();
    } catch {
      setAlert({ type: "error", message: "Cập nhật phân quyền thất bại!" });
    }
  };

  // Update alert when there's an error
  useEffect(() => {
    if (error) {
      setAlert({ type: "error", message: "Lỗi tải dữ liệu phân quyền!" });
    }
  }, [error]);

  return (
    <PDynamic permissions={[{ departmentSlug: 'account', action: 'read' }]} fallback={
      <div className="p-6 text-center">
        <p className="text-gray-500">Bạn không có quyền truy cập trang này</p>
      </div>
    }>
      <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
        <Card className="w-full flex-1">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl font-bold">
              👥 Quản lý phân quyền
            </CardTitle>
            <div className="flex gap-2">
              <PDynamic permissions={[{ departmentSlug: 'account', action: 'create' }]}>
                <Button variant="add" onClick={() => setShowAddMainRole(true)}>
                  + Tạo vai trò chính
                </Button>
              </PDynamic>
            </div>
          </CardHeader>
        <CardContent>
          {alert && (
            <ServerResponseAlert
              type={alert.type}
              message={alert.message}
              onClose={() => setAlert(null)}
            />
          )}
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <PaginatedTable
              enableSearch
              enablePageSize={true}
              pageSizeOptions={[5, 10, 20, 50, 100]}
              page={page}
              pageSize={pageSize}
              total={filteredUsers.length}
              canExport={canExportInDepartment('account')}
              onPageChange={setPage}
              onPageSizeChange={handlePageSizeChange}
              onFilterChange={({ search }) => {
                setSearch(search);
                setPage(1);
              }}
            >
              <RoleManagement
                users={pagedUsers}
                rolesGrouped={rolesGrouped}
                departments={departments}
                permissions={permissions}
                expectedRowCount={pageSize}
                startIndex={(page - 1) * pageSize}
                onReload={async () => forceUpdate()}
                // Truyền toàn bộ allRolePermissions xuống
                allRolePermissions={allRolePermissions}
                onUpdateUserRolesPermissions={handleUpdateUserRolesPermissions}
              />
            </PaginatedTable>
          )}
        </CardContent>
      </Card>
      <AddMainRoleModal
        open={showAddMainRole}
        onClose={() => setShowAddMainRole(false)}
        onSubmit={handleAddMainRole}
      />
      </div>
    </PDynamic>
  );
}