"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import UserFilterBar from "@/components/permissions/UserFilterBar";
import { PermissionEditorModal } from "@/components/permissions/PermissionEditorModal";
import { User } from "../../types";

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
  
  useEffect(() => {
    const searchLower = filters.search?.toLowerCase() || "";
    
    const filtered = users.filter(user => {
      // Lọc theo tìm kiếm (tên đầy đủ hoặc username)
      if (searchLower && 
          !user.username.toLowerCase().includes(searchLower) &&
          !(user.fullName && user.fullName.toLowerCase().includes(searchLower))) {
        return false;
      }
      
      // Lọc theo vai trò
      if (filters.role && !user.roles.some(r => r.name === filters.role)) {
        return false;
      }
      
      // Lọc theo phòng ban
      if (filters.department && user.department?.name !== filters.department) {
        return false;
      }
      
      // Lọc theo trạng thái
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
    new Set(users.map(user => user.department?.name).filter(Boolean))
  ) as string[];

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Phân quyền người dùng</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <UserFilterBar 
          onFilterChange={setFilters} 
          availableRoles={availableRoles}
          availableDepartments={availableDepartments}
        />

        <div className="overflow-x-auto">
          <table className="w-full border-collapse table-auto text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="border p-2 text-left">Họ tên</th>
                <th className="border p-2 text-left">Tên đăng nhập</th>
                <th className="border p-2 text-left">Email</th>
                <th className="border p-2 text-left">Vai trò</th>
                <th className="border p-2 text-left">Phòng ban</th>
                <th className="border p-2 text-left">Trạng thái</th>
                <th className="border p-2 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-muted-foreground">
                    Không có người dùng phù hợp
                  </td>
                </tr>
              ) : (
                filteredUsers.map(user => (
                  <tr
                    key={user.id}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="border p-2">{user.fullName || "-"}</td>
                    <td className="border p-2">{user.username}</td>
                    <td className="border p-2">{user.email || "-"}</td>
                    <td className="border p-2">
                      {user.roles.map(role => role.name).join(", ")}
                    </td>
                    <td className="border p-2">{user.department?.name || "-"}</td>
                    <td className="border p-2">
                      {user.status === "active" ? "Hoạt động" : "Ngừng"}
                    </td>
                    <td className="border p-2 text-center">
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => setSelectedUser(user)}
                      >
                        Chỉnh sửa
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

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
    </Card>
  );
}
