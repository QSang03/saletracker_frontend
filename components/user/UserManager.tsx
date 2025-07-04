"use client";

import { useState, useEffect, useCallback } from "react";
import { getAccessToken } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { User, Department, Role, CreateUserDto } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import AddUserModal from "@/components/user/AddUserModal";
import EditUserModal from "@/components/user/EditUserModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import { Button } from "@/components/ui/button";
import { AdminSocket } from "@/components/auth/AdminSocket";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import UserTable from "@/components/user/UserTable";
import { DateRange } from "@/components/ui/date-range-picker";
import ChangeLogManager from "@/components/user/ChangeLogManager";

export default function UserManager() {
  const [users, setUsers] = useState<User[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [deletedUsers, setDeletedUsers] = useState<User[]>([]);
  const [deletedTotal, setDeletedTotal] = useState(0);
  const [deletedPage, setDeletedPage] = useState(1);
  const deletedLimit = 10;
  const [userPage, setUserPage] = useState(1);
  const userLimit = 10;
  const [userTotal, setUserTotal] = useState(0);
  const [confirmAction, setConfirmAction] = useState<{
    type: "block" | null;
    user?: User;
    checked?: boolean;
  }>({ type: null });
  const [restoringUserId, setRestoringUserId] = useState<number | null>(null);

  // Tách riêng state cho log manager
  const [showChangeLogsModal, setShowChangeLogsModal] = useState(false);

  // State filter cho bộ lọc
  const [userFilters, setUserFilters] = useState<{
    search: string;
    departments: (string | number)[];
    roles: (string | number)[];
    statuses: (string | number)[];
    dateRange: DateRange;
  }>({
    search: "",
    departments: [],
    roles: [],
    statuses: [],
    dateRange: { from: undefined, to: undefined },
  });

  const handleUserLogin = useCallback(() => {
    fetchUsers(userPage, userFilters);
  }, [userPage, userFilters]);

  const handleUserLogout = useCallback(() => {
    fetchUsers(userPage, userFilters);
  }, [userPage, userFilters]);

  const handleUserBlock = useCallback(() => {
    fetchUsers(userPage, userFilters);
  }, [userPage, userFilters]);

  const router = useRouter();

  useEffect(() => {
    const fetchProfile = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/auth/profile`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data: User = await res.json();
          setCurrentUser(data);
        }
      } catch (err) {
        console.error("Lỗi lấy profile:", err);
      }
    };
    fetchProfile();
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/departments`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setDepartments(Array.isArray(data.data) ? data.data : []);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchDepartments();
  }, []);

  useEffect(() => {
    const fetchRoles = async () => {
      const token = getAccessToken();
      if (!token) return;
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/roles`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (res.ok) {
          const data: Role[] = await res.json();
          setRoles(data);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchRoles();
  }, []);

  useEffect(() => {
    if (showDeletedModal) {
      const fetchDeletedUsers = async () => {
        const token = getAccessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/deleted?page=${deletedPage}&limit=${deletedLimit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const { data, total } = await res.json();
          setDeletedUsers(data);
          setDeletedTotal(total);
        }
      };
      fetchDeletedUsers();
    }
  }, [showDeletedModal, deletedPage]);

  const [alert, setAlert] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const fetchUsers = async (page = 1, filters = userFilters) => {
    const token = getAccessToken();
    if (!token) {
      router.push("/login");
      return;
    }
    try {
      let query = `?page=${page}&limit=${userLimit}`;
      if (filters.search)
        query += `&search=${encodeURIComponent(filters.search)}`;
      if (filters.departments.length)
        query += `&departments=${filters.departments.join(",")}`;
      if (filters.roles.length) query += `&roles=${filters.roles.join(",")}`;
      if (filters.statuses.length)
        query += `&statuses=${filters.statuses.join(",")}`;

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users${query}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );
      if (res.status === 401) {
        router.push("/login");
        return;
      }
      if (!res.ok) throw new Error("Failed to fetch users");
      const { data, total } = await res.json();
      setUsers(data);
      setUserTotal(total);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(userPage);
  }, [router, userPage]);

  const availableRoles = roles.map((role) => role.name);
  const availableDepartments = Array.from(
    new Set((Array.isArray(departments) ? departments : []).map((d) => d.name))
  );

  const availableStatuses = [
    { value: "active", label: "Đang hoạt động" },
    { value: "inactive", label: "Ngưng hoạt động" },
  ];

  const handleAddUser = async (userData: CreateUserDto) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      });
      if (!res.ok) throw new Error("Thêm người dùng thất bại!");
      setUserPage(1);
      setAlert({ type: "success", message: "Thêm người dùng thành công!" });
      fetchUsers(1);
      setIsAddModalOpen(false);
    } catch (err) {
      setAlert({ type: "error", message: "Thêm người dùng thất bại!" });
    }
  };

  const handleDeleteUser = async (userId: number) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Xóa người dùng thất bại!");
      setAlert({ type: "success", message: "Xóa người dùng thành công!" });
      // Nếu xóa hết trang hiện tại thì lùi về trang trước
      if (users.length === 1 && userPage > 1) {
        setUserPage(userPage - 1);
      } else {
        fetchUsers(userPage);
      }
    } catch (err) {
      setAlert({ type: "error", message: "Xóa người dùng thất bại!" });
    } finally {
      setIsDeleteDialogOpen(false);
      setDeletingUserId(null);
    }
  };

  const handleToggleBlock = async (user: User, checked: boolean) => {
    const token = getAccessToken();
    if (!token) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${user.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            isBlock: checked,
            status: checked ? "inactive" : user.status,
          }),
        }
      );
      if (!res.ok) throw new Error("Cập nhật trạng thái tài khoản thất bại");
      setAlert({
        type: "success",
        message: checked
          ? "Đã khóa tài khoản thành công!"
          : "Đã mở khóa tài khoản thành công!",
      });
      fetchUsers(userPage);
    } catch (err) {
      setAlert({
        type: "error",
        message: "Cập nhật trạng thái tài khoản thất bại!",
      });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirm = async () => {
    if (confirmAction.type === "block" && confirmAction.user) {
      await handleToggleBlock(confirmAction.user, !!confirmAction.checked);
    }
    setConfirmAction({ type: null });
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const token = getAccessToken();
    if (!token) return;
    setIsSubmittingEdit(true);
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${updatedUser.id}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updatedUser),
        }
      );
      if (!res.ok) throw new Error("Cập nhật thất bại");
      setAlert({ type: "success", message: "Cập nhật thành công!" });
      fetchUsers(userPage);
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (err) {
      setAlert({ type: "error", message: "Cập nhật thất bại!" });
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleRestoreUser = async (userId: number) => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userId}/restore`,
        {
          method: "PATCH",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!res.ok) throw new Error("Khôi phục thất bại!");
      setAlert({ type: "success", message: "Khôi phục thành công!" });
      const fetchDeletedUsers = async () => {
        const token = getAccessToken();
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL}/users/deleted?page=${deletedPage}&limit=${deletedLimit}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (res.ok) {
          const { data, total } = await res.json();
          setDeletedUsers(data);
          setDeletedTotal(total);
        }
      };
      fetchDeletedUsers();
      fetchUsers(userPage, userFilters);
    } catch (err) {
      setAlert({ type: "error", message: "Khôi phục thất bại!" });
    }
  };

  if (isLoading || !currentUser) {
    return (
      <div className="flex justify-center items-center h-screen">
        <LoadingSpinner size={48} />
      </div>
    );
  }

  return (
    <>
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <AdminSocket
        onUserLogin={handleUserLogin}
        onUserLogout={handleUserLogout}
        onUserBlock={handleUserBlock}
      />
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-center">
            <span>Quản Lý Người Dùng</span>
            {currentUser.roles[0]?.name?.toUpperCase() === "ADMIN" && (
              <div className="flex gap-2 w-full sm:w-auto">
                <Button
                  onClick={() => setShowChangeLogsModal(true)}
                  variant="outline"
                  className="text-sm"
                >
                  Lịch sử thay đổi
                </Button>
                <Button
                  onClick={() => setShowDeletedModal(true)}
                  variant="gradient"
                  className="text-sm"
                >
                  Tài khoản đã xóa
                </Button>
                <Button
                  onClick={() => setIsAddModalOpen(true)}
                  variant="add"
                  className="text-sm"
                >
                  + Thêm User
                </Button>
              </div>
            )}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <PaginatedTable
            page={userPage}
            total={userTotal}
            pageSize={userLimit}
            onPageChange={(page) => {
              setUserPage(page);
              fetchUsers(page, userFilters);
            }}
            emptyText="Không có người dùng nào."
            enableSearch
            enableRoleFilter
            enableDepartmentFilter
            enableStatusFilter
            availableRoles={availableRoles}
            availableDepartments={availableDepartments}
            availableStatuses={availableStatuses}
            onFilterChange={(filters) => {
              setUserFilters(filters);
              setUserPage(1);
              fetchUsers(1, filters);
            }}
          >
            <UserTable
              users={users}
              currentUserRole={
                currentUser.roles[0]?.name?.toUpperCase() || "USER"
              }
              currentUserId={currentUser.id}
              onEdit={(user) => {
                setEditingUser(user);
                setIsEditModalOpen(true);
              }}
              onDelete={(userId) => {
                setDeletingUserId(userId);
                setIsDeleteDialogOpen(true);
              }}
              onToggleBlock={handleToggleBlock}
              startIndex={(userPage - 1) * userLimit}
              expectedRowCount={userLimit}
              onRequestBlockConfirm={(user, checked) =>
                setConfirmAction({ type: "block", user, checked })
              }
            />
          </PaginatedTable>
        </CardContent>

        {/* Modal thêm user */}
        {isAddModalOpen && (
          <AddUserModal
            departments={departments}
            onClose={() => setIsAddModalOpen(false)}
            onAddUser={handleAddUser}
          />
        )}

        {/* Modal sửa user */}
        {isEditModalOpen && editingUser && (
          <EditUserModal
            user={editingUser}
            departments={departments}
            onClose={() => {
              setIsEditModalOpen(false);
              setEditingUser(null);
            }}
            onUpdateUser={handleUpdateUser}
            currentUserRole={
              currentUser.roles[0]?.name?.toUpperCase() || "USER"
            }
            isSubmitting={isSubmittingEdit}
          />
        )}

        {/* Xác nhận xóa */}
        <ConfirmDialog
          isOpen={isDeleteDialogOpen}
          title="Xác nhận xóa"
          message="Bạn có chắc chắn muốn xóa người dùng này?"
          onConfirm={() => deletingUserId && handleDeleteUser(deletingUserId)}
          onCancel={() => setIsDeleteDialogOpen(false)}
        />

        {/* Xác nhận block/mở block */}
        <ConfirmDialog
          isOpen={!!confirmAction.type}
          title={
            confirmAction.type === "block"
              ? confirmAction.checked
                ? "Xác nhận khóa tài khoản"
                : "Xác nhận mở khóa tài khoản"
              : ""
          }
          message={
            confirmAction.type === "block"
              ? `Bạn có chắc chắn muốn ${
                  confirmAction.checked ? "khóa" : "mở khóa"
                } tài khoản "${confirmAction.user?.fullName}"?`
              : ""
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirmAction({ type: null })}
        />

        {/* Modal tài khoản đã xóa với PaginatedTable */}
        {showDeletedModal && (
          <Dialog open={showDeletedModal} onOpenChange={setShowDeletedModal}>
            <DialogContent
              className="w-screen max-w-3xl p-6 rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95"
              style={{
                maxWidth: "90vw",
                maxHeight: "80vh",
                backgroundColor: "white",
                overflow: "auto",
              }}
            >
              <DialogHeader>
                <DialogTitle className="text-2xl font-bold">
                  Danh sách tài khoản đã xóa
                </DialogTitle>
                <DialogDescription>
                  Danh sách các tài khoản đã bị xóa. Bạn có thể khôi phục.
                </DialogDescription>
              </DialogHeader>
              <div className="mt-4">
                <PaginatedTable
                  page={deletedPage}
                  total={deletedTotal}
                  pageSize={deletedLimit}
                  onPageChange={setDeletedPage}
                  emptyText="Không có tài khoản nào bị xóa."
                >
                  <UserTable
                    users={deletedUsers}
                    currentUserRole={
                      currentUser.roles[0]?.name?.toUpperCase() || "USER"
                    }
                    currentUserId={currentUser.id}
                    showRestore
                    onRestore={(userId) => setRestoringUserId(userId)}
                    onEdit={() => {}}
                    onDelete={() => {}}
                    onToggleBlock={() => {}}
                    startIndex={(deletedPage - 1) * deletedLimit}
                    expectedRowCount={deletedLimit}
                  />
                </PaginatedTable>
              </div>
              <ConfirmDialog
                isOpen={!!restoringUserId}
                title="Xác nhận khôi phục"
                message="Bạn có chắc chắn muốn khôi phục tài khoản này?"
                onConfirm={async () => {
                  if (restoringUserId) {
                    await handleRestoreUser(restoringUserId);
                    setRestoringUserId(null);
                  }
                }}
                onCancel={() => setRestoringUserId(null)}
              />
            </DialogContent>
          </Dialog>
        )}

        {/* Modal lịch sử đổi tên user */}
        <ChangeLogManager
          open={showChangeLogsModal}
          onClose={() => setShowChangeLogsModal(false)}
        />
      </Card>
    </>
  );
}
