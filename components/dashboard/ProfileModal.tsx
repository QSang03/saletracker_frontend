"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose,
} from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Eye, EyeOff, User, Mail, KeyRound, Badge } from "lucide-react";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth";
import type { User } from "@/types";

export function ProfileModal({
  open,
  onOpenChange,
  userData,
  onUserUpdate,
  initialTab = "profile",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: User | null;
  onUserUpdate?: (user: User) => void;
  initialTab?: "profile" | "password";
}) {
  const [editData, setEditData] = useState<Partial<User>>({});
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [allowClose, setAllowClose] = useState(true); // Kiểm soát việc đóng modal
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "password">(initialTab);

  useEffect(() => {
    if (userData && open) {
      setEditData({
        nickName: userData.nickName || "",
        email: userData.email || "",
        username: userData.username || "",
      });
      // Reset password data và allowClose khi modal mở
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setAllowClose(true); // Cho phép đóng modal khi vừa mở
    }
  }, [userData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPasswordData({ ...passwordData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;

    if (activeTab === "password") {
      // Validate password change (trim before checking)
      const currentPasswordTrimmed = passwordData.currentPassword.trim();
      const newPasswordTrimmed = passwordData.newPassword.trim();
      const confirmPasswordTrimmed = passwordData.confirmPassword.trim();

      if (!currentPasswordTrimmed || !newPasswordTrimmed) {
        toast.error("Vui lòng nhập đầy đủ thông tin mật khẩu!");
        return;
      }
      if (newPasswordTrimmed !== confirmPasswordTrimmed) {
        toast.error("Mật khẩu xác nhận không khớp!");
        return;
      }
      if (newPasswordTrimmed.length < 6) {
        toast.error("Mật khẩu mới phải có ít nhất 6 ký tự!");
        return;
      }
    }

    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!userData) return;
    setSaving(true);
    setAllowClose(false); // Không cho phép đóng modal khi đang xử lý

    try {
      const token = getAccessToken();
      let requestBody: any = {};
      if (activeTab === "profile") {
        requestBody = editData;
      } else if (activeTab === "password") {
        const currentPassword = passwordData.currentPassword.trim();
        const password = passwordData.newPassword.trim();
        requestBody = {
          currentPassword,
          password,
        };
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/users/${userData.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage = errorData.message || "Cập nhật thất bại";

        // Hiển thị lỗi và focus vào trường tương ứng
        if (
          activeTab === "password" &&
          errorMessage.includes("mật khẩu hiện tại")
        ) {
          setTimeout(() => {
            const currentPasswordInput =
              document.getElementById("currentPassword");
            currentPasswordInput?.focus();
          }, 100);
        }

        toast.error(errorMessage);

        console.log(
          "ERROR - Modal should stay open. allowClose:",
          true,
          "saving:",
          false
        );

        // Khi có lỗi: chỉ đóng ConfirmDialog, GIỮ NGUYÊN modal
        setSaving(false);
        setConfirmOpen(false);
        setAllowClose(true); // Cho phép đóng modal trở lại nhưng KHÔNG tự đóng
        return;
      }

      // Thành công
      const updated = await res.json();
      toast.success(
        activeTab === "profile"
          ? "Cập nhật thông tin thành công!"
          : "Đổi mật khẩu thành công!"
      );

      if (activeTab === "profile") {
        onUserUpdate?.(updated);
      } else {
        setPasswordData({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }

      // Khi thành công: đóng tất cả
      setSaving(false);
      setConfirmOpen(false);
      setAllowClose(true);
      onOpenChange(false); // Đóng modal
    } catch (e: any) {
      // Lỗi network
      console.error("Network error:", e);
      console.log(
        "NETWORK ERROR - Modal should stay open. allowClose:",
        true,
        "saving:",
        false
      );

      toast.error("Lỗi kết nối. Vui lòng thử lại!");

      setSaving(false);
      setConfirmOpen(false);
      setAllowClose(true); // Cho phép đóng modal nhưng KHÔNG tự đóng
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(openValue) => {
        console.log("Dialog onOpenChange called:", {
          openValue,
          allowClose,
          saving,
        });
        // Chỉ cho phép đóng modal khi allowClose = true
        if (allowClose && !saving) {
          console.log("Closing modal allowed");
          onOpenChange(openValue);
        } else {
          console.log("Closing modal blocked");
        }
      }}
    >
      <DialogContent className="max-w-2xl w-full p-0 max-h-[90vh] overflow-hidden">
        {/* Đảm bảo DialogTitle luôn có cho accessibility */}
        <DialogTitle className="sr-only">Cài đặt tài khoản</DialogTitle>
        <Card className="border-none shadow-none p-0 h-full">
          <CardHeader className="pb-4">
            <CardTitle className="mt-5 text-2xl font-bold text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              ⚙️ Cài đặt tài khoản
            </CardTitle>

            {/* Tab Navigation */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mt-4">
              <button
                type="button"
                onClick={() => setActiveTab("profile")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                  activeTab === "profile"
                    ? "bg-white shadow-sm text-blue-600 font-medium"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <User size={18} />
                Thông tin cá nhân
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("password")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-md transition-all ${
                  activeTab === "password"
                    ? "bg-white shadow-sm text-blue-600 font-medium"
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                <KeyRound size={18} />
                Đổi mật khẩu
              </button>
            </div>
          </CardHeader>

          <form onSubmit={handleSubmit} className="h-full flex flex-col">
            <CardContent className="flex-1 overflow-y-auto space-y-6 px-6 mb-5">
              {activeTab === "profile" && (
                <div className="space-y-4 pb-2">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label
                        htmlFor="username"
                        className="flex items-center gap-2 font-medium"
                      >
                        <Badge size={16} className="text-gray-500" />
                        Tên đăng nhập
                      </Label>
                      <Input
                        id="username"
                        name="username"
                        value={editData.username || ""}
                        onChange={handleChange}
                        disabled
                        className="bg-gray-50"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label
                        htmlFor="nickName"
                        className="flex items-center gap-2 font-medium"
                      >
                        <User size={16} className="text-gray-500" />
                        Biệt danh
                      </Label>
                      <Input
                        id="nickName"
                        name="nickName"
                        value={editData.nickName || ""}
                        onChange={handleChange}
                        placeholder="Nhập biệt danh của bạn"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="email"
                      className="flex items-center gap-2 font-medium"
                    >
                      <Mail size={16} className="text-gray-500" />
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      value={editData.email || ""}
                      onChange={handleChange}
                      type="email"
                      placeholder="Nhập địa chỉ email"
                    />
                  </div>
                </div>
              )}

              {activeTab === "password" && (
                <div className="space-y-4 pb-2">
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Lưu ý:</strong> Mật khẩu mới phải có ít nhất 6 ký
                      tự và khác mật khẩu hiện tại.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="currentPassword"
                      className="flex items-center gap-2 font-medium"
                    >
                      <KeyRound size={16} className="text-gray-500" />
                      Mật khẩu hiện tại
                    </Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        name="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập mật khẩu hiện tại"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowCurrentPassword(!showCurrentPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showCurrentPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="newPassword"
                      className="flex items-center gap-2 font-medium"
                    >
                      <KeyRound size={16} className="text-gray-500" />
                      Mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        name="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập mật khẩu mới"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showNewPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="confirmPassword"
                      className="flex items-center gap-2 font-medium"
                    >
                      <KeyRound size={16} className="text-gray-500" />
                      Xác nhận mật khẩu mới
                    </Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        placeholder="Nhập lại mật khẩu mới"
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowConfirmPassword(!showConfirmPassword)
                        }
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} />
                        ) : (
                          <Eye size={18} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>

            <Separator />

            <div className="flex justify-end gap-3 p-6 bg-gray-50">
              <Button
                type="button"
                variant="outline"
                className="min-w-[100px]"
                onClick={() => {
                  if (allowClose && !saving) {
                    onOpenChange(false);
                  }
                }}
                disabled={!allowClose || saving}
              >
                Đóng
              </Button>
              <Button
                type="submit"
                disabled={saving}
                variant="gradient"
                className="min-w-[120px]"
              >
                {saving
                  ? "Đang lưu..."
                  : activeTab === "profile"
                  ? "Lưu thay đổi"
                  : "Đổi mật khẩu"}
              </Button>
            </div>
          </form>
        </Card>
        <ConfirmDialog
          isOpen={confirmOpen}
          title={
            activeTab === "profile"
              ? "Xác nhận cập nhật thông tin"
              : "Xác nhận đổi mật khẩu"
          }
          message={
            activeTab === "profile"
              ? "Bạn có chắc chắn muốn cập nhật thông tin cá nhân?"
              : "Bạn có chắc chắn muốn đổi mật khẩu?"
          }
          onConfirm={handleConfirm}
          onCancel={() => setConfirmOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
