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
    viewSubRoleName?: string; // Thêm thông tin để backend tạo role "view con"
  }) => Promise<void>;
  onSaveSuccess?: () => void; // Callback khi lưu thành công
}

export default function UserRoleAndPermissionModal({
  user,
  rolesGrouped,
  departments,
  permissions,
  rolePermissions,
  onClose,
  onSave,
  onSaveSuccess,
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
  // Only show sub-role options that correspond to the selected main roles.
  // E.g. if main includes 'manager' show only 'manager-<dep>' subs; if 'pm' show only 'pm-<dep>' subs, etc.
  const subRoleOptions: Option[] = useMemo(() => {
    // derive selected main role names from selectedMainRoles to avoid ordering issues
    const mainPrefixes = rolesGrouped.main
      .filter((r) => selectedMainRoles.includes(r.id))
      .map((r) => r.name.toLowerCase());
    // If no main role selected, don't offer any sub roles
    if (mainPrefixes.length === 0) return [];
    return allSubRoles
      .filter((r) => {
        // support both hyphen and underscore separators (e.g., pm-sales or pm_sales)
        const prefix = (r.name || "").split(/[-_]/)[0];
        return mainPrefixes.includes(prefix);
      })
      .map((r) => ({
        label: r.depName ? `${r.display_name} (${r.depName})` : r.display_name,
        value: r.id,
      }));
  }, [allSubRoles, rolesGrouped.main, selectedMainRoles]);
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
  
  // State cho role "view"
  const [isViewRoleSelected, setIsViewRoleSelected] = useState(false);
  const [viewRoleDepartments, setViewRoleDepartments] = useState<number[]>([]);
  const [viewRolePermissions, setViewRolePermissions] = useState<number[]>([]);
  
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
        // manager-<dep>
        if (selectedMainRoleNames.includes("manager")) {
          const managerRole = allSubRoles.find(
            (r) => r.name === `manager-${dep.slug}`
          );
          if (managerRole && !autoSubRoles.includes(managerRole.id)) {
            autoSubRoles.push(managerRole.id);
          }
        }
        // user-<dep>
        if (selectedMainRoleNames.includes("user")) {
          const userRole = allSubRoles.find(
            (r) => r.name === `user-${dep.slug}`
          );
          if (userRole && !autoSubRoles.includes(userRole.id)) {
            autoSubRoles.push(userRole.id);
          }
        }
        // pm-<dep>
        if (selectedMainRoleNames.includes("pm")) {
          const pmRole = allSubRoles.find((r) => r.name === `pm-${dep.slug}`);
          if (pmRole && !autoSubRoles.includes(pmRole.id)) {
            autoSubRoles.push(pmRole.id);
          }
        }
      }
    }
    if (!selectedMainRoleNames.includes("manager")) {
      autoSubRoles = autoSubRoles.filter(
        (id) => !allSubRoles.find((r) => r.id === id)?.name.startsWith("manager-")
      );
    }
    if (!selectedMainRoleNames.includes("user")) {
      autoSubRoles = autoSubRoles.filter(
        (id) => !allSubRoles.find((r) => r.id === id)?.name.startsWith("user-")
      );
    }
    if (!selectedMainRoleNames.includes("pm")) {
      autoSubRoles = autoSubRoles.filter(
        (id) => !allSubRoles.find((r) => r.id === id)?.name.startsWith("pm-")
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
    
    // Kiểm tra nếu user có role "view"
    const hasViewRole = user.roles?.some((r) => r.name === "view");
    if (hasViewRole) {
      setIsViewRoleSelected(true);
      setViewRoleDepartments(user.departments?.map((d) => d.id) || []);
      
      // Tìm role "view con" của user này
      const viewSubRoleName = `view_${user.username}`;
      const viewSubRole = user.roles?.find((r) => r.name === viewSubRoleName);
      if (viewSubRole) {
        // Lấy permissions của role "view con" từ rolePermissions prop
        const viewRolePermissions = rolePermissions
          .filter((rp) => rp.isActive && rp.roleId === viewSubRole.id)
          .map((rp) => rp.permissionId) || [];
        setViewRolePermissions(viewRolePermissions);
      } else {
        // Nếu chưa có role "view con", mặc định chọn tất cả permissions read & export
        const defaultViewPermissions = permissions
          .filter(p => p.action === 'read' || p.action === 'export')
          .map(p => p.id);
        setViewRolePermissions(defaultViewPermissions);
      }
    } else {
      setIsViewRoleSelected(false);
      setViewRoleDepartments([]);
      setViewRolePermissions([]);
    }
  }, [user.id, rolesGrouped.main, rolesGrouped.sub, rolePermissions]);

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

  // Helper: nhóm permissions theo chức năng cho role "view" (chỉ read và export)
  const viewRolePermissionGroups = useMemo(() => {
    const isReadOrExport = (p: Permission) => p.action === 'read' || p.action === 'export';
    const dedupByNameAction = (list: Permission[]) => {
      const m = new Map<string, Permission>();
      list.forEach(p => {
        const key = `${p.name}:${p.action}`;
        if (!m.has(key)) m.set(key, p);
      });
      return Array.from(m.values());
    };
    const groups = {
      'thong-ke': {
        name: '📊 THỐNG KÊ',
        permissions: dedupByNameAction(
          permissions.filter(p => p.name.startsWith('thong-ke') && isReadOrExport(p))
        )
      },
      'giao-dich': {
        name: '💰 GIAO DỊCH',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('don-hang') || p.name.includes('blacklist')) && isReadOrExport(p))
        )
      },
      'cong-no': {
        name: '💳 CÔNG NỢ',
    // Loại bỏ các quyền thống kê công nợ (thong-ke-cong-no) để tránh trùng với nhóm THỐNG KÊ
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('cong-no') || p.name.includes('nhac-no')) && !p.name.startsWith('thong-ke') && isReadOrExport(p))
        )
      },
      'chien-dich': {
        name: '📢 CHIẾN DỊCH',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('chien-dich') || p.name.includes('gui-tin-nhan')) && isReadOrExport(p))
        )
      },
      'product-manager': {
        name: '👨‍💼 PRODUCT MANAGER',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('giao-dich-pm') || p.name.includes('san-pham')) && isReadOrExport(p))
        )
      },
      'tai-khoan': {
        name: '👤 TÀI KHOẢN',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('tai-khoan') || p.name.includes('bo-phan') || p.name.includes('zalo') || p.name.includes('phan-quyen')) && isReadOrExport(p))
        )
      },
      'thong-tin': {
        name: 'ℹ️ THÔNG TIN',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('lien-ket') || p.name.includes('zalo-nkc')) && isReadOrExport(p))
        )
      },
      'cai-dat': {
        name: '⚙️ CÀI ĐẶT',
        permissions: dedupByNameAction(
          permissions.filter(p => (p.name.includes('cau-hinh') || p.name.includes('chat-gpt')) && isReadOrExport(p))
        )
      }
    };
    return groups;
  }, [permissions]);

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
    const viewRole = rolesGrouped.main.find((r) => r.name === "view");
    
    // Xử lý role "view"
    if (viewRole && vals.includes(viewRole.id)) {
      // Khi chọn role "view", xóa tất cả role khác (realtime trong modal)
      setIsViewRoleSelected(true);
      setSelectedMainRoles([viewRole.id]);
      setSelectedSubRoles([]);
      setSelectedDepartments([]);
      
      // Mặc định chọn tất cả phòng ban
      setViewRoleDepartments(departments.map(d => d.id));
      
      // Mặc định chọn tất cả permissions cho role "view" (chỉ read và export)
      const viewPermissions = permissions.filter(p => 
        p.action === 'read' || p.action === 'export'
      ).map(p => p.id);
      setViewRolePermissions(viewPermissions);
      
      return;
    } else if (viewRole && !vals.includes(viewRole.id)) {
      // Khi bỏ chọn role "view", khôi phục logic cũ
      setIsViewRoleSelected(false);
      setViewRoleDepartments([]);
      setViewRolePermissions([]);
    }
    
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
    
    if (isViewRoleSelected) {
      // Logic lưu cho role "view"
      const viewRole = rolesGrouped.main.find((r) => r.name === "view");
      if (!viewRole) {
        console.error("Không tìm thấy role 'view'");
        setSaving(false);
        return;
      }
      
      // Tạo hoặc tìm role "view con" dựa trên username
      const viewSubRoleName = `view_${user.username}`;
      
      // Tìm role "view con" trong sub roles
      let viewSubRole = rolesGrouped.sub.find((r) => r.name === viewSubRoleName);
      
      // Nếu chưa có role "view con", sẽ tạo mới (backend sẽ xử lý)
      const viewSubRoleId = viewSubRole?.id || 0;
      
      console.log('🔍 Debug role "view con":', {
        username: user.username,
        viewSubRoleName,
        viewSubRole,
        viewSubRoleId,
        viewRolePermissions: viewRolePermissions.length,
        viewRoleDepartments: viewRoleDepartments.length
      });
      
      // Tạo rolePermissions cho role "view con"
      const viewRolePermissionsData = viewRolePermissions.map(permissionId => ({
        roleId: viewSubRoleId,
        permissionId,
        isActive: true
      }));
      
      const saveData = {
        departmentIds: viewRoleDepartments,
        roleIds: [viewRole.id, viewSubRoleId], // Thêm cả role "view con"
        permissionIds: viewRolePermissions,
        rolePermissions: viewRolePermissionsData,
        viewSubRoleName: viewSubRoleName, // Thêm thông tin để backend tạo role "view con"
      };
      
      console.log('📤 Gửi dữ liệu lên backend:', saveData);
      
      await onSave(saveData);
    } else {
      // Logic lưu cho các role khác (giữ nguyên như cũ)
      const subRoleIds = user.roles.filter(r => rolesGrouped.sub.some(s => s.id === r.id)).map(r => r.id);
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
    }
    
    setSaving(false);
    setShowConfirm(false);
    
    // Thông báo cho parent component refresh dữ liệu
    if (onSaveSuccess) {
      onSaveSuccess();
    }
    
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
          ) : isViewRoleSelected ? (
            // Giao diện cho role "view"
            <>
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
              </div>
              
              <div className="mb-4">
                <GradientTitle className="text-lg mb-2 block">
                  📁 PHÒNG BAN CÓ THỂ XEM
                </GradientTitle>
                <div className="mb-2">
                  <label className="flex items-center gap-2">
                    <Checkbox
                      checked={viewRoleDepartments.length === departments.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setViewRoleDepartments(departments.map(d => d.id));
                        } else {
                          setViewRoleDepartments([]);
                        }
                      }}
                    />
                    <span className="font-semibold">Tất cả phòng ban</span>
                  </label>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                  {departments.map((dep) => (
                    <label key={dep.id} className="flex items-center gap-2">
                      <Checkbox
                        checked={viewRoleDepartments.includes(dep.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setViewRoleDepartments(prev => [...prev, dep.id]);
                          } else {
                            setViewRoleDepartments(prev => prev.filter(id => id !== dep.id));
                          }
                        }}
                      />
                      {dep.name}
                    </label>
                  ))}
                </div>
              </div>

              <div className="mb-4">
                <GradientTitle className="text-lg mb-2 block">
                  🔧 CHỨC NĂNG CÓ THỂ XEM
                </GradientTitle>
                                  <div className="mb-2">
                    <label className="flex items-center gap-2">
                      <Checkbox
                        checked={viewRolePermissions.length === permissions.filter(p => p.action === 'read' || p.action === 'export').length}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setViewRolePermissions(permissions.filter(p => p.action === 'read' || p.action === 'export').map(p => p.id));
                          } else {
                            setViewRolePermissions([]);
                          }
                        }}
                      />
                      <span className="font-semibold">Tất cả chức năng (read & export)</span>
                    </label>
                  </div>
                
                {Object.entries(viewRolePermissionGroups).map(([key, group]) => (
                  <div key={key} className="mb-4">
                    <div className="font-semibold text-base mb-2">{group.name}</div>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2">
                      {group.permissions.map((permission) => (
                        <label key={permission.id} className="flex items-center gap-2">
                          <Checkbox
                            checked={viewRolePermissions.includes(permission.id)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setViewRolePermissions(prev => [...prev, permission.id]);
                              } else {
                                setViewRolePermissions(prev => prev.filter(id => id !== permission.id));
                              }
                            }}
                          />
                          {permission.name} ({permission.action})
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
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
          ) : (
            // Giao diện cho các role khác (giữ nguyên như cũ)
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