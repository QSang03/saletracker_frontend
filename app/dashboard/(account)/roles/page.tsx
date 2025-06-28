"use client";

import { useState, useEffect } from "react";
import PermissionManager from "@/components/permissions/PermissionManager";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { User } from "@/types";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";

export default function RoleManagementPage() {
  const [isLoading, setIsLoading] = useState(true);
  const [users, setUsers] = useState<User[]>([]);
  const router = useRouter();

  useEffect(() => {
    const fetchUsers = async () => {
      const token = getAccessToken();
      if (!token) {
        console.error("No access token found");
        setIsLoading(false);
        router.push("/login");
        return;
      }
      
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/for-permission-management`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        
        if (response.status === 401) {
          console.error("Token hết hạn hoặc không hợp lệ");
          router.push("/login");
          return;
        }
        
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data: User[] = await response.json();
        setUsers(data);
      } catch (error) {
        console.error("Failed to fetch users", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleUserUpdate = (updatedUser: User) => {
    setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u));
  };

  return (
    <main className="flex flex-col gap-4 pt-0 pb-4">
      <div className="bg-muted text-muted-foreground rounded-xl flex-1">
        <div className="rounded-xl border bg-background p-4 shadow-sm overflow-hidden min-h-[calc(100vh-4rem-2rem)]">
          <h1 className="text-xl font-bold mb-4">🔐 Phân quyền</h1>

          {isLoading ? (
            <LoadingSpinner size={48} />
          ) : (
            <PermissionManager users={users} onUserUpdate={handleUserUpdate} />
          )}
        </div>
      </div>
    </main>
  );
}
