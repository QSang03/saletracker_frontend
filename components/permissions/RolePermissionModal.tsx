"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RolePermission } from "@/types";

const PERMISSIONS = [
  { id: 1, action: "create" },
  { id: 2, action: "read" },
  { id: 3, action: "update" },
  { id: 4, action: "delete" },
  { id: 5, action: "import" },
  { id: 6, action: "export" },
];

const ROLES = [
  { id: 1, name: "Người dùng thường" },
  { id: 2, name: "Quản lý" },
  { id: 3, name: "Quản trị viên" },
];

interface PermissionState {
  [roleId: number]: {
    [permissionId: number]: boolean;
  };
}

export function RolePermissionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (permissions: RolePermission[]) => void;
}) {
  const [permissions, setPermissions] = useState<PermissionState>(() => {
    const initialState: PermissionState = {};

    ROLES.forEach((role) => {
      initialState[role.id] = {};
      PERMISSIONS.forEach((permission) => {
        initialState[role.id][permission.id] =
          role.id === 3
            ? true // Admin
            : role.id === 2
            ? ["create", "update", "delete"].includes(permission.action) // Manager
            : permission.action === "read"; // User
      });
    });

    return initialState;
  });

  const handlePermissionChange = (
    roleId: number,
    permissionId: number,
    checked: boolean
  ) => {
    setPermissions((prev) => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: checked,
      },
    }));
  };

  const prepareSaveData = (): RolePermission[] => {
    const result: RolePermission[] = [];

    ROLES.forEach((role) => {
      PERMISSIONS.forEach((permission) => {
        result.push({
          roleId: role.id,
          permissionId: permission.id,
          isActive: permissions[role.id][permission.id],
        });
      });
    });

    return result;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Phân quyền cho Role</DialogTitle>
          <p className="text-sm text-muted-foreground">
            Bật/tắt quyền cho từng role. Quyền được bật sẽ có hiệu lực ngay lập
            tức.
          </p>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Quyền</th>
                {ROLES.map((role) => (
                  <th key={role.id} className="text-center p-2 border-b">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map((permission) => (
                <tr key={permission.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">{permission.action}</td>
                  {ROLES.map((role) => (
                    <td
                      key={`${role.id}-${permission.id}`}
                      className="text-center p-3"
                    >
                      <div className="flex justify-center">
                        <Checkbox
                          checked={
                            permissions[role.id]?.[permission.id] || false
                          }
                          onCheckedChange={(checked) =>
                            handlePermissionChange(
                              role.id,
                              permission.id,
                              !!checked
                            )
                          }
                        />
                      </div>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button variant="gradient" onClick={() => onSave(prepareSaveData())}>
            Lưu phân quyền
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
