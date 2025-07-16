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
import { toast, Toaster } from "sonner";
import type { User } from "@/types";
import { LoginSocket } from "@/components/auth/LoginSocket";
import { CurrentUserContext } from "@/contexts/CurrentUserContext";
import ZaloLinkStatusChecker from "@/components/common/ZaloLinkStatusChecker";
import NotificationBell from "@/components/common/NotificationBell";
import { ProfileModal } from "@/components/dashboard/ProfileModal";


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

  // Modal đổi mật khẩu nếu đăng nhập bằng mật khẩu mặc định
  const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("requireChangePassword") === "true") {
      setShowChangePasswordModal(true);
    }
  }, []);

  const handleCloseChangePasswordModal = () => {
    setShowChangePasswordModal(false);
    localStorage.removeItem("requireChangePassword");
  };

  // Khi bấm "Đổi mật khẩu ngay" thì hiện modal đổi mật khẩu
  const handleShowPasswordModal = () => {
    setShowChangePasswordModal(false);
    localStorage.removeItem("requireChangePassword");
    // Đợi modal cảnh báo đóng xong mới mở modal đổi mật khẩu để tránh double overlay
    setTimeout(() => {
      setShowPasswordModal(true);
    }, 100);
  };

  return (
    <SidebarProvider>
      <CurrentUserContext.Provider value={{ currentUser, setCurrentUser }}>
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
        <AppSidebar activeUrl={activeUrl} setActiveUrl={setActiveUrl} currentUser={currentUser}/>
        <SidebarInset className="overflow-hidden">
          <div className="flex flex-col bg-background text-foreground transition-colors overflow-hidden">
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
              {/* Notification component nằm bên trái NavUserInline */}
              <div className="flex items-center gap-5">
                <NotificationBell />
                <NavUserInline user={userInfo} />
              </div>
            </header>
            <div className="flex-1 overflow-hidden">
              {children}
            </div>
            {/* Modal cảnh báo đổi mật khẩu mặc định */}
            {showChangePasswordModal && (
              <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/40">
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-lg p-6 w-full max-w-sm">
                  <h2 className="text-lg font-bold mb-2 text-center">Bạn đang sử dụng mật khẩu mặc định</h2>
                  <p className="mb-4 text-center text-sm text-gray-600 dark:text-gray-300">Vui lòng đổi mật khẩu để bảo vệ tài khoản của bạn.</p>
                  <button
                    className="w-full py-2 px-4 bg-gradient-to-r from-pink-500 to-indigo-500 text-white rounded-lg font-semibold hover:scale-[1.03] transition-all mb-2"
                    onClick={handleShowPasswordModal}
                  >Đổi mật khẩu ngay</button>
                  <button
                    className="w-full py-2 px-4 bg-gray-200 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-lg font-semibold hover:scale-[1.03] transition-all"
                    onClick={handleCloseChangePasswordModal}
                  >Để sau</button>
                </div>
              </div>
            )}

            {/* Modal đổi mật khẩu thực tế */}
            {showPasswordModal && currentUser && (
              <div className="fixed inset-0 z-[10000] flex items-center justify-center">
                <div className="w-full max-w-2xl">
                  {/* ProfileModal chỉ hiện tab đổi mật khẩu */}
                  <ProfileModal
                    open={showPasswordModal}
                    onOpenChange={setShowPasswordModal}
                    userData={currentUser}
                    onUserUpdate={(user) => setCurrentUser(user)}
                    initialTab="password"
                  />
                </div>
              </div>
            )}
          </div>
        </SidebarInset>
        <ZaloLinkStatusChecker />
      </CurrentUserContext.Provider>
    </SidebarProvider>
  );
}