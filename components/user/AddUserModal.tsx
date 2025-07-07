import { useState, useEffect } from "react";
import { CreateUserDto, Department } from "@/types";
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

interface AddUserModalProps {
  departments: Department[];
  onClose: () => void;
  onAddUser: (userData: CreateUserDto) => void;
}

export default function AddUserModal({
  departments,
  onClose,
  onAddUser,
}: AddUserModalProps) {
  const [formData, setFormData] = useState<CreateUserDto>({
    username: "",
    fullName: "",
    nickName: "",
    email: "",
    password: "",
    employeeCode: "",
    departmentIds: [],
  });
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset form khi đóng modal
  useEffect(() => {
    if (!showConfirm) {
      setFormData({
        username: "",
        fullName: "",
        nickName: "",
        email: "",
        password: "",
        employeeCode: "",
        departmentIds: [],
      });
    }
  }, [onClose, showConfirm]);

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
      !String(formData.username).trim() ||
      !String(formData.password).trim() ||
      !String(formData.fullName).trim() ||
      !String(formData.email).trim()
    ) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    onAddUser(formData);
    setShowConfirm(false);
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent
        className="w-full max-w-full sm:max-w-md rounded-xl p-2 sm:p-6 shadow-xl animate-in fade-in-0 zoom-in-95"
        style={{ backgroundColor: "white" }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            Thêm Người Dùng Mới
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
              Tên đăng nhập
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="off"
              value={formData.username}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="employeeCode" className="mb-1 block">
              Mã nhân viên (không bắt buộc)
            </Label>
            <Input
              id="employeeCode"
              name="employeeCode"
              autoComplete="off"
              value={formData.employeeCode || ""}
              onChange={handleChange}
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="password" className="mb-1 block">
              Mật khẩu
            </Label>
            <Input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              value={formData.password}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="fullName" className="mb-1 block">
              Họ và tên
            </Label>
            <Input
              id="fullName"
              name="fullName"
              autoComplete="off"
              value={formData.fullName}
              onChange={handleChange}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="nickName" className="mb-1 block">
              Tên thể hiện (nickname)
            </Label>
            <Input
              id="nickName"
              name="nickName"
              autoComplete="off"
              value={formData.nickName || ""}
              onChange={handleChange}
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
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label className="mb-1 block">Phòng ban</Label>
            <MultiSelectCombobox
              options={(Array.isArray(departments) ? departments : []).map(
                (dept) => ({
                  label: dept.name,
                  value: dept.id,
                })
              )}
              value={formData.departmentIds ?? []}
              onChange={handleDepartmentChange}
              placeholder="Chọn phòng ban..."
            />
          </div>
          <div className="flex justify-end pt-2 gap-2">
            <Button type="button" variant="delete" onClick={onClose}>
              Hủy
            </Button>
            <Button type="submit" variant="add">
              Thêm
            </Button>
          </div>
        </form>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận thêm người dùng"
          message="Bạn có chắc chắn muốn thêm người dùng này?"
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirm(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
