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

export function AppSidebar({
  activeUrl,
  setActiveUrl,
  ...props
}: React.ComponentProps<typeof Sidebar> & {
  activeUrl: string;
  setActiveUrl: (url: string) => void;
}) {
  const navItems = [
    {
      title: "Thống kê",
      icon: FileBarChart2,
      items: [
        { title: "Thống kê giao dịch", url: "/dashboard/transactions" },
        { title: "Thống kê công nợ", url: "/dashboard/debts" },
      ],
    },
    {
      title: "Giao dịch",
      icon: ListOrdered,
      items: [
        { title: "Quản lý giao dịch", url: "/transactions/manage" },
        { title: "Giao dịch đã xóa", url: "/transactions/trashed" },
      ],
    },
    {
      title: "Công nợ",
      icon: Briefcase,
      items: [
        { title: "Quản lý công nợ", url: "/debt/manage" },
        { title: "Công nợ đã xóa", url: "/debt/trashed" },
        { title: "Cấu hình công nợ", url: "/debt/settings" },
      ],
    },
    {
      title: "Kinh doanh",
      icon: MessageCircle,
      items: [
        { title: "Cấu hình gửi tin nhắn", url: "/business/message-config" },
      ],
    },
    {
      title: "Product Manager",
      icon: Terminal,
      items: [
        { title: "Quản lý giao dịch cho PM", url: "/pm/transactions" },
      ],
    },
    {
      title: "Tài khoản",
      icon: UserCog,
      items: [
        { title: "Quản lý tài khoản", url: "/dashboard/manage" },
        { title: "Quản lý bộ phận", url: "/dashboard/department" },
        { title: "Quản lý zalo", url: "/dashboard/zalo" },
        { title: "Phân quyền", url: "/dashboard/roles" },
      ],
    },
    {
      title: "Thông tin",
      icon: UserCircle,
      items: [
        { title: "Liên kết tài khoản", url: "/profile/link-account" },
        { title: "Zalo NKC", url: "/profile/zalo-nkc" },
      ],
    },
    {
      title: "Cài đặt",
      icon: Wrench,
      items: [
        { title: "Cấu hình hệ thống", url: "/dashboard/config-system" },
        { title: "Cấu hình lịch nghỉ", url: "/dashboard/holiday" },
      ],
    },
  ];

  const teams = [
    {
      name: "SaleTracker",
      logo: GalleryVerticalEnd,
      plan: "Enterprise",
    },
  ];

  return (
    <Sidebar className="bg-white text-black border-r border-border" {...props}>
      <SidebarHeader>
        <TeamSwitcher teams={teams} />
      </SidebarHeader>
      <SidebarContent>
        <NavMain
          items={navItems}
          activeUrl={activeUrl}
          setActiveUrl={setActiveUrl}
        />
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
