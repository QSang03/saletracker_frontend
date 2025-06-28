"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

// Danh sách các quyền
const PERMISSIONS = [
  { id: "create", name: "Tạo mới" },
  { id: "read", name: "Xem" },
  { id: "update", name: "Sửa" },
  { id: "delete", name: "Xóa" },
  { id: "import", name: "Nhập dữ liệu" },
  { id: "export", name: "Xuất dữ liệu" },
];

// Các role cần phân quyền
const ROLES = [
  { id: "user", name: "Người dùng thường" },
  { id: "manager", name: "Quản lý" },
  { id: "admin", name: "Quản trị viên" },
];

interface PermissionState {
  [roleId: string]: {
    [permissionId: string]: boolean;
  };
}

export function RolePermissionModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (permissions: any) => void;
}) {
  // Khởi tạo state với các quyền mặc định
  const [permissions, setPermissions] = useState<PermissionState>(() => {
    const initialState: PermissionState = {};
    
    ROLES.forEach(role => {
      initialState[role.id] = {};
      PERMISSIONS.forEach(permission => {
        // Mặc định: Admin có tất cả quyền, Manager có CRUD, User chỉ có Read
        initialState[role.id][permission.id] = 
          role.id === "admin" ? true :
          role.id === "manager" ? ["create", "read", "update", "delete"].includes(permission.id) :
          permission.id === "read";
      });
    });
    
    return initialState;
  });

  // Xử lý thay đổi trạng thái
  const handlePermissionChange = (roleId: string, permissionId: string, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [roleId]: {
        ...prev[roleId],
        [permissionId]: checked,
      }
    }));
  };

  // Chuẩn bị dữ liệu để lưu
  const prepareSaveData = () => {
    const result: any[] = [];
    
    ROLES.forEach(role => {
      PERMISSIONS.forEach(permission => {
        result.push({
          role_id: role.id,
          permission_id: permission.id,
          is_active: permissions[role.id][permission.id]
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
            Bật/tắt quyền cho từng role. Quyền được bật sẽ có hiệu lực ngay lập tức.
          </p>
        </DialogHeader>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr>
                <th className="text-left p-2 border-b">Quyền</th>
                {ROLES.map(role => (
                  <th key={role.id} className="text-center p-2 border-b">
                    {role.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PERMISSIONS.map(permission => (
                <tr key={permission.id} className="border-b hover:bg-muted/50">
                  <td className="p-3">{permission.name}</td>
                  {ROLES.map(role => (
                    <td key={`${role.id}-${permission.id}`} className="text-center p-3">
                      <div className="flex justify-center">
                        <Checkbox
                          id={`${role.id}-${permission.id}`}
                          checked={permissions[role.id]?.[permission.id] || false}
                          onCheckedChange={(checked) => 
                            handlePermissionChange(role.id, permission.id, !!checked)
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
          <Button 
            variant="gradient"
            onClick={() => onSave(prepareSaveData())}
          >
            Lưu phân quyền
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
