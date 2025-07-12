"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import { getFirstAccessibleUrl } from "@/lib/nav-access";
import { navItems } from "@/lib/nav-items";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    
    if (token) {
      const user = getUserFromToken(token);
      if (user) {
        const firstUrl = getFirstAccessibleUrl(user, navItems);
        if (firstUrl) {
          router.replace(firstUrl);
        } else {
          router.replace("/dashboard/manager-debt"); // fallback
        }
      } else {
        router.replace("/login");
      }
    } else {
      // Nếu không có token, redirect về login
      router.replace("/login");
    }
  }, [router]);

  // Hiển thị loading trong khi redirect
  return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={32} />
    </div>
  );
}
