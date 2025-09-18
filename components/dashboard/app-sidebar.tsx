"use client";

import * as React from "react";
import {
  FileBarChart2,
  ListOrdered,
  Briefcase,
  MessageCircle,
  Terminal,
  UserCog,
  UserCircle,
  Wrench,
  GalleryVerticalEnd,
} from "lucide-react";

import { NavMain } from "@/components/dashboard/nav-main";
import { TeamSwitcher } from "@/components/dashboard/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { hasRole } from "@/lib/role";
import type { User } from "@/types";
import { navItems as navItemsRaw } from "@/lib/nav-items";
import { usePermission } from "@/hooks/usePermission";
import { canAccessUrl } from "@/lib/url-permission-mapping";

const iconMap = {
  FileBarChart2,
  ListOrdered,
  Briefcase,
  MessageCircle,
  Terminal,
  UserCog,
  UserCircle,
  Wrench,
  GalleryVerticalEnd,
};

const navItems = navItemsRaw.map(item => ({
  ...item,
  icon: item.icon ? iconMap[item.icon as keyof typeof iconMap] : undefined,
}));

export function AppSidebar({
  activeUrl,
  setActiveUrl,
  currentUser, // thêm prop này
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeUrl: string;
  setActiveUrl: (url: string) => void;
  currentUser: User | null;
}) {
  const { getAllUserPermissions } = usePermission();
  
  const teams = [
    {
      name: "SaleTracker",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ];

  // Lọc navItems và từng item con theo role
  // Nếu user không phải admin và không có role PM thì ẩn hẳn nhóm 'Product Manager'
  const isAdmin = hasRole(currentUser, 'admin');
  const isPMRole = currentUser?.roles?.some((r: any) => {
    const n = (r.name || '').toLowerCase();
    return n === 'pm' || n.startsWith('pm-');
  });
  const isViewRole = currentUser?.roles?.some((r: any) => r.name === 'view');

  const effectiveNavItems = navItems.filter(group => {
  // Show Product Manager group to admin, PM role, or view role
  if (group.title === 'Product Manager' && !isAdmin && !isPMRole && !isViewRole) return false;
  // Không ẩn nhóm 'Giao dịch' cho PM users nữa - để họ có thể thấy "Quản lý đơn hàng"
  return true;
  });

  const filteredNavItems = effectiveNavItems
    .map(item => {
      // First filter by roles defined on sub-items
      let itemsFiltered = item.items.filter(subItem => {
        // Nếu user có role "view", kiểm tra permissions từ database
        if (isViewRole) {
          const userPermissions = getAllUserPermissions();
          return canAccessUrl(subItem.url, userPermissions);
        }
        
        // Logic cũ cho các role khác
        return !subItem.roles || hasRole(currentUser, subItem.roles);
      });
      
      // If user is PM (and not admin), hide the debt-statistics sub-item
      if (!isAdmin && isPMRole && item.title === 'Thống kê') {
        itemsFiltered = itemsFiltered.filter(si => si.title !== 'Thống kê công nợ');
      }
      return {
        ...item,
        items: itemsFiltered,
      };
    })
    .filter(item => item.items.length > 0);

  return (
    <Sidebar className="bg-white text-black border-r border-border" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={filteredNavItems}
          activeUrl={activeUrl}
          setActiveUrl={setActiveUrl}
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
