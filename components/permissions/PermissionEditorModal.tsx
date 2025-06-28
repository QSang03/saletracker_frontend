"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useEffect } from "react";
import { Role, User, Department } from "@/types";

interface PermissionEditorModalProps {
  user: User;
  onClose: () => void;
  onSave: (user: User) => void;
  availableRoles: string[];
  departments: string[];
}

export function PermissionEditorModal({
  user,
  onClose,
  onSave,
  availableRoles,
  departments,
}: PermissionEditorModalProps) {
  const [editUser, setEditUser] = useState<User>({ ...user });

  useEffect(() => {
    setEditUser({ ...user });
  }, [user]);

  const handleSave = () => {
    onSave(editUser);
  };

  // Hàm xử lý cập nhật department
  const handleDepartmentChange = (value: string) => {
    setEditUser(prev => ({
      ...prev,
      department: { name: value } as Department
    }));
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            Phân quyền: {editUser.fullName || editUser.username}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-4">
            {/* Select Vai trò */}
            <Select
              value={editUser.roles[0]?.name || ""}
              onValueChange={(value) => {
                setEditUser(prev => ({
                  ...prev,
                  roles: [{ name: value } as Role]
                }));
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Vai trò" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map(role => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Select Phòng ban */}
            <Select
              value={editUser.department?.name || ""}
              onValueChange={handleDepartmentChange}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Phòng ban" />
              </SelectTrigger>
              <SelectContent>
                {departments.map(dep => (
                  <SelectItem key={dep} value={dep}>
                    {dep}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={onClose}>
              Huỷ
            </Button>
            <Button variant="gradient" onClick={handleSave}>
              Lưu thay đổi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
