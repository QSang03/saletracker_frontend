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
  pmPrivateRoleName?: string; // Thêm thông tin để backend tạo role pm riêng
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
  const [selectedSubRoles, setSelectedSubRoles] = useState<number[]>(
    user.roles
      ?.filter((r) => rolesGrouped.sub.some((s) => s.id === r.id))
      .map((r) => r.id) || []
  );
  // Track pm-<dep> sub roles that user explicitly removed so auto-add logic won't force them back
  const [removedPmSubRoleIds, setRemovedPmSubRoleIds] = useState<Set<number>>(new Set());
  // Only show sub-role options that correspond to the selected main roles.
  // Enhancement: Always include currently selected sub roles even if their main prefix no longer selected so they can be removed.
  const subRoleOptions: Option[] = useMemo(() => {
    const mainPrefixes = rolesGrouped.main
      .filter((r) => selectedMainRoles.includes(r.id))
      .map((r) => (r.name || '').toLowerCase());
    const selectedSubRoleIds = new Set(selectedSubRoles);
    return allSubRoles
      .filter((r) => {
        const prefix = (r.name || '').split(/[-_]/)[0];
        if (mainPrefixes.length === 0) {
          return selectedSubRoleIds.has(r.id);
        }
        return mainPrefixes.includes(prefix) || selectedSubRoleIds.has(r.id);
      })
      .map((r) => ({
        label: r.depName ? `${r.display_name} (${r.depName})` : r.display_name,
        value: r.id,
      }));
  }, [allSubRoles, rolesGrouped.main, selectedMainRoles, selectedSubRoles]);
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
  // Search state for PM private permissions
  const [pmSearchQuery, setPmSearchQuery] = useState("");
  const pmPermissionRefs = useRef(new Map<number, HTMLLabelElement>());
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
  // PM-specific helpers
  const isPMSelected = useMemo(() => {
    // build a map id -> roleName for main+sub
    const idToName = new Map<number, string>();
    rolesGrouped.main.forEach((r) => idToName.set(r.id, (r.name || "").toLowerCase()));
    rolesGrouped.sub.forEach((r) => idToName.set(r.id, (r.name || "").toLowerCase()));
    const allSelected = [...selectedMainRoles, ...selectedSubRoles];
    return allSelected.some((id) => {
      const name = idToName.get(id) || "";
      // match pm, pm-*, pm_*, *-pm, *_pm, or roles containing pm segment
      return (
        name === "pm" ||
        name.startsWith("pm-") ||
        name.startsWith("pm_") ||
        name.endsWith("-pm") ||
        name.endsWith("_pm") ||
        name.split(/[-_]/).includes("pm")
      );
    });
  }, [rolesGrouped.main, rolesGrouped.sub, selectedMainRoles, selectedSubRoles]);

  // Kiểm tra có PM phụ (pm-phongban) nào được chọn không
  // pm department sub roles (pm-<dep> or pm_<dep>) – exclude personal pm_<username>
  const hasPMSubRoles = useMemo(() => {
    const idToName = new Map<number, string>();
    rolesGrouped.sub.forEach((r) => idToName.set(r.id, (r.name || "").toLowerCase()));
    return selectedSubRoles.some((id) => {
      const name = idToName.get(id) || "";
      if (name === `pm_${user.username.toLowerCase()}`) return false; // ignore private role
      return (name.startsWith("pm-") || name.startsWith("pm_")) && !name.startsWith(`pm_${user.username.toLowerCase()}`);
    });
  }, [rolesGrouped.sub, selectedSubRoles, user.username]);

  // Kiểm tra có phòng ban nào được chọn không
  const hasSelectedDepartments = useMemo(() => {
    return selectedDepartments.length > 0;
  }, [selectedDepartments]);

  const pmPermissions = useMemo(() => {
    // Chỉ lấy quyền bắt đầu bằng "pm_" (theo yêu cầu)
    return permissions.filter((p) => (p.name || "").toLowerCase().startsWith("pm_"));
  }, [permissions]);

  // Role pm_<username> (quyền riêng) nếu đã tồn tại
  const pmPrivateRole = useMemo(() => {
    return rolesGrouped.sub.find(r => (r.name || '').toLowerCase() === `pm_${user.username.toLowerCase()}`);
  }, [rolesGrouped.sub, user.username]);

  // KHÔNG fetch API nữa, chỉ dùng rolePermissions prop
  const [rolePermissionsState, setRolePermissionsState] = useState<{ roleId: number; permissionId: number; isActive: boolean }[]>(rolePermissions);

  // Kiểm tra có quyền PM nào đang được chọn không
  const activePrivatePermissionIds = useMemo(() => {
    // Nếu role pm_<username> chưa tồn tại, dùng các entry placeholder roleId=0
    const targetRoleId = pmPrivateRole?.id;
    return rolePermissionsState
      .filter(rp => {
        if (!rp.isActive) return false;
        if (targetRoleId) return rp.roleId === targetRoleId;
        // chưa có role => chấp nhận roleId=0 làm placeholder
        return rp.roleId === 0;
      })
      .filter(rp => pmPermissions.some(p => p.id === rp.permissionId))
      .map(rp => rp.permissionId);
  }, [rolePermissionsState, pmPrivateRole, pmPermissions]);

  const hasSelectedPMPermissions = useMemo(() => {
    if (activePrivatePermissionIds.length > 0) return true;
    const pmRole = rolesGrouped.main.find(r => r.name === 'pm');
    if (!pmRole) return false;
    return rolePermissionsState.some(rp => rp.roleId === pmRole.id && rp.isActive && pmPermissions.some(p => p.id === rp.permissionId));
  }, [activePrivatePermissionIds, rolePermissionsState, rolesGrouped.main, pmPermissions]);

  // Trạng thái đang dùng quyền riêng PM (đã bật ít nhất 1 quyền, có pm main và chưa có pm-sub)
  const pmPrivateActive = useMemo(() => {
    return isPMSelected && !hasPMSubRoles && (activePrivatePermissionIds.length > 0 || hasSelectedPMPermissions);
  }, [isPMSelected, hasPMSubRoles, activePrivatePermissionIds, hasSelectedPMPermissions]);

  // Tập id các pm-sub roles để tiện lọc
  const pmSubRoleIdSet = useMemo(() => {
    const privateName = `pm_${user.username.toLowerCase()}`;
    return new Set(
      rolesGrouped.sub
        .filter((r) => {
          const name = (r.name || "").toLowerCase();
          // include dept pm- / pm_ but exclude personal private pm_<username>
          if (name === privateName) return false;
          return name.startsWith("pm-") || name.startsWith("pm_");
        })
        .map((r) => r.id)
    );
  }, [rolesGrouped.sub, user.username]);

  // Danh sách sub role hiển thị: nếu đang active quyền riêng PM thì loại bỏ pm-phongban khỏi options
  const displayedSubRoleOptions = useMemo(() => {
    // Always hide personal pm_<username> from selector
    const personal = `pm_${user.username.toLowerCase()}`;
    const filtered = subRoleOptions.filter(opt => {
      const role = rolesGrouped.sub.find(r => r.id === Number(opt.value));
      const name = (role?.name || '').toLowerCase();
      if (name === personal) return false;
      return true;
    });
    if (!pmPrivateActive) return filtered;
    // when private mode active, also hide department pm-* roles
    return filtered.filter(opt => !pmSubRoleIdSet.has(Number(opt.value)));
  }, [pmPrivateActive, subRoleOptions, pmSubRoleIdSet, rolesGrouped.sub, user.username]);

  // Hiển thị quyền riêng PM khi có role pm (main) và KHÔNG có pm-phongban được chọn
  // Hiển thị block quyền riêng PM khi có pm main và KHÔNG có pm-sub (kể cả khi chưa bật quyền nào để user chọn).
  const shouldShowPMPermissions = useMemo(() => {
    // Luôn hiển thị block PM riêng nếu có pm main và chưa chọn pm-sub (để người dùng bật/tắt quyền)
    return isPMSelected && !hasPMSubRoles;
  }, [isPMSelected, hasPMSubRoles]);

  // Departments luôn hiển thị (kể cả chế độ PM riêng) theo yêu cầu mới
  const shouldShowDepartments = useMemo(() => true, []);
  // Sub roles: ẩn khi đang active quyền PM riêng (có ít nhất 1 quyền) và chưa có pm-sub role
  const shouldShowSubRoles = useMemo(() => {
    if (hasPMSubRoles) return true; // đang dùng pm-sub
    if (shouldShowPMPermissions && hasSelectedPMPermissions) return false; // chế độ PM riêng active
    return true; // cho phép chuyển đổi
  }, [hasPMSubRoles, shouldShowPMPermissions, hasSelectedPMPermissions]);

  // Đồng bộ trạng thái khi chuyển qua lại giữa quyền riêng PM và pm-phongban
  useEffect(() => {
    const pmMain = rolesGrouped.main.find((r) => r.name === 'pm');
    // Khi bật ít nhất 1 quyền PM riêng: dọn sạch pm-sub & phòng ban
  if (shouldShowPMPermissions && hasSelectedPMPermissions) {
      if (selectedSubRoles.length > 0) {
        const filtered = selectedSubRoles.filter((id) => {
          const role = rolesGrouped.sub.find((r) => r.id === id);
          const name = (role?.name || '').toLowerCase();
          return !(name.startsWith('pm-') || name.startsWith('pm_'));
        });
        if (filtered.length !== selectedSubRoles.length) setSelectedSubRoles(filtered);
      }
    }
    // Khi chuyển sang pm-sub: tắt quyền PM riêng
    if (hasPMSubRoles && pmMain) {
      setRolePermissionsState((prev) => prev.map((rp) => {
        if (rp.roleId === pmMain.id) {
          const isPMPermission = pmPermissions.some((p) => p.id === rp.permissionId);
          if (isPMPermission && rp.isActive) return { ...rp, isActive: false };
        }
        return rp;
      }));
    }
  }, [shouldShowPMPermissions, hasSelectedPMPermissions, hasPMSubRoles, selectedSubRoles, selectedDepartments, pmPermissions, rolesGrouped.main, rolesGrouped.sub]);

  const selectedPMRoleIds = useMemo(() => {
    const idToName = new Map<number, string>();
    rolesGrouped.main.forEach((r) => idToName.set(r.id, (r.name || '').toLowerCase()));
    rolesGrouped.sub.forEach((r) => idToName.set(r.id, (r.name || '').toLowerCase()));
    const allSelected = [...selectedMainRoles, ...selectedSubRoles];
    return allSelected.filter((id) => {
      const name = idToName.get(id) || '';
      if (name === `pm_${user.username.toLowerCase()}`) return false; // private role not shown in list
      return name === 'pm' || name.startsWith('pm-') || name.startsWith('pm_');
    });
  }, [rolesGrouped.main, rolesGrouped.sub, selectedMainRoles, selectedSubRoles, user.username]);
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
          if (pmRole && !autoSubRoles.includes(pmRole.id) && !removedPmSubRoleIds.has(pmRole.id) && !hasSelectedPMPermissions) {
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
    Array.from(removedPmSubRoleIds).join(","),
    hasSelectedPMPermissions,
  ]);
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

  // Theo dõi thay đổi quyền PM để tự động hiện/ẩn phần chọn phòng ban
  useEffect(() => {
    // Logic tự động hiện/ẩn dựa trên hasSelectedPMPermissions
    // Khi có quyền PM được chọn: ẩn phần chọn phòng ban
    // Khi không có quyền PM nào: hiện phần chọn phòng ban
  }, [hasSelectedPMPermissions]);

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
    
    // Nếu chọn phòng ban và có PM được chọn, xóa bỏ quyền PM riêng
    if (vals.length > 0 && isPMSelected) {
      setRolePermissionsState((prev) => {
        return prev.map((rp) => {
          // Tìm roleId PM gốc
          const pmRole = rolesGrouped.main.find((r) => r.name === "pm");
          if (pmRole && rp.roleId === pmRole.id) {
            // Kiểm tra xem permission này có phải là PM permission không
            const isPMPermission = pmPermissions.some((p) => p.id === rp.permissionId);
            if (isPMPermission) {
              return { ...rp, isActive: false };
            }
          }
          return rp;
        });
      });
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
    const pmRole = rolesGrouped.main.find((r) => r.name === "pm");
    
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
    
    // PM: không còn xóa phòng ban đã chọn; chỉ bỏ sub roles nếu không có phòng ban & không có pm-sub để hiển thị quyền riêng gọn gàng
    if (pmRole && vals.includes(pmRole.id)) {
      const hasPMSubRoles = selectedSubRoles.some((id) => {
        const role = rolesGrouped.sub.find((r) => r.id === id);
        const name = (role?.name || "").toLowerCase();
        return name.startsWith("pm-") || name.startsWith("pm_");
      });
      if (!hasPMSubRoles) {
        // giữ nguyên phòng ban; chỉ đảm bảo không còn pm-sub roles dư
        const filtered = selectedSubRoles.filter((id) => {
          const role = rolesGrouped.sub.find((r) => r.id === id);
          const name = (role?.name || "").toLowerCase();
          return !(name.startsWith("pm-") || name.startsWith("pm_"));
        });
        if (filtered.length !== selectedSubRoles.length) setSelectedSubRoles(filtered);
      }
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
    const newIds = vals.map(Number);
    // Detect removed/added pm- sub roles for manual override tracking
    const prevPmIds = selectedSubRoles.filter((id) => {
      const role = rolesGrouped.sub.find((r) => r.id === id);
      const name = (role?.name || "").toLowerCase();
      return name.startsWith("pm-") || name.startsWith("pm_");
    });
    const newPmIds = newIds.filter((id) => {
      const role = rolesGrouped.sub.find((r) => r.id === id);
      const name = (role?.name || "").toLowerCase();
      return name.startsWith("pm-") || name.startsWith("pm_");
    });
    const newPmSet = new Set(newPmIds);
    const removed = prevPmIds.filter((id) => !newPmSet.has(id));
    if (removed.length > 0) {
      setRemovedPmSubRoleIds((prev) => new Set([...Array.from(prev), ...removed]));
    }
    // If user manually re-adds a previously removed pm sub role, drop it from removed tracking
    if (newPmIds.length > 0) {
      setRemovedPmSubRoleIds((prev) => {
        const updated = new Set(prev);
        newPmIds.forEach((id) => {
          if (updated.has(id)) updated.delete(id);
        });
        return updated;
      });
    }
    setSelectedSubRoles(newIds);
    
    // Nếu chọn PM phụ (pm-phongban) và có PM được chọn, xóa bỏ quyền PM riêng
    const hasNewPMSubRoles = vals.some((id) => {
      const role = rolesGrouped.sub.find((r) => r.id === id);
      const name = (role?.name || "").toLowerCase();
      return name.startsWith("pm-") || name.startsWith("pm_");
    });
    
    if (hasNewPMSubRoles && isPMSelected) {
      setRolePermissionsState((prev) => {
        return prev.map((rp) => {
          // Tìm roleId PM gốc
          const pmRole = rolesGrouped.main.find((r) => r.name === "pm");
          if (pmRole && rp.roleId === pmRole.id) {
            // Kiểm tra xem permission này có phải là PM permission không
            const isPMPermission = pmPermissions.some((p) => p.id === rp.permissionId);
            if (isPMPermission) {
              return { ...rp, isActive: false };
            }
          }
          return rp;
        });
      });
    }
  };
  // Reset manual removal tracking if PM main role deselected
  useEffect(() => {
    if (!selectedMainRoleNames.includes("pm")) {
      setRemovedPmSubRoleIds(new Set());
    }
  }, [selectedMainRoleNames.join(",")]);
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
      // Logic lưu cho các role khác (bao gồm quyền riêng PM)
      const pmPrivateRoleName = `pm_${user.username}`;
      const pmPrivateRole = rolesGrouped.sub.find(r => r.name === pmPrivateRoleName);
      const pmMain = rolesGrouped.main.find(r => r.name === 'pm');

      // Build rolePermissions gửi lên: tất cả role permissions hiện có (roleId>0) giữ lại
      const keep = rolePermissionsState.filter(rp => rp.roleId > 0);

      // Thêm placeholder 0 cho quyền riêng nếu chưa có role pm_<username>
      const privateSelections = rolePermissionsState.filter(rp => rp.roleId === (pmPrivateRole?.id ?? 0) || (rp.roleId === 0));
      const activePrivate = privateSelections.filter(rp => rp.isActive);
      const privatePermissionIds = Array.from(new Set(activePrivate.map(rp => rp.permissionId)));
      if (!pmPrivateRole && privatePermissionIds.length > 0) {
        // dùng roleId=0 giữ chỗ
        privatePermissionIds.forEach(pid => {
          if (!keep.some(k => k.roleId === 0 && k.permissionId === pid)) {
            keep.push({ roleId: 0, permissionId: pid, isActive: true });
          }
        });
      } else if (pmPrivateRole) {
        // đảm bảo entry roleId đúng id role private
        privatePermissionIds.forEach(pid => {
          if (!keep.some(k => k.roleId === pmPrivateRole.id && k.permissionId === pid)) {
            keep.push({ roleId: pmPrivateRole.id, permissionId: pid, isActive: true });
          }
        });
      }

      // roleIds gửi lên không bao gồm roleId=0
      const roleIds = Array.from(new Set([...selectedMainRoles, ...selectedSubRoles, pmPrivateRole?.id].filter(Boolean))) as number[];
      const permissionIds = Array.from(new Set(keep.filter(rp => rp.isActive && rp.roleId !== 0).map(rp => rp.permissionId).concat(privatePermissionIds)));
      const payload: any = {
        departmentIds: selectedDepartments,
        roleIds,
        permissionIds,
        rolePermissions: keep,
      };
      if (privatePermissionIds.length > 0) payload.pmPrivateRoleName = pmPrivateRoleName;
      await onSave(payload);
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

  // Auto-scroll to single search match and focus its checkbox
  useEffect(() => {
    const q = pmSearchQuery.trim().toLowerCase();
    if (q.length === 0) return;
    const matches: number[] = [];
    pmPermissions.forEach((p) => {
      if ((`${p.name} ${p.action}`).toLowerCase().includes(q)) matches.push(p.id);
    });
    if (matches.length === 1) {
      const id = matches[0];
      const el = pmPermissionRefs.current.get(id);
      if (el) {
        // Prefer an explicit dialog scroll container, fallback to scanning ancestors
        function findScrollableParent(node: HTMLElement | null): HTMLElement | null {
          if (!node) return document.scrollingElement as HTMLElement | null;
          const marked = node.closest('[data-dialog-scroll]') as HTMLElement | null;
          if (marked) return marked;
          let parent = node.parentElement || null;
          while (parent) {
            const style = getComputedStyle(parent);
            const overflowY = style.overflowY;
            if ((overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay') && parent.scrollHeight > parent.clientHeight) {
              return parent;
            }
            parent = parent.parentElement;
          }
          return document.scrollingElement as HTMLElement | null;
        }

        const container = findScrollableParent(el) || document.scrollingElement;
        if (container) {
          // compute element position relative to container and center it
          const containerRect = container.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const offset = elRect.top - containerRect.top + container.scrollTop - container.clientHeight / 2 + el.clientHeight / 2;
          container.scrollTo({ top: offset, behavior: 'smooth' });
          // also fallback to element.scrollIntoView in case layout/portal timing prevents container scroll
          try {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } catch (e) {}
          // delayed fallback in case first attempt happens before modal layout
          setTimeout(() => {
            try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch (e) {}
          }, 220);
        } else {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

        // temporary outline to make it obvious, then focus the checkbox inside the label
        try {
          el.style.outline = '3px solid rgba(250, 204, 21, 0.6)';
          setTimeout(() => { el.style.outline = ''; }, 1400);
        } catch (e) {}
        const input = el.querySelector('input') as HTMLInputElement | null;
        if (input) input.focus();
      }
    }
  }, [pmSearchQuery, pmPermissions]);
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
          data-dialog-scroll
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
              {/* Chỉ hiển thị phần chọn phòng ban khi không phải quyền riêng PM */}
              {shouldShowDepartments && (
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
              )}
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
                {/* Chỉ hiển thị vai trò phụ khi không phải quyền riêng PM */}
                <>
                  <GradientTitle className="text-base mb-2 mt-4 block">
                    VAI TRÒ PHỤ
                  </GradientTitle>
                  <MultiSelectCombobox
                    options={displayedSubRoleOptions}
                    value={selectedSubRoles}
                    onChange={handleSubRoleChange}
                    placeholder={pmPrivateActive ? "Đang dùng quyền riêng PM (ẩn pm-phòngban)" : "Chọn vai trò phụ..."}
                  />
                </>
              </div>
              <div className="mb-4">
                <GradientTitle className="text-lg mb-2 block">
                  QUYỀN HẠN
                </GradientTitle>
                <div>
                  {shouldShowPMPermissions && pmPermissions.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-lg">PM - Quyền riêng</div>
                        <label className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={pmPermissions.every(p => activePrivatePermissionIds.includes(p.id)) && pmPermissions.length>0}
                            onCheckedChange={(checked) => {
                              const targetRoleId = pmPrivateRole?.id ?? 0; // 0 => backend map sau khi tạo
                              setRolePermissionsState(prev => {
                                const updated = prev.filter(rp => !(rp.roleId === targetRoleId && pmPermissions.some(p => p.id === rp.permissionId)));
                                pmPermissions.forEach(p => {
                                  updated.push({ roleId: targetRoleId, permissionId: p.id, isActive: !!checked });
                                });
                                return updated;
                              });
                            }}
                          />
                          Chọn tất cả quyền PM
                        </label>
                      </div>
                        <div className="mb-2">
                          <input
                            type="text"
                            value={pmSearchQuery}
                            onChange={(e) => setPmSearchQuery(e.target.value)}
                            placeholder="Tìm quyền PM..."
                            className="w-full px-3 py-2 border rounded-md text-sm"
                          />
                        </div>
                        {
                          // Group PM permissions into categories / brands / others
                          (() => {
                            const q = pmSearchQuery.trim().toLowerCase();
                            const pmCat = pmPermissions.filter(p => (p.name || '').startsWith('pm_cat_'));
                            const pmBrand = pmPermissions.filter(p => (p.name || '').startsWith('pm_brand_'));
                            const pmOther = pmPermissions.filter(p => !(p.name || '').startsWith('pm_cat_') && !(p.name || '').startsWith('pm_brand_'));
                            const renderGrid = (list: typeof pmPermissions, keyPrefix: string) => (
                              <div className="mb-3" key={keyPrefix}>
                                <div className="font-semibold mb-2">{keyPrefix === 'cat' ? 'Danh mục' : keyPrefix === 'brand' ? 'Thương hiệu' : 'Khác'}</div>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-2">
                                  {list.map((permission) => {
                                    const targetRoleId = pmPrivateRole?.id ?? 0;
                                    const isActive = activePrivatePermissionIds.includes(permission.id);
                                    const matches = q.length > 0 && (`${permission.name} ${permission.action}`).toLowerCase().includes(q);
                                    return (
                                      <label
                                        key={permission.id}
                                        ref={(el) => {
                                          if (el) pmPermissionRefs.current.set(permission.id, el);
                                          else pmPermissionRefs.current.delete(permission.id);
                                        }}
                                        className={`flex items-center gap-2 ${matches ? 'bg-yellow-100 rounded px-2 py-1' : ''}`}
                                      >
                                        <Checkbox
                                          checked={isActive}
                                          onCheckedChange={(checked) => {
                                            setRolePermissionsState((prev) => {
                                              const updated = [...prev];
                                              const idx = updated.findIndex((rp) => rp.roleId === targetRoleId && rp.permissionId === permission.id);
                                              if (idx !== -1) {
                                                updated[idx] = { ...updated[idx], isActive: !!checked };
                                              } else {
                                                updated.push({ roleId: targetRoleId, permissionId: permission.id, isActive: !!checked });
                                              }
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

                            return (
                              <div>
                                {pmCat.length > 0 && renderGrid(pmCat, 'cat')}
                                {pmBrand.length > 0 && renderGrid(pmBrand, 'brand')}
                                {pmOther.length > 0 && renderGrid(pmOther, 'other')}
                              </div>
                            );
                          })()
                        }
                    </div>
                  )}
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