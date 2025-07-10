import React, { useEffect, useState, useMemo, useRef } from "react";
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
import type { User, Department, Permission, RolePermission } from "@/types";

export interface UserRoleAndPermissionModalProps {
  user: User;
  rolesGrouped: {
    main: { id: number; name: string }[];
    sub: { id: number; name: string; display_name: string }[];
  };
  departments: Department[];
  permissions: Permission[];
  rolePermissions: RolePermission[];
  onClose: () => void;
  onSave: (data: {
    departmentIds: number[];
    roleIds: number[];
    permissionIds: number[];
    rolePermissions: { roleId: number; permissionId: number; isActive: boolean }[];
  }) => Promise<void>;
}

export default function UserRoleAndPermissionModal({
  user,
  rolesGrouped,
  departments,
  permissions,
  rolePermissions,
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
  const [loadingPermissions, setLoadingPermissions] = useState(false);
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
  // KHÔNG fetch API nữa, chỉ dùng rolePermissions prop
  const [rolePermissionsState, setRolePermissionsState] = useState<{ roleId: number; permissionId: number; isActive: boolean }[]>(rolePermissions);
  useEffect(() => {
    setRolePermissionsState(rolePermissions);
    const activePermissions = rolePermissions.filter((rp) => rp.isActive).map((rp) => rp.permissionId);
    setSelectedPermissions(activePermissions);
  }, [rolePermissions, rolesGrouped.main, rolesGrouped.sub]);

  // Khi user prop thay đổi (user khác), set lại các state phòng ban, vai trò chính, vai trò phụ đúng thực tế
  useEffect(() => {
    setSelectedDepartments(user.departments?.map((d) => d.id) || []);
    setSelectedMainRoles(
      user.roles?.filter((r) => rolesGrouped.main.some((m) => m.id === r.id)).map((r) => r.id) || []
    );
    setSelectedSubRoles(
      user.roles?.filter((r) => rolesGrouped.sub.some((s) => s.id === r.id)).map((r) => r.id) || []
    );
  }, [user.id, rolesGrouped.main, rolesGrouped.sub]);

  // Helper: kiểm tra quyền này có đang active với vai trò đang chọn không
  const isPermissionActive = (permissionId: number, roleId: number) => {
    return rolePermissionsState.some(
      (rp) => rp.roleId === roleId && rp.permissionId === permissionId && rp.isActive
    );
  };

  // Helper: lấy tất cả roleId hiện tại (main + sub) đang chọn
  const currentRoleIds = useMemo(() => {
    return [...selectedMainRoles, ...selectedSubRoles];
  }, [selectedMainRoles, selectedSubRoles]);

  // Khi click checkbox quyền, chỉ cập nhật rolePermissionsState
  const handlePermissionChange = (permissionId: number, roleId: number, checked: boolean) => {
    setRolePermissionsState((prev) => {
      let found = false;
      const updated = prev.map((rp) => {
        if (rp.roleId === roleId && rp.permissionId === permissionId) {
          found = true;
          return { ...rp, isActive: checked };
        }
        return rp;
      });
      if (!found) {
        updated.push({ roleId, permissionId, isActive: checked });
      }
      return updated;
    });
  };

  const handleDepartmentChange = (vals: (string | number)[]) => {
    setSelectedDepartments(vals.map(Number));
    const adminRole = rolesGrouped.main.find((r) => r.name === "admin");
    if (adminRole && selectedMainRoles.includes(adminRole.id)) {
      setSelectedMainRoles(selectedMainRoles.filter((id) => id !== adminRole.id));
    }
    // Nếu đang chọn manager thì active full quyền theo phòng ban
    const managerRole = rolesGrouped.main.find((r) => r.name === "manager");
    if (managerRole && selectedMainRoles.includes(managerRole.id)) {
      const depSlugs = departments.filter((dep) => vals.map(Number).includes(dep.id)).map((dep) => dep.slug);
      setRolePermissionsState((prev) => {
        let updated = [...prev];
        permissions.forEach((p) => {
          if (depSlugs.includes(p.name)) {
            // Tìm tất cả roleId manager và sub manager của các phòng ban này
            const roleIds = [managerRole.id, ...rolesGrouped.sub.filter((r) => r.name === `manager-${p.name}`).map((r) => r.id)];
            roleIds.forEach((roleId) => {
              const idx = updated.findIndex(rp => rp.roleId === roleId && rp.permissionId === p.id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], isActive: true };
              } else {
                updated.push({ roleId, permissionId: p.id, isActive: true });
              }
            });
          }
        });
        return updated;
      });
    }
  };
  const handleMainRoleChange = (vals: (string | number)[]) => {
    setSelectedMainRoles(vals.map(Number));
    const adminRole = rolesGrouped.main.find((r) => r.name === "admin");
    const managerRole = rolesGrouped.main.find((r) => r.name === "manager");
    if (adminRole && vals.includes(adminRole.id)) {
      // Nếu chọn admin thì active full quyền
      setRolePermissionsState((prev) => {
        let updated = [...prev];
        permissions.forEach((p) => {
          // Tìm tất cả roleId admin và sub admin (nếu có)
          const roleIds = [adminRole.id, ...rolesGrouped.sub.filter((r) => r.name.startsWith("admin")).map((r) => r.id)];
          roleIds.forEach((roleId) => {
            const idx = updated.findIndex(rp => rp.roleId === roleId && rp.permissionId === p.id);
            if (idx !== -1) {
              updated[idx] = { ...updated[idx], isActive: true };
            } else {
              updated.push({ roleId, permissionId: p.id, isActive: true });
            }
          });
        });
        return updated;
      });
      setSelectedDepartments([]); // clear phòng ban khi chọn admin
      setSelectedSubRoles([]); // clear sub role khi chọn admin
    } else if (managerRole && vals.includes(managerRole.id)) {
      // Nếu chọn manager thì active full quyền theo phòng ban đã chọn
      const depSlugs = departments.filter((dep) => selectedDepartments.includes(dep.id)).map((dep) => dep.slug);
      setRolePermissionsState((prev) => {
        let updated = [...prev];
        permissions.forEach((p) => {
          if (depSlugs.includes(p.name)) {
            // Tìm tất cả roleId manager và sub manager của các phòng ban này
            const roleIds = [managerRole.id, ...rolesGrouped.sub.filter((r) => r.name === `manager-${p.name}`).map((r) => r.id)];
            roleIds.forEach((roleId) => {
              const idx = updated.findIndex(rp => rp.roleId === roleId && rp.permissionId === p.id);
              if (idx !== -1) {
                updated[idx] = { ...updated[idx], isActive: true };
              } else {
                updated.push({ roleId, permissionId: p.id, isActive: true });
              }
            });
          }
        });
        return updated;
      });
    }
  };
  const handleSubRoleChange = (vals: (string | number)[]) => {
    setSelectedSubRoles(vals.map(Number));
  };
  const handleSave = async () => {
    setShowConfirm(true);
  };
  const handleConfirm = async () => {
    setSaving(true);
    // Lấy các role phụ thực tế của user (roleId thuộc rolesGrouped.sub)
    const subRoleIds = user.roles.filter(r => rolesGrouped.sub.some(s => s.id === r.id)).map(r => r.id);
    // Lấy tất cả permissionId đang active từ rolePermissionsState, chỉ cho role phụ
    const uniqueRolePermissions = rolePermissionsState.filter(
      (rp) => subRoleIds.includes(rp.roleId)
    );
    const permissionIds = Array.from(
      new Set(uniqueRolePermissions.filter(rp => rp.isActive).map(rp => rp.permissionId))
    );
    await onSave({
      departmentIds: selectedDepartments,
      roleIds: [...selectedMainRoles, ...selectedSubRoles],
      permissionIds,
      rolePermissions: uniqueRolePermissions,
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
  // Lấy đúng vai trò chính/phụ thực tế của user để xác định quyền
  const userMainRoleIds = user.roles.filter(r => rolesGrouped.main.some(m => m.id === r.id)).map(r => r.id);
  const userSubRoleIds = user.roles.filter(r => rolesGrouped.sub.some(s => s.id === r.id)).map(r => r.id);
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
          {loadingPermissions ? (
            <div className="text-center py-8">Đang tải quyền thực tế...</div>
          ) : (
            <>
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
                    const depPermissions = permissions.filter((p) => p.name === dep.slug);
                    if (depPermissions.length === 0) return null;
                    return (
                      <div key={dep.id} className="mb-3">
                        <div className="font-semibold text-lg mb-1">{dep.name}</div>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                          {depPermissions.map((permission) => {
                            // Dùng đúng roleId hiện tại (main + sub) đang chọn
                            const isActive = currentRoleIds.some(roleId => isPermissionActive(permission.id, roleId));
                            return (
                              <label key={permission.id} className="flex items-center gap-2">
                                <Checkbox
                                  checked={isActive}
                                  onCheckedChange={(checked) => {
                                    setRolePermissionsState((prev) => {
                                      const updated = [...prev];
                                      currentRoleIds.forEach((roleId) => {
                                        const idx = updated.findIndex(rp => rp.roleId === roleId && rp.permissionId === permission.id);
                                        if (idx !== -1) {
                                          updated[idx] = { ...updated[idx], isActive: !!checked };
                                        } else {
                                          updated.push({ roleId, permissionId: permission.id, isActive: !!checked });
                                        }
                                      });
                                      return updated;
                                    });
                                  }}
                                />
                                {permission.name} ({permission.action})
                              </label>
                            );
                          })}
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
            </>
          )}
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