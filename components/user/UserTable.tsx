"use client";

import React from "react";
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
import { MoreVertical } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  onResetPassword?: (userId: number) => void;
}

export default React.memo(function UserTable({
  users,
  currentUserRole,
  currentUserId,
  onEdit,
  onDelete,
  onToggleBlock,
  startIndex = 0,
  expectedRowCount = users.length,
  onRequestBlockConfirm,
  showRestore,
  onRestore,
  onResetPassword,
}: UserTableProps) {
  const headers = [
    "Mã NV",
    "Tên đăng nhập",
    "Tên đầy đủ",
    "Tên hiển thị",
    "Email",
    "Phòng ban",
    "Vai trò",
    "Trạng thái tài khoản",
    "Trạng thái hoạt động",
    "Ngày tạo",
    "Đăng nhập cuối",
    "Thời gian hoạt động cuối cùng",
    "Thao tác",
  ];

  const centerIndexes = [6, 7, 8, 9];

  const cellClass =
    "overflow-hidden px-3 py-2";
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
                      ? user.employeeCode
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
                      ? user.fullName
                      : user.fullName
                    : "-"}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.nickName || "-"}
                >
                  {user.nickName
                    ? user.nickName.length > 16
                      ? user.nickName
                      : user.nickName
                    : "-"}
                </TableCell>
                <TableCell className={cellLeftClass} title={user.email || "-"}>
                  {user.email
                    ? user.email.length > 16
                      ? user.email
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
                      Online
                    </span>
                  ) : (
                    <span className="text-gray-500 font-semibold">
                      Offline
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
                <TableCell
                  className={cellCenterClass}
                  title={
                    user.lastOnlineAt
                      ? new Date(user.lastOnlineAt).toLocaleString("vi-VN")
                      : "-"
                  }
                >
                  {user.lastOnlineAt
                    ? new Date(user.lastOnlineAt).toLocaleString("vi-VN")
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
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button variant="ghost" size="icon" className="p-1"><MoreVertical size={18} /></Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-40 p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => onEdit(user)}
                            >
                              Sửa
                            </Button>
                            {currentUserRole === "ADMIN" && 
                             !user.roles?.some(role => role.name === "admin") && 
                             user.id !== currentUserId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                onClick={() => onDelete(user.id)}
                              >
                                Xóa
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => onResetPassword && onResetPassword(user.id)}
                            >
                              Reset pass
                            </Button>
                            {!user.roles?.some(role => role.name === "admin") && 
                             user.id !== currentUserId && (
                              <div className="flex items-center w-full px-2 py-1">
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
                                  className="mr-2"
                                  aria-label="Khóa tài khoản"
                                  title={
                                    user.isBlock
                                      ? "Mở khóa tài khoản"
                                      : "Khóa tài khoản"
                                  }
                                />
                                <span className="text-xs">
                                  {user.isBlock ? "Mở khóa" : "Khóa"}
                                </span>
                              </div>
                            )}
                          </PopoverContent>
                        </Popover>
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
});
