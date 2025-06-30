"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MultiSelect, MultiSelectTrigger, MultiSelectValue, MultiSelectContent, MultiSelectItem } from "@/components/ui/multi-select";
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

  // Cập nhật role (chọn một)
  const handleRoleChange = (value: string) => {
    setEditUser(prev => ({
      ...prev,
      roles: [{ name: value } as Role]
    }));
  };

  // Cập nhật departments (chọn nhiều)
  const handleDepartmentsChange = (selected: string[]) => {
    setEditUser(prev => ({
      ...prev,
      departments: selected.map(name => ({ name } as Department))
    }));
  };

  const handleSave = () => {
    onSave(editUser);
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
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Vai trò
              </label>
              <Select
                value={editUser.roles[0]?.name || ""}
                onValueChange={handleRoleChange}
              >
                <SelectTrigger>
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
            </div>

            {/* Select Phòng ban (nhiều lựa chọn) */}
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1 block">
                Phòng ban
              </label>
              <MultiSelect
                values={editUser.departments.map(d => d.name)}
                onValuesChange={handleDepartmentsChange}
              >
                <MultiSelectTrigger>
                  <MultiSelectValue placeholder="Chọn phòng ban" />
                </MultiSelectTrigger>
                <MultiSelectContent>
                  {departments.map(dep => (
                    <MultiSelectItem key={dep} value={dep}>
                      {dep}
                    </MultiSelectItem>
                  ))}
                </MultiSelectContent>
              </MultiSelect>
            </div>
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
