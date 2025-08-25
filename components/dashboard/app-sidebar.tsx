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
  const isPMRole = currentUser?.roles?.some(r => (r.name || '').toLowerCase().includes('pm'));

  const effectiveNavItems = navItems.filter(group => {
    if (group.title === 'Product Manager' && !isAdmin && !isPMRole) return false;
    return true;
  });

  const filteredNavItems = effectiveNavItems
    .map(item => ({
      ...item,
      items: item.items.filter(subItem => !subItem.roles || hasRole(currentUser, subItem.roles)),
    }))
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
