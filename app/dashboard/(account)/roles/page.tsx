"use client";

import { useEffect, useState, useMemo } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import RoleManagement from "@/components/roles/RoleManagement";
import AddMainRoleModal from "@/components/roles/AddMainRoleModal";
import type { User, Department, Permission } from "@/types";
import { getAccessToken } from "@/lib/auth";

export default function RolesPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [rolesGrouped, setRolesGrouped] = useState<{
    main: { id: number; name: string }[];
    sub: { id: number; name: string; display_name: string }[];
  }>({ main: [], sub: [] });
  const [departments, setDepartments] = useState<Department[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [alert, setAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Pagination & filter state
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Modal state cho thêm vai trò chính
  const [showAddMainRole, setShowAddMainRole] = useState(false);

  // Hàm fetch có header và token
  const fetchWithToken = async (url: string) => {
    const token = getAccessToken
      ? getAccessToken()
      : localStorage.getItem("access_token");
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
    return res.ok ? res.json() : [];
  };

  // Fetch all data
  const fetchAll = async () => {
    setIsLoading(true);
    try {
      const [usersData, rolesGroupedData, departmentsData, permissionsData] = await Promise.all([
        fetchWithToken("/users/for-permission-management"),
        fetchWithToken("/roles/grouped"),
        fetchWithToken("/departments"),
        fetchWithToken("/permissions"),
      ]);
      setUsers(Array.isArray(usersData) ? usersData : usersData.data || []);
      setRolesGrouped(rolesGroupedData || { main: [], sub: [] });
      setDepartments(Array.isArray(departmentsData) ? departmentsData : departmentsData.data || []);
      setPermissions(Array.isArray(permissionsData) ? permissionsData : permissionsData.data || []);
    } catch {
      setAlert({ type: "error", message: "Lỗi tải dữ liệu phân quyền!" });
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

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
      await fetchAll();
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
      await fetchAll();
    } catch {
      setAlert({ type: "error", message: "Cập nhật phân quyền thất bại!" });
    }
  };

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold">
            👥 Quản lý phân quyền
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="add" onClick={() => setShowAddMainRole(true)}>
              + Tạo vai trò chính
            </Button>
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
              page={page}
              pageSize={pageSize}
              total={filteredUsers.length}
              onPageChange={setPage}
              onFilterChange={({ search }) => {
                setSearch(search);
                setPage(1);
              }}
              pageSizeOptions={[5, 10, 20, 50]}
            >
              <RoleManagement
                users={pagedUsers}
                rolesGrouped={rolesGrouped}
                departments={departments}
                permissions={permissions}
                expectedRowCount={pageSize}
                startIndex={(page - 1) * pageSize}
                onReload={fetchAll}
                // Truyền callback cập nhật phân quyền user xuống
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
  );
}