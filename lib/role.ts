import type { User } from "@/types";

export function hasRole(user: User | null, roles: string | string[]): boolean {
  if (!user || !user.roles) return false;
  // Normalize to lowercase for case-insensitive comparison
  const roleNames = user.roles.map(r => (r.name || '').toString().toLowerCase());
  if (Array.isArray(roles)) {
    return roles.some(role => roleNames.includes((role || '').toString().toLowerCase()));
  }
  return roleNames.includes((roles || '').toString().toLowerCase());
}
