import type { User } from "@/types";

export function hasRole(user: User | null, roles: string | string[]): boolean {
  if (!user || !user.roles) return false;
  const roleNames = user.roles.map(r => r.name);
  if (Array.isArray(roles)) {
    return roles.some(role => roleNames.includes(role));
  }
  return roleNames.includes(roles);
}

// Helper function để kiểm tra role "view"
export function isViewRole(user: User | null): boolean {
  return hasRole(user, "view");
}

// Helper function để kiểm tra user chỉ có quyền xem
export function isViewOnlyUser(user: User | null): boolean {
  if (!user || !user.roles) return false;
  const roleNames = user.roles.map(r => r.name);
  return roleNames.includes("view") && roleNames.length === 1;
}
