import { hasRole } from "@/lib/role";
import type { User } from "@/types";

export function getFirstAccessibleUrl(user: User | null, navItems: any[]): string | null {
  for (const group of navItems) {
    for (const item of group.items) {
      if (!item.roles || hasRole(user, item.roles)) {
        return item.url;
      }
    }
  }
  return null;
}
