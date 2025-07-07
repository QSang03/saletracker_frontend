"use client";

import React, { useEffect, useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth";
import type { User } from "@/types";

export function ProfileModal({
  open,
  onOpenChange,
  userData,
  onUserUpdate
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userData: User | null;
  onUserUpdate?: (user: User) => void;
}) {
  const [editData, setEditData] = useState<Partial<User>>({});
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  useEffect(() => {
    if (userData) {
      setEditData({
        nickName: userData.nickName || "",
        email: userData.email || "",
        username: userData.username || "",
      });
    }
  }, [userData, open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditData({ ...editData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userData) return;
    setConfirmOpen(true);
  };

  const handleConfirm = async () => {
    if (!userData) return;
    setSaving(true);
    try {
      const token = getAccessToken();
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/users/${userData.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(editData),
      });
      if (!res.ok) throw new Error("Cập nhật thất bại");
      const updated = await res.json();
      toast.success("Cập nhật thành công!");
      onUserUpdate?.(updated);
      onOpenChange(false);
    } catch (e) {
      toast.error("Cập nhật thất bại");
    } finally {
      setSaving(false);
      setConfirmOpen(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg w-full p-0">
        <Card className="border-none shadow-none p-0">
          <form onSubmit={handleSubmit} className="space-y-4 px-6 pt-6 pb-2">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">👤 Thông tin cá nhân</DialogTitle>
            </DialogHeader>
            <div>
              <Label htmlFor="username">Tên đăng nhập</Label>
              <Input
                id="username"
                name="username"
                value={editData.username || ""}
                onChange={handleChange}
                disabled
              />
            </div>
            <div>
              <Label htmlFor="nickName">Biệt danh</Label>
              <Input
                id="nickName"
                name="nickName"
                value={editData.nickName || ""}
                onChange={handleChange}
              />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                value={editData.email || ""}
                onChange={handleChange}
                type="email"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="outline">Đóng</Button>
              </DialogClose>
              <Button type="submit" disabled={saving} variant="gradient">
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          </form>
        </Card>
      </DialogContent>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Xác nhận thay đổi"
        message="Bạn có chắc chắn muốn cập nhật thông tin cá nhân?"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
      />
    </Dialog>
  );
}
