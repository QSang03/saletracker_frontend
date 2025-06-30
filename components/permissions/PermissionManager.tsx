"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserFilterBar from "@/components/permissions/UserFilterBar";
import { PermissionEditorModal } from "@/components/permissions/PermissionEditorModal";
import { User } from "@/types";
import DataTable from "../ui/tables/DataTable";
import { Settings } from "lucide-react";
import { RolePermissionModal } from "@/components/permissions/RolePermissionModal";

interface FilterParams {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
}

export default function PermissionManager({ 
  users,
  onUserUpdate
}: { 
  users: User[];
  onUserUpdate: (user: User) => void;
}) {
  const [filters, setFilters] = useState<FilterParams>({});
  const [filteredUsers, setFilteredUsers] = useState<User[]>(users);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showRolePermissionModal, setShowRolePermissionModal] = useState(false);
  
  useEffect(() => {
    const searchLower = filters.search?.toLowerCase() || "";
    
    const filtered = users.filter(user => {
      // Lọc theo tìm kiếm
      if (searchLower && 
          !user.username.toLowerCase().includes(searchLower) &&
          !(user.fullName && user.fullName.toLowerCase().includes(searchLower))) {
        return false;
      }
      
      // Lọc theo role
      if (filters.role && !user.roles.some(r => r.name === filters.role)) {
        return false;
      }
      
      // Lọc theo department (kiểm tra trong mảng departments)
      if (filters.department && 
          !user.departments.some(d => d.name === filters.department)) {
        return false;
      }
      
      // Lọc theo status
      if (filters.status && user.status !== filters.status) {
        return false;
      }
      
      return true;
    });

    setFilteredUsers(filtered);
  }, [filters, users]);

  const availableRoles = Array.from(
    new Set(users.flatMap(user => user.roles.map(role => role.name)))
  );
  
  const availableDepartments = Array.from(
    new Set(users.flatMap(user => 
      user.departments.map(d => d.name)
    ))
  );

  // Chuẩn bị headers và rows cho DataTable
  const headers = [
    "Họ tên",
    "Tên đăng nhập",
    "Email",
    "Vai trò",
    "Phòng ban",
    "Hành động",
  ];

  const rows = filteredUsers.map((user) => [
    user.fullName || "-",
    user.username,
    user.email || "-",
    user.roles.map((role) => role.name).join(", "),
    user.departments.map(d => d.name).join(", ") || "-", // Hiển thị danh sách phòng ban
    user,
  ]);

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Phân quyền người dùng</CardTitle>
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={() => setShowRolePermissionModal(true)}
        >
          <Settings className="w-4 h-4" />
          Phân quyền Role
        </Button>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <UserFilterBar 
          onFilterChange={setFilters} 
          availableRoles={availableRoles}
          availableDepartments={availableDepartments}
        />

        <DataTable
          headers={headers}
          rows={rows}
          expectedRowCount={filteredUsers.length}
          renderCell={(rowIdx, colIdx, value) => {
            if (colIdx === headers.length - 1) {
              const user = value as User;
              return (
                <Button
                  size="sm"
                  variant="gradient"
                  onClick={() => setSelectedUser(user)}
                >
                  Chỉnh sửa
                </Button>
              );
            }
            return value;
          }}
        />

        {selectedUser && (
          <PermissionEditorModal
            user={selectedUser}
            onClose={() => setSelectedUser(null)}
            onSave={(updatedUser) => {
              onUserUpdate(updatedUser);
              setSelectedUser(null);
            }}
            availableRoles={availableRoles}
            departments={availableDepartments}
          />
        )}
      </CardContent>
      
      {showRolePermissionModal && (
        <RolePermissionModal
          onClose={() => setShowRolePermissionModal(false)}
          onSave={(permissions) => {
            console.log("Permissions updated:", permissions);
            setShowRolePermissionModal(false);
          }}
        />
      )}
    </Card>
  );
}
