import type { User } from "@/types";

export function hasRole(user: User | null, roles: string | string[]): boolean {
  if (!user || !user.roles) return false;
  const roleNames = user.roles.map(r => (r.name || "").toLowerCase());

  const satisfies = (required: string): boolean => {
    const req = (required || "").toLowerCase();
    // Treat any pm-* role as satisfying generic "PM"
    if (req === "pm") {
      return roleNames.some(r => r === "pm" || r.startsWith("pm-"));
    }
    return roleNames.includes(req);
  };

  if (Array.isArray(roles)) {
    return roles.some(satisfies);
  }
  return satisfies(roles);
}

// Helper function để kiểm tra role "view"
export function isViewRole(user: User | null): boolean {
  return hasRole(user, "view");
}

// Helper function để kiểm tra user chỉ có quyền xem
export function isViewOnlyUser(user: User | null): boolean {
  if (!user || !user.roles) return false;
  const roleNames = user.roles.map(r => (r.name || "").toLowerCase());
  return roleNames.includes("view") && roleNames.length === 1;
}
