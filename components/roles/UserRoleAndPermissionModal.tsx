import React, { useState, useMemo, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  MultiSelectCombobox,
  Option,
} from "@/components/ui/MultiSelectCombobox";
import { Checkbox } from "@/components/ui/checkbox";
import { motion } from "framer-motion";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { User, Department, Permission } from "@/types";

interface UserRoleAndPermissionModalProps {
  user: User;
  rolesGrouped: {
    main: { id: number; name: string }[];
    sub: { id: number; name: string; display_name: string }[];
  };
  departments: Department[];
  permissions: Permission[];
  onClose: () => void;
  onSave: (data: {
    departmentIds: number[];
    roleIds: number[];
    permissionIds: number[];
  }) => Promise<void>;
}

export default function UserRoleAndPermissionModal({
  user,
  rolesGrouped,
  departments,
  permissions,
  onClose,
  onSave,
}: UserRoleAndPermissionModalProps) {
  const [selectedDepartments, setSelectedDepartments] = useState<number[]>(
    user.departments?.map((d) => d.id) || []
  );
  const mainRoleOptions: Option[] = rolesGrouped.main.map((r) => ({
    label: r.name,
    value: r.id,
  }));
  const [selectedMainRoles, setSelectedMainRoles] = useState<number[]>(
    user.roles
      ?.filter((r) => rolesGrouped.main.some((m) => m.id === r.id))
      .map((r) => r.id) || []
  );
  const allSubRoles = useMemo(() => {
    return rolesGrouped.sub.map((r) => ({
      ...r,
      depName: departments.find((dep) => r.name.endsWith(`-${dep.slug}`))?.name,
    }));
  }, [rolesGrouped.sub, departments]);
  const subRoleOptions: Option[] = allSubRoles.map((r) => ({
    label: r.depName ? `${r.display_name} (${r.depName})` : r.display_name,
    value: r.id,
  }));
  const [selectedSubRoles, setSelectedSubRoles] = useState<number[]>(
    user.roles
      ?.filter((r) => rolesGrouped.sub.some((s) => s.id === r.id))
      .map((r) => r.id) || []
  );
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>(
    user.roles?.flatMap(
      (r) =>
        r.rolePermissions
          ?.filter((rp) => rp.isActive)
          .map((rp) => rp.permissionId) || []
    ) || []
  );
  const [saving, setSaving] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const prevDepartments = useRef<number[]>(selectedDepartments);
  const departmentOptions: Option[] = departments.map((dep) => ({
    label: dep.name,
    value: dep.id,
  }));
  const selectedMainRoleNames = useMemo(
    () =>
      rolesGrouped.main
        .filter((r) => selectedMainRoles.includes(r.id))
        .map((r) => r.name),
    [rolesGrouped.main, selectedMainRoles]
  );
  const depSlugs = useMemo(
    () =>
      departments
        .filter((dep) => selectedDepartments.includes(dep.id))
        .map((dep) => dep.slug),
    [departments, selectedDepartments]
  );
  const getPermissionIdsForRole = (
    roleName: string,
    depSlugs: string[] = []
  ) => {
    if (roleName === "admin") {
      return permissions.map((p) => p.id);
    }
    if (roleName === "manager") {
      if (depSlugs.length === 0) return [];
      return permissions
        .filter((p) => depSlugs.includes(p.name))
        .map((p) => p.id);
    }
    if (roleName === "user") {
      if (depSlugs.length === 0) return [];
      return permissions
        .filter((p) => depSlugs.includes(p.name) && p.action === "read")
        .map((p) => p.id);
    }
    for (const slug of depSlugs) {
      if (roleName === `manager-${slug}`) {
        return permissions.filter((p) => p.name === slug).map((p) => p.id);
      }
      if (roleName === `user-${slug}`) {
        return permissions
          .filter((p) => p.name === slug && p.action === "read")
          .map((p) => p.id);
      }
    }
    return [];
  };
  useEffect(() => {
    if (selectedMainRoleNames.includes("admin")) {
      setSelectedDepartments([]);
      setSelectedMainRoles([
        rolesGrouped.main.find((r) => r.name === "admin")?.id!,
      ]);
      setSelectedSubRoles([]);
      setSelectedPermissions(permissions.map((p) => p.id));
      return;
    }
    let autoSubRoles = selectedSubRoles.filter((id) =>
      allSubRoles.some((r) => r.id === id)
    );
    for (const dep of departments) {
      if (selectedDepartments.includes(dep.id)) {
        if (selectedMainRoleNames.includes("manager")) {
          const managerRole = allSubRoles.find(
            (r) => r.name === `manager-${dep.slug}`
          );
          if (managerRole && !autoSubRoles.includes(managerRole.id)) {
            autoSubRoles.push(managerRole.id);
          }
        }
        if (selectedMainRoleNames.includes("user")) {
          const userRole = allSubRoles.find(
            (r) => r.name === `user-${dep.slug}`
          );
          if (userRole && !autoSubRoles.includes(userRole.id)) {
            autoSubRoles.push(userRole.id);
          }
        }
      }
    }
    if (!selectedMainRoleNames.includes("manager")) {
      autoSubRoles = autoSubRoles.filter(
        (id) =>
          !allSubRoles.find((r) => r.id === id)?.name.startsWith("manager-")
      );
    }
    if (!selectedMainRoleNames.includes("user")) {
      autoSubRoles = autoSubRoles.filter(
        (id) => !allSubRoles.find((r) => r.id === id)?.name.startsWith("user-")
      );
    }
    setSelectedSubRoles(Array.from(new Set(autoSubRoles)));
    if (selectedMainRoleNames.includes("manager") && depSlugs.length > 0) {
      const ids = permissions
        .filter((p) => depSlugs.includes(p.name))
        .map((p) => p.id);
      setSelectedPermissions(ids);
      return;
    }
    if (selectedMainRoleNames.includes("user") && depSlugs.length > 0) {
      const ids = permissions
        .filter((p) => depSlugs.includes(p.name) && p.action === "read")
        .map((p) => p.id);
      setSelectedPermissions(ids);
      return;
    }
    let ids: number[] = [];
    for (const subRoleId of selectedSubRoles) {
      const subRole = allSubRoles.find((r) => r.id === subRoleId);
      if (subRole) {
        ids = [
          ...ids,
          ...getPermissionIdsForRole(subRole.name, [
            subRole.name.split("-")[1],
          ]),
        ];
      }
    }
    if (ids.length > 0) {
      setSelectedPermissions(Array.from(new Set(ids)));
      return;
    }
    setSelectedPermissions([]);
  }, [
    selectedDepartments.join(","),
    selectedMainRoleNames.join(","),
    selectedSubRoles.join(","),
    depSlugs.join(","),
    permissions,
    departments,
  ]);
  const handleDepartmentChange = (vals: (string | number)[]) => {
    setSelectedDepartments(vals.map(Number));
    const adminRole = rolesGrouped.main.find((r) => r.name === "admin");
    if (adminRole && selectedMainRoles.includes(adminRole.id)) {
      setSelectedMainRoles(
        selectedMainRoles.filter((id) => id !== adminRole.id)
      );
    }
  };
  const handleMainRoleChange = (vals: (string | number)[]) => {
    setSelectedMainRoles(vals.map(Number));
  };
  const handleSubRoleChange = (vals: (string | number)[]) => {
    setSelectedSubRoles(vals.map(Number));
  };
  const handlePermissionChange = (permissionId: number, checked: boolean) => {
    setSelectedPermissions((prev) =>
      checked
        ? [...prev, permissionId]
        : prev.filter((id) => id !== permissionId)
    );
  };
  const handleSave = async () => {
    setShowConfirm(true);
  };
  const handleConfirm = async () => {
    setSaving(true);
    await onSave({
      departmentIds: selectedDepartments,
      roleIds: [...selectedMainRoles, ...selectedSubRoles],
      permissionIds: selectedPermissions,
    });
    setSaving(false);
    setShowConfirm(false);
    onClose();
  };
  const handleCancel = () => {
    setShowConfirm(false);
  };
  const GradientTitle = ({
    children,
    className = "",
  }: {
    children: React.ReactNode;
    className?: string;
  }) => (
    <motion.span
      className={
        "uppercase font-bold bg-gradient-to-r from-pink-500 via-yellow-400 to-purple-500 bg-clip-text text-transparent animate-gradient-x " +
        className
      }
      style={{
        backgroundSize: "200% auto",
        display: "inline-block",
      }}
      animate={{
        backgroundPosition: ["0% center", "100% center"],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatType: "reverse",
        ease: "easeInOut",
      }}
    >
      {children}
    </motion.span>
  );
  return (
    <>
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open && !showConfirm) onClose();
        }}
      >
        <DialogContent
          className="w-screen max-w-3xl p-6 rounded-xl shadow-xl"
          style={{
            maxWidth: "80vw",
            height: "80vh",
            overflow: "auto",
          }}
        >
          <DialogTitle className="text-2xl font-bold mb-4 text-center">
            Quản lý quyền cho {user.fullName}
          </DialogTitle>
          <div className="mb-4">
            <GradientTitle className="text-lg mb-2 block">
              CHỌN PHÒNG BAN
            </GradientTitle>
            <MultiSelectCombobox
              options={departmentOptions}
              value={selectedDepartments}
              onChange={handleDepartmentChange}
              placeholder="Chọn phòng ban..."
            />
          </div>
          <div className="mb-4">
            <GradientTitle className="text-lg mb-2 block">
              VAI TRÒ CHÍNH
            </GradientTitle>
            <MultiSelectCombobox
              options={mainRoleOptions}
              value={selectedMainRoles}
              onChange={handleMainRoleChange}
              placeholder="Chọn vai trò chính..."
            />
            <GradientTitle className="text-base mb-2 mt-4 block">
              VAI TRÒ PHỤ
            </GradientTitle>
            <MultiSelectCombobox
              options={subRoleOptions}
              value={selectedSubRoles}
              onChange={handleSubRoleChange}
              placeholder="Chọn vai trò phụ..."
            />
          </div>
          <div className="mb-4">
            <GradientTitle className="text-lg mb-2 block">
              QUYỀN HẠN
            </GradientTitle>
            <div>
              {departments.map((dep) => {
                const depPermissions = permissions.filter(
                  (p) => p.name === dep.slug
                );
                if (depPermissions.length === 0) return null;
                return (
                  <div key={dep.id} className="mb-3">
                    <div className="font-semibold text-lg mb-1">{dep.name}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                      {depPermissions.map((permission) => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2"
                        >
                          <Checkbox
                            checked={selectedPermissions.includes(
                              permission.id
                            )}
                            onCheckedChange={(checked) =>
                              handlePermissionChange(permission.id, !!checked)
                            }
                          />
                          {permission.name} ({permission.action})
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <DialogFooter>
            <Button variant="gradient" onClick={handleSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu"}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={saving}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận cập nhật phân quyền"
        message="Bạn có chắc chắn muốn lưu các thay đổi phân quyền cho người dùng này?"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </>
  );
}