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
import { Toggle } from "@/components/ui/toggle";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Volume2, VolumeX, MessageSquare, MessageSquareOff, Eye } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import ZaloLinkStatusTimeline from "@/components/user/ZaloLinkStatusTimeline";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface ZaloTableProps {
  users: User[];
  onToggleListening: (user: User, checked: boolean) => void;
  onToggleAutoMessage: (user: User, checked: boolean) => void;
  onRequestListeningConfirm?: (user: User, checked: boolean, onConfirm?: () => void) => void;
  onRequestAutoMessageConfirm?: (user: User, checked: boolean, onConfirm?: () => void) => void;
  startIndex?: number;
  expectedRowCount?: number;
  listeningStates?: Record<number, boolean>;
  autoMessageStates?: Record<number, boolean>;
  onSelectUser?: (user: User) => void;
}

export default React.memo(function ZaloTable({
  users,
  onToggleListening,
  onToggleAutoMessage,
  startIndex = 0,
  expectedRowCount = users.length,
  onRequestListeningConfirm,
  onRequestAutoMessageConfirm,
  listeningStates: listeningStatesProp = {},
  autoMessageStates = {},
  onSelectUser,
}: ZaloTableProps) {
  // State để trigger animation mỗi lần bật
  const [listeningAnim, setListeningAnim] = useState<Record<number, boolean>>({});
  const [autoMessageAnim, setAutoMessageAnim] = useState<Record<number, boolean>>({});

  const { currentUser } = useCurrentUser();
  const isAdmin = currentUser?.roles?.some(
    (role: any) =>
      typeof role === "string"
        ? role.toLowerCase() === "admin"
        : (role.code || role.name || "").toLowerCase() === "admin"
  );
  
  

  // State để lưu trạng thái listening thực tế từ API
  const [listeningStates, setListeningStates] = useState<Record<number, boolean>>(listeningStatesProp);

  // Fetch trạng thái listening từ API cho từng user
  useEffect(() => {
    let isMounted = true;
    const fetchListeningStates = async () => {
      const results: Record<number, boolean> = {};
      await Promise.all(
        users.map(async (user) => {
          if (!user?.id || user.zaloLinkStatus !== 1) return;
          // Lọc phòng ban có server_ip hợp lệ
          const departmentWithIp = user.departments?.find(dep => !!dep?.server_ip);
          const serverIp = departmentWithIp?.server_ip;
          if (!serverIp) return;
          try {
            const res = await fetch(`http://${serverIp}:4000/api/workers/${user.id}`);
            if (res.status === 404) {
              // Đọc body để tránh lỗi fetch bị log ra console
              await res.text();
              results[user.id] = false;
              return;
            }
            if (!res.ok) {
              // Đọc body để tránh lỗi fetch bị log ra console
              await res.text();
              return;
            }
            const data = await res.json();
            results[user.id] = data?.worker?.status === 'running';
          } catch (e) {
            results[user.id] = false;
          }
        })
      );
      if (isMounted) setListeningStates((prev) => ({ ...prev, ...results }));
    };
    fetchListeningStates();
    return () => {
      isMounted = false;
    };
  }, [users]);

  const handleListeningToggle = React.useCallback(async (user: User, pressed: boolean) => {
    if (pressed) {
      setListeningAnim(prev => ({ ...prev, [user.id]: true }));
      setTimeout(() => {
        setListeningAnim(prev => ({ ...prev, [user.id]: false }));
      }, 500);
    }
    // Lọc phòng ban có server_ip hợp lệ
    const departmentWithIp = user.departments?.find(dep => !!dep?.server_ip);
    const serverIp = departmentWithIp?.server_ip;
    if (!serverIp) {
      setListeningStates((prev) => ({ ...prev, [user.id]: false }));
      return;
    }
    try {
      if (pressed) {
        // Bật: lấy credentials rồi gọi API start
        const credRes = await fetch(`http://${serverIp}:4000/api/users/${user.id}/credentials`);
        if (!credRes.ok) throw new Error('Không lấy được credentials');
        const credData = await credRes.json();
        const { user_data_dir_path, decryption_key } = credData;
        if (!user_data_dir_path || !decryption_key) throw new Error('Thiếu thông tin credentials');
        const startRes = await fetch(`http://${serverIp}:4000/api/workers/${user.id}/start`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: user.username,
            decryptionKey: decryption_key,
            userDataDir: user_data_dir_path
          })
        });
        if (!startRes.ok) {
          const errText = await startRes.text();
          setListeningStates((prev) => ({ ...prev, [user.id]: false }));
          return;
        }
        setListeningStates((prev) => ({ ...prev, [user.id]: true }));
      } else {
        // Tắt: gọi API stop
        try {
          const stopRes = await fetch(`http://${serverIp}:4000/api/workers/${user.id}/stop`, {
            method: 'POST'
          });
          setListeningStates((prev) => ({ ...prev, [user.id]: false }));
        } catch (e) {
          setListeningStates((prev) => ({ ...prev, [user.id]: false }));
        }
      }
    } catch (e) {
      setListeningStates((prev) => ({ ...prev, [user.id]: false }));
    }
    // Không gọi confirm ở đây nữa
    onToggleListening(user, pressed);
  }, [onToggleListening]);

  // Hàm trung gian: chỉ gọi handleListeningToggle sau khi confirm
  const handleListeningToggleRequest = (user: User, pressed: boolean) => {
    if (typeof onRequestListeningConfirm === "function") {
      onRequestListeningConfirm(user, pressed, () => handleListeningToggle(user, pressed));
    } else {
      handleListeningToggle(user, pressed);
    }
  };

  const handleAutoMessageToggle = (user: User, pressed: boolean) => {
    if (pressed) {
      setAutoMessageAnim(prev => ({ ...prev, [user.id]: true }));
      setTimeout(() => {
        setAutoMessageAnim(prev => ({ ...prev, [user.id]: false }));
      }, 500);
    }
    if (typeof onRequestAutoMessageConfirm === "function") {
      // Nếu có confirm dialog, gọi confirm callback
      onRequestAutoMessageConfirm(user, pressed);
    } else {
      // Nếu không có confirm dialog, gọi toggle callback trực tiếp
      onToggleAutoMessage(user, pressed);
    }
  };

  const headers = [
    "Tên Người Dùng",
    "Trạng Thái Liên Kết",
    "Tên Zalo",
    "Giới Tính",
  "Thao Tác",
  ];

  const centerIndexes = [0, 1, 3, 4];

  const cellClass =
    "overflow-hidden text-ellipsis whitespace-nowrap max-w-[160px] px-3 py-2";
  const cellCenterClass = "text-center " + cellClass;
  const cellLeftClass = "text-left " + cellClass;

  const getZaloLinkStatusDisplay = (status: number) => {
    switch (status) {
      case 0:
        return (
          <span className="text-gray-500 font-semibold">Chưa liên kết</span>
        );
      case 1:
        return (
          <span className="text-green-600 font-semibold">Đã liên kết</span>
        );
      case 2:
        return (
          <span className="text-red-500 font-semibold">Lỗi liên kết</span>
        );
      default:
        return (
          <span className="text-gray-500 font-semibold">Không xác định</span>
        );
    }
  };

  // Modal state
  const [logUser, setLogUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);

  const openLogModal = (user: User) => {
    setLogUser(user);
    setOpen(true);
  };

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
          {users.map((user, index) => {
            const isEven = index % 2 === 0;
            return (
              <TableRow
                key={user.id}
                className={`transition-all border-b border-gray-400 cursor-pointer hover:bg-blue-50 dark:hover:bg-muted ${
                  isEven ? "bg-gray-200" : "bg-white dark:bg-muted/20"
                }`}
                onClick={() => onSelectUser && onSelectUser(user)}
              >
                <TableCell className={cellCenterClass}>
                  {startIndex + index + 1}
                </TableCell>
                <TableCell
                  className={cellCenterClass}
                  title={user.fullName || "-"}
                >
                  {user.fullName
                    ? user.fullName.length > 20
                      ? user.fullName.slice(0, 19) + "…"
                      : user.fullName
                    : "-"}
                </TableCell>
                <TableCell className={cellCenterClass}>
                  {getZaloLinkStatusDisplay(user.zaloLinkStatus || 0)}
                </TableCell>
                <TableCell
                  className={cellLeftClass}
                  title={user.zaloName || "-"}
                >
                  {user.zaloName
                    ? user.zaloName.length > 20
                      ? user.zaloName.slice(0, 19) + "…"
                      : user.zaloName
                    : "-"}
                </TableCell>
                <TableCell className={cellCenterClass}>
                  {user.zaloGender || "-"}
                </TableCell>
                <TableCell className={cellLeftClass}>
                  <div className="flex items-center justify-center gap-3">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); openLogModal(user); }}
                        className="h-8 w-8 flex items-center justify-center rounded border bg-background hover:bg-muted"
                        aria-label="Xem lịch sử liên kết"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Lịch sử liên kết</p>
                    </TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                    <Toggle
                      pressed={listeningStates[user.id] || false}
                      onPressedChange={(pressed: boolean) => handleListeningToggleRequest(user, pressed)}
                      variant="outline"
                      size="sm"
                      className={`toggle-btn h-8 w-8 p-0 relative${listeningAnim[user.id] ? ' toggle-activated-anim' : ''}${listeningStates[user.id] ? ' toggle-activated-anim' : ''}`}
                      aria-label="Bật/tắt lắng nghe"
                      disabled={user.zaloLinkStatus !== 1 || !isAdmin}
                    >
                      {listeningStates[user.id] ? (
                      <Volume2 className="h-4 w-4 text-green-600 animate-bell-scale" />
                      ) : (
                      <VolumeX className="h-4 w-4 text-gray-400" />
                      )}
                    </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>
                      {isAdmin
                      ? listeningStates[user.id]
                        ? "Tắt lắng nghe"
                        : "Bật lắng nghe"
                      : "Chỉ Admin mới thao tác"}
                    </p>
                    </TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                    <Toggle
                      pressed={autoMessageStates[user.id] || false}
                      onPressedChange={(pressed) => handleAutoMessageToggle(user, pressed)}
                      variant="outline"
                      size="sm"
                      className={`toggle-btn h-8 w-8 p-0 relative${autoMessageAnim[user.id] ? ' toggle-activated-anim toggle-blue' : ''}${autoMessageStates[user.id] ? ' toggle-activated-anim toggle-blue' : ''}`}
                      aria-label="Bật/tắt tự động nhắn tin"
                      disabled={user.zaloLinkStatus !== 1 || !isAdmin}
                    >
                      {autoMessageStates[user.id] ? (
                      <MessageSquare className="h-4 w-4 text-blue-600 animate-bell-scale" />
                      ) : (
                      <MessageSquareOff className="h-4 w-4 text-gray-400" />
                      )}
                    </Toggle>
                    </TooltipTrigger>
                    <TooltipContent>
                    <p>
                      {isAdmin
                      ? autoMessageStates[user.id]
                        ? "Tắt tự động nhắn tin"
                        : "Bật tự động nhắn tin"
                      : "Chỉ Admin mới thao tác"}
                    </p>
                    </TooltipContent>
                  </Tooltip>
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Lịch sử liên kết Zalo {logUser?.fullName ? `- ${logUser.fullName}` : ''}</DialogTitle>
          </DialogHeader>
          {logUser && (
            <div className="mt-2">
              <ZaloLinkStatusTimeline userId={logUser.id} autoRefreshMs={10000} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
});
