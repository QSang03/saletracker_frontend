import type { User } from "@/types";

export function hasRole(user: User | null, roles: string | string[]): boolean {
  if (!user || !user.roles) return false;
  const roleNames = user.roles.map(r => r.name);
  if (Array.isArray(roles)) {
    return roles.some(role => roleNames.includes(role));
  }
  return roleNames.includes(roles);
}
