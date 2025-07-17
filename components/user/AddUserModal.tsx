import { useState, useEffect, useRef } from "react";
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
  onRestoreUser: (userId: number) => Promise<void>;
  open: boolean;
}

export default function AddUserModal({
  departments,
  onClose,
  onAddUser,
  onRestoreUser,
  open,
}: AddUserModalProps) {
  const [formData, setFormData] = useState<CreateUserDto>({
    username: "",
    fullName: "",
    nickName: "",
    email: "",
    employeeCode: "",
    departmentIds: [],
  });
  const [usernameError, setUsernameError] = useState<string>("");
  const [showRestoreDialog, setShowRestoreDialog] = useState(false);
  const [restoreUserId, setRestoreUserId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Reset form khi modal AddUserModal thực sự đóng (open chuyển từ true sang false)
  const prevOpen = useRef<boolean>(open);
  useEffect(() => {
    if (prevOpen.current && !open) {
      setFormData({
        username: "",
        fullName: "",
        nickName: "",
        email: "",
        employeeCode: "",
        departmentIds: [],
      });
    }
    prevOpen.current = open;
  }, [open]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === "username") {
      // Chỉ cho phép a-z, A-Z, 0-9, _
      const regex = /^[a-zA-Z0-9_]+$/;
      if (!regex.test(value)) {
        setUsernameError("Tên đăng nhập chỉ được chứa chữ cái không dấu, số, và dấu gạch dưới, không có dấu cách hoặc ký tự đặc biệt.");
      } else {
        setUsernameError("");
      }
    }
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
    if (!String(formData.username).trim() || !String(formData.fullName).trim()) {
      alert("Vui lòng nhập đầy đủ thông tin bắt buộc!");
      return;
    }
    // Kiểm tra username hợp lệ
    const regex = /^[a-zA-Z0-9_]+$/;
    if (!regex.test(formData.username)) {
      setUsernameError("Tên đăng nhập chỉ được chứa chữ cái không dấu, số, và dấu gạch dưới, không có dấu cách hoặc ký tự đặc biệt.");
      return;
    }
    setShowConfirm(true);
  };

  const handleConfirm = () => {
    setShowRestoreDialog(false);
    setRestoreUserId(null);
    // Lọc bỏ các trường rỗng
    const cleanData = Object.fromEntries(
      Object.entries(formData).filter(
        ([_, v]) => v !== "" && v !== undefined && !(Array.isArray(v) && v.length === 0)
      )
    ) as CreateUserDto;
    Promise.resolve(onAddUser(cleanData))
      .then(() => {
        setShowConfirm(false);
        setFormData({
          username: "",
          fullName: "",
          nickName: "",
          email: "",
          employeeCode: "",
          departmentIds: [],
        });
      })
      .catch((err) => {
        setShowConfirm(false); // Đóng modal xác nhận khi có lỗi
        let msg = "Đã có lỗi xảy ra. Vui lòng thử lại!";
        // Luôn kiểm tra code ở cả err và err.response.data
        const code = err?.code || err?.response?.data?.code;
        const userId = err?.userId || err?.response?.data?.userId || null;
        if (code === "SOFT_DELETED_DUPLICATE" && userId) {
          setRestoreUserId(userId);
          setShowRestoreDialog(true);
          msg = "";
        } else {
          const backendMsg = err?.response?.data?.message;
          if (Array.isArray(backendMsg)) {
            msg = backendMsg.join("; ");
          } else if (typeof backendMsg === "string") {
            msg = backendMsg;
          } else if (err?.message) {
            msg = err.message;
          }
        }
      });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
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
          <ConfirmDialog
            isOpen={showRestoreDialog}
            title="Khôi phục người dùng đã xóa"
            message="Tên đăng nhập đã tồn tại nhưng đã bị xóa mềm. Bạn có muốn khôi phục lại người dùng này không?"
            onConfirm={async () => {
              setShowRestoreDialog(false);
              if (restoreUserId !== null && restoreUserId !== undefined) {
                try {
                  await onRestoreUser(restoreUserId);
                  setRestoreUserId(null);
                } catch (err: any) {
                }
              }
            }}
            onCancel={() => setShowRestoreDialog(false)}
          />
          <div>
            <Label htmlFor="username" className="mb-1 block">
              Tên đăng nhập <span className="text-red-500 ml-1 text-sm align-top">*</span>
            </Label>
            <Input
              id="username"
              name="username"
              autoComplete="off"
              value={formData.username}
              onChange={handleChange}
              required
              className={`mt-1 ${usernameError ? "border-red-500" : ""}`}
            />
            {usernameError && (
              <span className="text-red-500 text-xs mt-1 block">{usernameError}</span>
            )}
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
            <Label htmlFor="fullName" className="mb-1 block">
              Họ và tên <span className="text-red-500 ml-1 text-sm align-top">*</span>
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
              className="mt-1"
              placeholder="Email (không bắt buộc)"
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
