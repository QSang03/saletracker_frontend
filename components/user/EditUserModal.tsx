import { useState, useEffect } from "react";
import { User, UpdateUserDto, Department } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MultiSelectCombobox } from "@/components/ui/MultiSelectCombobox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

interface EditUserModalProps {
  user: User;
  departments: Department[];
  onClose: () => void;
  onUpdateUser: (updatedUser: User) => void;
  currentUserRole: string;
  isSubmitting?: boolean;
}

export default function EditUserModal({
  user,
  departments,
  onClose,
  onUpdateUser,
  currentUserRole,
  isSubmitting,
}: EditUserModalProps) {
  const [formData, setFormData] = useState<UpdateUserDto>({
    username: user.username,
    fullName: user.fullName || "",
    nickName: user.nickName || "",
    email: user.email || "",
    employeeCode: user.employeeCode || "",
    departmentIds: user.departments?.map((d) => d.id) || [],
  });

  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    setFormData({
      username: user.username,
      fullName: user.fullName || "",
      nickName: user.nickName || "",
      email: user.email || "",
      employeeCode: user.employeeCode || "",
      departmentIds: user.departments?.map((d) => d.id) || [],
    });
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleDepartmentChange = (vals: (string | number)[]) => {
    setFormData((prev) => ({
      ...prev,
      departmentIds: vals.map(Number),
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      (currentUserRole === "ADMIN" || currentUserRole.startsWith("MANAGER")) &&
      !formData.fullName?.trim()
    ) {
      alert("Họ tên không được để trống");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    let updatedUser: any;
    if (currentUserRole === "ADMIN") {
      updatedUser = {
        id: user.id,
        username: formData.username,
        fullName: formData.fullName,
        nickName: formData.nickName,
        email: formData.email,
        employeeCode: formData.employeeCode,
        departmentIds: formData.departmentIds,
      };
    } else if (currentUserRole.startsWith("MANAGER")) {
      updatedUser = {
        id: user.id,
        fullName: formData.fullName,
        nickName: formData.nickName,
        email: formData.email,
        employeeCode: formData.employeeCode,
      };
    } else {
      updatedUser = {
        id: user.id,
        employeeCode: formData.employeeCode,
      };
    }
    onUpdateUser(updatedUser);
    setShowConfirm(false);
  };

  const canEditFullNameAndNickName =
    currentUserRole === "ADMIN" || currentUserRole.startsWith("MANAGER");

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="w-full max-w-full sm:max-w-md rounded-xl p-2 sm:p-6 shadow-xl animate-in fade-in-0 zoom-in-95"
        style={{ backgroundColor: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Chỉnh sửa người dùng
          </DialogTitle>
          <DialogDescription>
            Nhập thông tin người dùng mới vào các trường bên dưới.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={handleSubmit}
          className="mt-4 space-y-4"
          autoComplete="off"
        >
          <div>
            <Label htmlFor="username" className="mb-1 block">
              Tên đăng nhập (không thể thay đổi)
            </Label>
            <Input
              id="username"
              name="username"
              value={formData.username}
              disabled
              className="mt-1 bg-gray-100 cursor-not-allowed"
            />
          </div>
          <div>
            <Label htmlFor="employeeCode" className="mb-1 block">
              Mã nhân viên
            </Label>
            <Input
              id="employeeCode"
              name="employeeCode"
              value={formData.employeeCode}
              onChange={handleChange}
              disabled={isSubmitting}
              className="mt-1"
            />
          </div>
          {canEditFullNameAndNickName && (
            <>
              <div>
                <Label htmlFor="fullName" className="mb-1 block">
                  Họ và tên
                </Label>
                <Input
                  id="fullName"
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="nickName" className="mb-1 block">
                  Tên thể hiện (nick name)
                </Label>
                <Input
                  id="nickName"
                  name="nickName"
                  value={formData.nickName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="email" className="mb-1 block">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  className="mt-1"
                />
              </div>
            </>
          )}
          {currentUserRole === "ADMIN" && (
            <>
              <div>
                <Label className="mb-1 block">Phòng ban</Label>
                <MultiSelectCombobox
                  options={departments.map((dept) => ({
                    label: dept.name,
                    value: dept.id,
                  }))}
                  value={formData.departmentIds ?? []}
                  onChange={handleDepartmentChange}
                  placeholder="Chọn phòng ban..."
                />
              </div>
            </>
          )}
          <div className="flex justify-end pt-2 gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </form>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận lưu thay đổi"
          message="Bạn có chắc chắn muốn lưu thay đổi thông tin người dùng này?"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      </DialogContent>
    </Dialog>
  );
}