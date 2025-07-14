"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { User } from "@/types";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface UserTableProps {
  users: User[];
  currentUserRole: string;
  currentUserId: number;
  onEdit: (user: User) => void;
  onDelete: (userId: number) => void;
  onViewDetails?: (user: User) => void;
  onToggleBlock: (user: User, checked: boolean) => void;
  onRequestBlockConfirm?: (user: User, checked: boolean) => void;
  startIndex?: number;
  expectedRowCount?: number;
  showRestore?: boolean;
  onRestore?: (userId: number) => void;
}

export default function UserTable({
  users,
  currentUserRole,
  onEdit,
  onDelete,
  onToggleBlock,
  startIndex = 0,
  expectedRowCount = users.length,
  onRequestBlockConfirm,
  showRestore,
  onRestore,
}: UserTableProps) {
  const headers = [
    "Mã NV",
    "Tên đăng nhập",
    "Tên đầy đủ",
    "Email",
    "Phòng ban",
    "Vai trò",
    "Trạng thái tài khoản",
    "Trạng thái đăng nhập",
    "Ngày tạo",
    "Đăng nhập cuối",
    "Thao tác",
  ];

  const centerIndexes = [6, 7, 8, 9];

  const cellClass =
    "overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px] px-3 py-2";
  const cellCenterClass = "text-center " + cellClass;
  const cellLeftClass = "text-left " + cellClass;

  return (
    <div className="border rounded-xl overflow-x-auto shadow-inner">
      <Table className="min-w-[900px]">
        <TableHeader className="sticky top-0 z-10 shadow-sm">
          <TableRow className="border-b">
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            {headers.map((header, index) => (
              <TableHead
                key={index}
                className={
                  centerIndexes.includes(index)
                    ? "text-center px-3 py-2"
                    : "text-left px-3 py-2"
                }
              >
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: expectedRowCount }).map((_, index) => {
            const user = users[index];
            const isEven = index % 2 === 0;

            if (!user) {
              return (
                <TableRow
                  key={`empty-${index}`}
                  className={`bg-white dark:bg-muted/20 select-none`}
                  style={{ height: 49, opacity: 0, pointerEvents: "none" }}
                  aria-hidden="true"
                >
                  <TableCell className={cellCenterClass}>
                    {/* Ẩn số thứ tự */}
                  </TableCell>
                  {headers.map((_, i) => (
                    <TableCell
                      key={i}
                      className={
                        centerIndexes.includes(i)
                          ? cellCenterClass
                          : cellLeftClass
                      }
                    />
                  ))}
                </TableRow>
              );
            }

            return (
              <TableRow
                key={user.id}
                className={`transition-all border-b border-gray-400 ${
                  isEven ? "bg-gray-200" : "bg-white dark:bg-muted/20"
                }`}
              >
                <TableCell className={cellCenterClass}>
                  {startIndex + index + 1}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.employeeCode || "-"}
                >
                  {user.employeeCode
                    ? user.employeeCode.length > 16
                      ? user.employeeCode.slice(0, 15) + "…"
                      : user.employeeCode
                    : "-"}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.username || "-"}
                >
                  {user.username || "-"}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.fullName || "-"}
                >
                  {user.fullName
                    ? user.fullName.length > 16
                      ? user.fullName.slice(0, 15) + "…"
                      : user.fullName
                    : "-"}
                </TableCell>
                <TableCell className={cellLeftClass} title={user.email || "-"}>
                  {user.email
                    ? user.email.length > 16
                      ? user.email.slice(0, 15) + "…"
                      : user.email
                    : "-"}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.departments?.map((d) => d.name).join(", ")}
                >
                  {user.departments?.map((d) => d.name).join(", ").length > 24
                    ? user.departments
                        ?.map((d) => d.name)
                        .join(", ")
                        .slice(0, 23) + "…"
                    : user.departments?.map((d) => d.name).join(", ")}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.roles?.map((r) => r.name).join(", ")}
                >
                  {user.roles?.map((r) => r.name).join(", ").length > 24
                    ? user.roles
                        ?.map((r) => r.name)
                        .join(", ")
                        .slice(0, 23) + "…"
                    : user.roles?.map((r) => r.name).join(", ")}
                </TableCell>
                <TableCell className={cellCenterClass}>
                  {user.isBlock ? (
                    <span className="text-red-500 font-semibold">Bị khóa</span>
                  ) : (
                    <span className="text-green-600 font-semibold">
                      Bình thường
                    </span>
                  )}
                </TableCell>
                <TableCell className={cellCenterClass}>
                  {user.status === "active" ? (
                    <span className="text-green-600 font-semibold">
                      Đang hoạt động
                    </span>
                  ) : (
                    <span className="text-gray-500 font-semibold">
                      Ngưng hoạt động
                    </span>
                  )}
                </TableCell>
                <TableCell
                  className={cellCenterClass}
                  title={
                    user.createdAt
                      ? new Date(user.createdAt).toLocaleString("vi-VN")
                      : "-"
                  }
                >
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleString("vi-VN")
                    : "-"}
                </TableCell>
                <TableCell
                  className={cellCenterClass}
                  title={
                    user.lastLogin
                      ? new Date(user.lastLogin).toLocaleString("vi-VN")
                      : "-"
                  }
                >
                  {user.lastLogin
                    ? new Date(user.lastLogin).toLocaleString("vi-VN")
                    : "-"}
                </TableCell>
                <TableCell className={cellCenterClass}>
                  {showRestore ? (
                    <Button
                      variant="add"
                      size="sm"
                      onClick={() => onRestore && onRestore(user.id)}
                    >
                      Khôi phục
                    </Button>
                  ) : (
                    (currentUserRole === "ADMIN" ||
                      currentUserRole.startsWith("MANAGER")) && (
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="edit"
                          size="sm"
                          onClick={() => onEdit(user)}
                        >
                          Sửa
                        </Button>
                        {currentUserRole === "ADMIN" && (
                          <>
                            <Button
                              variant="delete"
                              size="sm"
                              onClick={() => onDelete(user.id)}
                            >
                              Xóa
                            </Button>
                            <Switch
                              checked={user.isBlock}
                              onCheckedChange={(checked) => {
                                if (
                                  typeof onRequestBlockConfirm === "function"
                                ) {
                                  onRequestBlockConfirm(user, checked);
                                } else {
                                  onToggleBlock(user, checked);
                                }
                              }}
                              className="ml-2"
                              aria-label="Khóa tài khoản"
                              title={
                                user.isBlock
                                  ? "Mở khóa tài khoản"
                                  : "Khóa tài khoản"
                              }
                            />
                          </>
                        )}
                      </div>
                    )
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
