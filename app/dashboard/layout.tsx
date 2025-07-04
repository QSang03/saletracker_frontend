"use client";

import React, { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { NavUserInline } from "@/components/dashboard/nav-user-inline";
import { getAccessToken, clearAccessToken } from "@/lib/auth";
import { toast } from "sonner";
import type { User } from "@/types";
import { LoginSocket } from "@/components/auth/LoginSocket";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [activeUrl, setActiveUrl] = useState(pathname);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setActiveUrl(pathname);
  }, [pathname]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      try {
        const token = getAccessToken();
        if (!token) throw new Error("No access token found");
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const userData: User = await response.json();
        setCurrentUser(userData);
      } catch (error) {
        console.error("Failed to fetch user data", error);
        toast.error("Lỗi tải thông tin người dùng");
      } finally {
        setLoading(false);
      }
    };
    fetchCurrentUser();
  }, []);

  const userInfo = currentUser
    ? {
        name: currentUser.fullName || currentUser.username,
        email: currentUser.email || "Chưa có email",
      }
    : {
        name: loading ? "Đang tải..." : "Không xác định",
        email: loading ? "Đang tải..." : "Không xác định",
      };

  return (
    <SidebarProvider>
      {currentUser && (
        <LoginSocket
          userId={currentUser.id}
          onBlocked={() => {
            clearAccessToken();
            toast.error("Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!");
            router.push("/login");
          }}
        />
      )}
      <AppSidebar activeUrl={activeUrl} setActiveUrl={setActiveUrl} />
      <SidebarInset>
        <div className="flex flex-col bg-background text-foreground transition-colors">
          <header className="flex h-16 shrink-0 items-center justify-between px-4 gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="-ml-1" />
              <Separator
                orientation="vertical"
                className="mr-2 data-[orientation=vertical]:h-4"
              />
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem className="hidden md:block">
                    <BreadcrumbLink href="#">Trang chính</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator className="hidden md:block" />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{activeUrl}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
            <NavUserInline user={userInfo} />
          </header>
          {React.isValidElement(children) && typeof children.type !== "string"
            ? React.cloneElement(children as React.ReactElement<any>, {
                activeUrl,
                setActiveUrl,
              })
            : children}
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}