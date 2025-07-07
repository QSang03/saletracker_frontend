"use client";

import {
  ChevronsUpDown,
  LogOut,
  Sparkles,
  Bell,
  BadgeCheck,
  CreditCard,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { useState } from "react";
import { ProfileModal } from "@/components/dashboard/ProfileModal";
import type { User } from "@/types";

// Hàm lấy cookie từ client-side
function getCookie(name: string): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [cookieName, cookieValue] = cookie.trim().split('=');
    if (cookieName === name) {
      return decodeURIComponent(cookieValue);
    }
  }
  return null;
}

export function NavUserInline({
  user,
}: {
  user: {
    name: string;
    email: string;
  };
}) {
  const router = useRouter();
  const [showProfile, setShowProfile] = useState(false);
  const [profileUser, setProfileUser] = useState<User | null>(null);

  const handleLogout = async () => {
    try {
      const token = getCookie('access_token');
      
      if (token) {
        await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      document.cookie = "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
      router.push("/login");
    }
  };
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          animate={{
            backgroundPosition: ["0% center", "100% center"],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            repeatType: "reverse",
            ease: "easeInOut",
          }}
          className="flex items-center gap-2 rounded-xl px-3 py-1.5 text-white
            bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-500
            bg-[length:200%_auto] shadow-md hover:brightness-110
            focus:outline-none transition-all cursor-pointer" // Thêm cursor-pointer
          aria-label="User menu"
        >
          <Avatar className="h-8 w-8 border-2 border-white dark:border-gray-700 shadow cursor-pointer">
            <AvatarImage alt={user.name} />
            <AvatarFallback className="bg-white/20 dark:bg-black/30 text-white cursor-pointer">
              {user.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="hidden md:block text-left text-sm leading-tight cursor-pointer">
            <div className="font-semibold text-white">{user.name}</div>
            <div className="text-xs text-white/80">{user.email}</div>
          </div>
          <ChevronsUpDown className="ml-1 size-4 text-white/70 cursor-pointer" />
        </motion.button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        className="min-w-56 rounded-xl border-none bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-xl text-black dark:text-white"
        align="end"
        sideOffset={6}
      >
        <DropdownMenuLabel className="p-0 font-normal cursor-pointer" onClick={async () => {
          setShowProfile(true);
          // Lấy lại thông tin user chi tiết từ API để truyền vào modal
          try {
            const token = getCookie('access_token');
            if (token) {
              const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/profile`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.ok) {
                const data = await res.json();
                setProfileUser(data);
              }
            }
          } catch {}
        }}>
          <div className="flex items-center gap-2 px-3 py-3">
            <Avatar className="h-9 w-9 border border-white dark:border-gray-700 cursor-pointer">
              <AvatarImage alt={user.name} />
              <AvatarFallback className="cursor-pointer">
                {user.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="text-sm leading-tight cursor-pointer">
              <div className="font-medium truncate">{user.name}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user.email}
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <ProfileModal
          open={showProfile}
          onOpenChange={setShowProfile}
          userData={profileUser}
          onUserUpdate={(u) => {
            setProfileUser(u);
            // Nếu muốn cập nhật lại user info ở NavUserInline, cần truyền prop hoặc reload lại
          }}
        />

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 font-semibold text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all cursor-pointer">
            <Sparkles className="size-4 text-yellow-400 animate-pulse" />
            <motion.span
              animate={{
                backgroundPosition: ["0% center", "100% center"],
              }}
              transition={{
                duration: 1,
                repeat: Infinity,
                repeatType: "reverse",
                ease: "linear",
              }}
              style={{
                backgroundImage:
                  "linear-gradient(90deg,#ec4899,#facc15,#6366f1)",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                color: "transparent",
                display: "inline-block",
              }}
              className="cursor-pointer" // Thêm cursor-pointer
            >
              Nâng cấp tài khoản
            </motion.span>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <BadgeCheck className="size-4 text-green-500" />
            Tài khoản
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <CreditCard className="size-4 text-pink-500" />
            Thanh toán
          </DropdownMenuItem>
          <DropdownMenuItem className="gap-2 cursor-pointer">
            <Bell className="size-4 text-yellow-500" />
            Thông báo
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleLogout}
          className="gap-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 focus:text-red-600 transition-all cursor-pointer" // Thêm cursor-pointer
        >
          <LogOut className="size-4" />
          Đăng xuất
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
