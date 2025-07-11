import React, { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import type { User, Department, Permission, RolePermission } from "@/types";
import UserRoleAndPermissionModal from "./UserRoleAndPermissionModal";

interface RoleTableProps {
  users: User[];
  rolesGrouped: {
    main: { id: number; name: string }[];
    sub: { id: number; name: string; display_name: string }[];
  };
  departments: Department[];
  permissions: Permission[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => Promise<void>;
  allRolePermissions: RolePermission[];
  onUpdateUserRolesPermissions: (
    userId: number,
    data: { departmentIds: number[]; roleIds: number[]; permissionIds: number[] }
  ) => Promise<void>;
}

export default function RoleTable({
  users,
  rolesGrouped,
  departments,
  permissions,
  expectedRowCount,
  startIndex,
  onReload,
  allRolePermissions,
  onUpdateUserRolesPermissions,
}: RoleTableProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <div className="border rounded-xl overflow-x-auto shadow-inner">
        <Table className="min-w-[700px]">
          <TableHeader className="sticky top-0 z-10 shadow-sm">
            <TableRow>
              <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
              <TableHead className="px-3 py-2 text-left">Họ tên</TableHead>
              <TableHead className="px-3 py-2 text-left">Tài khoản</TableHead>
              <TableHead className="px-3 py-2 text-left">Phòng ban</TableHead>
              <TableHead className="px-3 py-2 text-left">Role</TableHead>
              <TableHead className="w-36 text-center px-3 py-2">
                Thao tác
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={6}
                  className="text-center py-4 text-gray-400"
                >
                  Không có user nào phù hợp.
                </TableCell>
              </TableRow>
            ) : (
              Array.from({ length: expectedRowCount }).map((_, idx) => {
                const user = users[idx];
                return user ? (
                  <TableRow
                    key={user.id}
                    className={idx % 2 === 0 ? "bg-gray-50" : ""}
                  >
                    <TableCell className="text-center px-3 py-2">
                      {startIndex + idx + 1}
                    </TableCell>
                    <TableCell className="px-3 py-2">{user.fullName}</TableCell>
                    <TableCell className="px-3 py-2">{user.username}</TableCell>
                    <TableCell className="px-3 py-2">
                      {user.departments?.map((dep) => dep.name).join(", ")}
                    </TableCell>
                    <TableCell className="px-3 py-2">
                      {user.roles?.map((role) => role.name).join(", ")}
                    </TableCell>
                    <TableCell className="text-center px-3 py-2 flex gap-2 justify-center">
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => {
                          setSelectedUser(user);
                          setShowModal(true);
                        }}
                      >
                        Quản lý quyền
                      </Button>
                    </TableCell>
                  </TableRow>
                ) : (
                  <TableRow
                    key={`empty-${idx}`}
                    className="bg-white dark:bg-muted/20 select-none"
                    style={{ height: 49, opacity: 0, pointerEvents: "none" }}
                    aria-hidden="true"
                  >
                    {Array.from({ length: 6 }).map((_, i) => (
                      <TableCell key={i} />
                    ))}
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {/* Đặt modal ở ngoài bảng để không bị giới hạn chiều rộng */}
      {showModal && selectedUser && (
        <UserRoleAndPermissionModal
          user={selectedUser}
          rolesGrouped={rolesGrouped}
          departments={departments}
          permissions={permissions}
          rolePermissions={allRolePermissions.filter(rp => selectedUser.roles.some(role => role.id === rp.roleId))}
          onClose={() => setShowModal(false)}
          onSave={(data) =>
            onUpdateUserRolesPermissions(selectedUser.id, data)
          }
        />
      )}
    </>
  );
}