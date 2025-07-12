import React, { useState } from "react";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { WrenchIcon, EyeIcon } from "@heroicons/react/24/outline";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import axios from "axios";
import { getAccessToken } from "@/lib/auth";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import EditDebtConfigModal from "./EditDebtConfigModal";
import DebtDetailDialog from "./DebtDetailDialog";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface DebtSettingManagementProps {
  data: any[];
  page: number;
  pageSize: number;
  onToggle?: (id: string, type: 'send' | 'repeat', value: boolean, updatedRow?: any) => void;
  onDelete?: (id: string) => void;
  onEdit?: (row: any) => void;
  onRefresh?: () => void;
  onShowAlert?: (alert: { type: 'success' | 'error'; message: string }) => void;
  onUpdateRow?: (id: string, updatedData: any) => void; // Thêm prop mới để cập nhật row
}

export default function DebtSettingManagement({
  data,
  page,
  pageSize,
  onToggle,
  onDelete,
  onEdit,
  onRefresh,
  onShowAlert,
  onUpdateRow,
}: DebtSettingManagementProps) {
  // Map loại khách hàng
  const customerTypeMap: Record<string, string> = {
    cash: "Tiền Mặt",
    fixed: "Cố Định",
    "non-fixed": "Không Cố Định",
  };
  // Map thứ trong tuần
  const weekdayMap = [
    null, // 0 không dùng
    null, // 1 không dùng
    "Thứ 2",
    "Thứ 3",
    "Thứ 4",
    "Thứ 5",
    "Thứ 6",
    "Thứ 7",
  ];
  // Map trạng thái nhắc nợ sang tiếng Việt và màu sắc
  const remindStatusMap: Record<string, { label: string; color: string }> = {
    "Debt Reported": { label: "Đã Gửi Báo Nợ", color: "text-blue-600 font-semibold" },
    "First Reminder": { label: "Đã Gửi Nhắc Lần 1", color: "text-orange-500 font-semibold" },
    "Second Reminder": { label: "Đã Gửi Nhắc Lần 2", color: "text-yellow-600 font-semibold" },
    "Customer Responded": { label: "Khách Đã Phản Hồi", color: "text-green-600 font-semibold" },
    "Not Sent": { label: "Chưa Gửi", color: "text-gray-500 font-semibold" },
    "Error Send": { label: "Gửi Không Thành Công", color: "text-red-600 font-semibold" },
  };
  
  // State để lưu data local để cập nhật ngay lập tức
  const [localData, setLocalData] = useState(data);
  
  // Cập nhật localData khi data props thay đổi
  React.useEffect(() => {
    setLocalData(data);
  }, [data]);
  
  // Tạo mảng đủ số dòng (dữ liệu thật + dòng ảo) từ localData
  const rows = Array.from({ length: pageSize }).map((_, idx) => localData[idx] || null);
  const [confirmState, setConfirmState] = useState({
    open: false,
    type: undefined as 'send' | 'repeat' | undefined,
    row: null as any,
    nextValue: false,
    loading: false, // Thêm loading state
  });
  const [alert, setAlert] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  // State xác nhận xóa
  const [deleteState, setDeleteState] = useState<{ open: boolean; row: any }>({ open: false, row: null });
  const [editModal, setEditModal] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  // State cho dialog xem chi tiết công nợ
  const [detailDialog, setDetailDialog] = useState<{ open: boolean; debtConfigId: string | null }>({ open: false, debtConfigId: null });

  // Debug useEffect để theo dõi state changes
  React.useEffect(() => {
    console.log('🔍 detailDialog state changed:', detailDialog);
  }, [detailDialog]);

  // Utility function để format date an toàn
  const formatUpdateInfo = (actor: any, lastUpdateAt: any) => {
    try {
      if (!actor || !lastUpdateAt) return null;
      
      let updateDate: Date;
      
      // Thử parse theo nhiều format
      if (typeof lastUpdateAt === 'string') {
        // Thử parse ISO string trước
        updateDate = new Date(lastUpdateAt);
        
        // Nếu không thành công, thử parse DD/MM/YYYY HH:mm:ss
        if (isNaN(updateDate.getTime())) {
          const parts = lastUpdateAt.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2}):(\d{1,2})/);
          if (parts) {
            const [, day, month, year, hour, minute, second] = parts;
            updateDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute), parseInt(second));
          }
        }
      } else {
        updateDate = new Date(lastUpdateAt);
      }
      
      if (isNaN(updateDate.getTime())) {
        console.warn('Invalid date detected:', lastUpdateAt);
        return `${actor.fullName} đã thay đổi`;
      }
      
      return `${actor.fullName} đã thay đổi lúc ${updateDate.toLocaleDateString('vi-VN')} ${updateDate.toLocaleTimeString('vi-VN')}`;
    } catch (error) {
      console.error('formatUpdateInfo error:', error, 'lastUpdateAt:', lastUpdateAt);
      return actor?.fullName ? `${actor.fullName} đã thay đổi` : null;
    }
  };

  const handleSwitchClick = (row: any, type: 'send' | 'repeat', nextValue: boolean) => {
    setConfirmState({ open: true, type, row, nextValue, loading: false });
  };

  const handleConfirm = async () => {
    if (!confirmState.row) return;
    
    // Cập nhật local state ngay lập tức để UI không bị lag
    const optimisticUpdate = (rowId: string, updates: any) => {
      setLocalData(prevData => 
        prevData.map(item => 
          item?.id === rowId ? { ...item, ...updates } : item
        )
      );
    };
    
    try {
      const token = getAccessToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      let res, updatedRow;
      
      if (confirmState.type === 'send') {
        // Optimistic update
        const updates = { 
          is_send: confirmState.nextValue,
          // Nếu tắt send thì cũng tắt repeat
          ...(confirmState.nextValue ? {} : { is_repeat: false })
        };
        optimisticUpdate(confirmState.row.id, updates);
        
        res = await axios.patch(`${API_BASE_URL}/debt-configs/${confirmState.row.id}/toggle-send`, { is_send: confirmState.nextValue }, { headers });
        updatedRow = res.data;
        
        // Cập nhật với data thực từ server (bao gồm actor, last_update_at)
        optimisticUpdate(confirmState.row.id, updatedRow);
        
        if (onToggle) onToggle(confirmState.row.id, 'send', confirmState.nextValue, updatedRow);
        if (onUpdateRow) onUpdateRow(confirmState.row.id, updatedRow);
        setAlert({ type: 'success', message: 'Cập nhật trạng thái gửi tự động thành công!' });
        
      } else if (confirmState.type === 'repeat') {
        // Optimistic update
        optimisticUpdate(confirmState.row.id, { is_repeat: confirmState.nextValue });
        
        res = await axios.patch(`${API_BASE_URL}/debt-configs/${confirmState.row.id}/toggle-repeat`, { is_repeat: confirmState.nextValue }, { headers });
        updatedRow = res.data;
        
        // Cập nhật với data thực từ server (bao gồm actor, last_update_at)
        optimisticUpdate(confirmState.row.id, updatedRow);
        
        if (onToggle) onToggle(confirmState.row.id, 'repeat', confirmState.nextValue, updatedRow);
        if (onUpdateRow) onUpdateRow(confirmState.row.id, updatedRow);
        setAlert({ type: 'success', message: 'Cập nhật trạng thái gửi nhắc lại thành công!' });
      }
    } catch (e) {
      // Rollback optimistic update on error
      setLocalData(data);
      setAlert({ type: 'error', message: 'Cập nhật trạng thái thất bại!' });
    }
    setConfirmState({ open: false, type: undefined, row: null, nextValue: false, loading: false });
  };

  const handleCancel = () => setConfirmState({ open: false, type: undefined, row: null, nextValue: false, loading: false });
  const handleEdit = (row: any) => {
    setEditModal({ open: true, id: row.id });
  };
  // Mở dialog xem chi tiết công nợ
  const handleViewDetail = (row: any) => {
    console.log('🔍 handleViewDetail called with row:', row);
    setDetailDialog({ open: true, debtConfigId: row.id });
  };

  return (
    <div className="border rounded-xl shadow-inner overflow-x-auto always-show-scrollbar">
      <Table className="min-w-[900px]">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            <TableHead className="px-3 py-2 text-left">Mã Khách Hàng</TableHead>
            <TableHead className="px-3 py-2 text-left">Tên Zalo Khách</TableHead>
            <TableHead className="px-3 py-2 text-center">Tổng Phiếu</TableHead>
            <TableHead className="px-3 py-2 text-center">Tổng Số Nợ</TableHead>
            <TableHead className="px-3 py-2 text-center">Loại KH</TableHead>
            <TableHead className="px-3 py-2 text-center">Lịch Nhắc Nợ</TableHead>
            <TableHead className="px-3 py-2 text-center">Ngày Đã Nhắc</TableHead>
            <TableHead className="px-3 py-2 text-center">Trạng Thái Nhắc Nợ</TableHead>
            <TableHead className="px-3 py-2 text-center">Ghi Chú</TableHead>
            <TableHead className="px-3 py-2 text-center">Trạng Thái Hoạt Động</TableHead>
            <TableHead className="px-3 py-2 text-center">Thao Tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row, idx) => {
            const isEven = idx % 2 === 0;
            const isEmployeeNull = row && row.employee == null;
            const rowClass = isEmployeeNull
              ? "bg-[#ffd6d6]" // đỏ nhạt đậm hơn
              : isEven
              ? "bg-white"
              : "bg-gray-200";
            if (!row) {
              // Dòng ảo
              return (
                <TableRow key={`empty-${idx}`} className={rowClass + " select-none"} style={{ height: 49, opacity: 0.7, pointerEvents: "none" }} aria-hidden="true">
                  {Array.from({ length: 12 }).map((_, i) => (
                    <TableCell key={i} />
                  ))}
                </TableRow>
              );
            }
            // Map dữ liệu từ backend
            const debtLogs = Array.isArray(row.debt_logs) ? row.debt_logs : [];
            // Tổng số phiếu và tổng số nợ lấy từ backend
            const totalBills = typeof row.total_bills !== 'undefined' ? row.total_bills : 0;
            const totalDebt = typeof row.total_debt !== 'undefined' && row.total_debt !== null
              ? Number(row.total_debt).toLocaleString('vi-VN')
              : "--";
            // Map loại khách hàng
            const customerType = customerTypeMap[row.customer_type] || row.customer_type || "--";
            // Lịch nhắc nợ
            let remindSchedule = "--";
            if (typeof row.gap_day === 'number') {
              if (row.gap_day === 0) remindSchedule = "Nhắc Liên Tục";
              else if (row.gap_day > 0) remindSchedule = `Cách ${row.gap_day} ngày`;
            } else if (Array.isArray(row.day_of_week) && row.day_of_week.length > 0) {
              // Sắp xếp tăng dần cho đẹp
              remindSchedule = row.day_of_week
                .slice()
                .sort((a: number, b: number) => a - b)
                .map((d: number) => weekdayMap[d] || `Thứ ${d}`)
                .join(", ");
            }
            // Ngày đã nhắc: lấy từ send_last_at, hiển thị ngày và giờ xuống 2 dòng
            let lastRemindedDateStr = "--";
            let lastRemindedDateTime = null;
            if (row.send_last_at) {
              const dateObj = new Date(row.send_last_at);
              lastRemindedDateStr = dateObj.toLocaleDateString('vi-VN');
              lastRemindedDateTime = dateObj.toLocaleTimeString('vi-VN');
            }
            // Trạng thái nhắc nợ: lấy remind_status của log mới nhất
            let remindStatus = "--";
            let remindStatusColor = "";
            if (debtLogs.length) {
              const latestLog = debtLogs.reduce((latest: any, log: any) => {
                if (!latest) return log;
                return new Date(log.created_at) > new Date(latest.created_at) ? log : latest;
              }, null);
              if (latestLog?.remind_status && remindStatusMap[latestLog.remind_status]) {
                remindStatus = remindStatusMap[latestLog.remind_status].label;
                remindStatusColor = remindStatusMap[latestLog.remind_status].color;
              } else {
                remindStatus = latestLog?.remind_status || "--";
                remindStatusColor = "";
              }
            }
            if (isEmployeeNull) {
              return (
                <Tooltip key={row.id || idx}>
                  <TooltipTrigger asChild>
                    <TableRow className={rowClass} style={{ cursor: 'pointer' }}>
                      <TableCell className="text-center px-3 py-2">{(page - 1) * pageSize + idx + 1}</TableCell>
                      <TableCell className="px-3 py-2 text-left">{row.customer_code}</TableCell>
                      <TableCell className="px-3 py-2 text-left">{row.customer_name || "--"}</TableCell>
                      <TableCell className="px-3 py-2 text-center">{typeof row.total_bills !== 'undefined' ? row.total_bills : 0}</TableCell>
                      <TableCell className="px-3 py-2 text-center">{typeof row.total_debt !== 'undefined' && row.total_debt !== null ? Number(row.total_debt).toLocaleString('vi-VN') : "--"}</TableCell>
                      <TableCell className="px-3 py-2 text-center">{customerTypeMap[row.customer_type] || row.customer_type || "--"}</TableCell>
                      <TableCell className="px-3 py-2 text-center">{remindSchedule}</TableCell>
                      <TableCell className="px-3 py-2 text-center">{row.send_last_at ? (<><div>{lastRemindedDateStr}</div><div className="text-xs text-gray-500">{lastRemindedDateTime}</div></>) : <span className="text-gray-400 italic">Chưa Nhắc Nợ</span>}</TableCell>
                      <TableCell className={`px-3 py-2 text-center ${remindStatusColor}`}>{remindStatus}</TableCell>
                      <TableCell className="px-3 py-2 text-center">
                        {(() => {
                          const updateInfo = formatUpdateInfo(row.actor, row.last_update_at);
                          return updateInfo ? (
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="inline-flex items-center justify-center relative">
                                  <WrenchIcon className="w-5 h-5 text-blue-500 cursor-pointer" />
                                  <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow"></span>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>{updateInfo}</TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="text-gray-400">--</span>
                          );
                        })()}
                      </TableCell>
                      <TableCell className="px-3 py-2 text-center"><span className={row.is_send && row.is_repeat ? "font-semibold text-green-600" : row.is_send && !row.is_repeat ? "font-semibold text-blue-600" : !row.is_send && row.is_repeat ? "font-semibold text-orange-500" : "font-semibold text-gray-500"}>{row.is_send && row.is_repeat ? "Đang Hoạt Động" : row.is_send && !row.is_repeat ? "Chỉ Nhắc Nợ" : !row.is_send && row.is_repeat ? "Chỉ Gửi Sau 15 Phút" : "Không Gửi Nhắc"}</span></TableCell>
                      <TableCell className="px-3 py-2 text-center flex items-center justify-center gap-2">
                        {/* Icon con mắt xem chi tiết */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              className="p-1 rounded hover:bg-gray-100 focus:outline-none cursor-pointer"
                              aria-label="Xem Chi Tiết Công Nợ"
                              onClick={() => handleViewDetail(row)}
                            >
                              <EyeIcon className="w-5 h-5 text-blue-500" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent>Xem Chi Tiết Công Nợ</TooltipContent>
                        </Tooltip>
                        {/* Switch gửi tự động */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={!!row.is_send}
                                onClick={e => {
                                  e.preventDefault();
                                  handleSwitchClick(row, 'send', !row.is_send);
                                }}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Bật/Tắt gửi tự động</TooltipContent>
                        </Tooltip>
                        {/* Switch gửi nhắc lại */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span>
                              <Switch
                                checked={!!row.is_repeat}
                                disabled={!row.is_send}
                                onClick={e => {
                                  e.preventDefault();
                                  if (row.is_send) handleSwitchClick(row, 'repeat', !row.is_repeat);
                                }}
                              />
                            </span>
                          </TooltipTrigger>
                          <TooltipContent>Bật/Tắt gửi nhắc lại</TooltipContent>
                        </Tooltip>
                        <Button size="sm" variant="edit" onClick={() => handleEdit(row)}>Sửa</Button>
                        <Button size="sm" variant="delete" onClick={() => setDeleteState({ open: true, row })}>Xóa</Button>
                      </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent>Mã khách hàng không trùng so với phiếu nợ</TooltipContent>
                </Tooltip>
              );
            }
            return (
              <TableRow key={row.id || idx} className={rowClass}>
                <TableCell className="text-center px-3 py-2">{(page - 1) * pageSize + idx + 1}</TableCell>
                <TableCell className="px-3 py-2 text-left">{row.customer_code}</TableCell>
                <TableCell className="px-3 py-2 text-left">{row.customer_name || "--"}</TableCell>
                <TableCell className="px-3 py-2 text-center">{totalBills}</TableCell>
                <TableCell className="px-3 py-2 text-center">{totalDebt}</TableCell>
                <TableCell className="px-3 py-2 text-center">{customerType}</TableCell>
                <TableCell className="px-3 py-2 text-center">{remindSchedule}</TableCell>
                <TableCell className="px-3 py-2 text-center">
                  {row.send_last_at ? (
                    <>
                      <div>{lastRemindedDateStr}</div>
                      <div className="text-xs text-gray-500">{lastRemindedDateTime}</div>
                    </>
                  ) : <span className="text-gray-400 italic">Chưa Nhắc Nợ</span>}
                </TableCell>
                <TableCell className={`px-3 py-2 text-center ${remindStatusColor}`}>{remindStatus}</TableCell>
                <TableCell className="px-3 py-2 text-center">
                  {(() => {
                    const updateInfo = formatUpdateInfo(row.actor, row.last_update_at);
                    return updateInfo ? (
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="inline-flex items-center justify-center relative">
                            <WrenchIcon className="w-5 h-5 text-blue-500 cursor-pointer" />
                            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full border border-white shadow"></span>
                          </span>
                        </TooltipTrigger>
                        <TooltipContent>{updateInfo}</TooltipContent>
                      </Tooltip>
                    ) : (
                      <span className="text-gray-400">--</span>
                    );
                  })()}
                </TableCell>
                <TableCell className="px-3 py-2 text-center">
                  {/* Trạng thái hoạt động */}
                  <span
                    className={
                      row.is_send && row.is_repeat
                        ? "font-semibold text-green-600"
                        : row.is_send && !row.is_repeat
                        ? "font-semibold text-blue-600"
                        : !row.is_send && row.is_repeat
                        ? "font-semibold text-orange-500"
                        : "font-semibold text-gray-500"
                    }
                  >
                    {row.is_send && row.is_repeat
                      ? "Đang Hoạt Động"
                      : row.is_send && !row.is_repeat
                      ? "Chỉ Nhắc Nợ"
                      : !row.is_send && row.is_repeat
                      ? "Chỉ Gửi Sau 15 Phút"
                      : "Không Gửi Nhắc"}
                  </span>
                </TableCell>
                <TableCell className="px-3 py-2 text-center flex items-center justify-center gap-2">
                  {/* Icon con mắt xem chi tiết */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button 
                        type="button" 
                        className="p-1 rounded hover:bg-gray-100 focus:outline-none cursor-pointer" 
                        aria-label="Xem Chi Tiết Công Nợ"
                        onClick={() => handleViewDetail(row)}
                      >
                        <EyeIcon className="w-5 h-5 text-blue-500" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>Xem Chi Tiết Công Nợ</TooltipContent>
                  </Tooltip>
                  {/* Switch gửi tự động */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Switch
                          checked={!!row.is_send}
                          onClick={e => {
                            e.preventDefault();
                            handleSwitchClick(row, 'send', !row.is_send);
                          }}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Bật/Tắt gửi tự động</TooltipContent>
                  </Tooltip>
                  {/* Switch gửi nhắc lại */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Switch
                          checked={!!row.is_repeat}
                          disabled={!row.is_send}
                          onClick={e => {
                            e.preventDefault();
                            if (row.is_send) handleSwitchClick(row, 'repeat', !row.is_repeat);
                          }}
                        />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>Bật/Tắt gửi nhắc lại</TooltipContent>
                  </Tooltip>
                  <Button size="sm" variant="edit" onClick={() => handleEdit(row)}>Sửa</Button>
                  <Button size="sm" variant="delete" onClick={() => setDeleteState({ open: true, row })}>Xóa</Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      <ConfirmDialog
        isOpen={confirmState.open}
        title={confirmState.type === 'send' ? 'Xác nhận thay đổi gửi tự động' : 'Xác nhận thay đổi gửi nhắc lại'}
        message={`Bạn có chắc chắn muốn ${confirmState.nextValue ? 'bật' : 'tắt'} chức năng ${confirmState.type === 'send' ? 'gửi tự động' : 'gửi nhắc lại'} cho khách hàng này?`}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      <ConfirmDialog
        isOpen={deleteState.open}
        title="Xác nhận xóa cấu hình công nợ"
        message="Bạn có chắc chắn muốn xóa cấu hình này?"
        onConfirm={async () => {
          if (!deleteState.row) return;
          try {
            const token = getAccessToken();
            const headers = token ? { Authorization: `Bearer ${token}` } : {};
            await axios.delete(`${API_BASE_URL}/debt-configs/${deleteState.row.id}`, { headers });
            setAlert({ type: 'success', message: 'Xóa thành công!' });
            if (onDelete) onDelete(deleteState.row.id);
          } catch {
            setAlert({ type: 'error', message: 'Xóa thất bại!' });
          }
          setDeleteState({ open: false, row: null });
        }}
        onCancel={() => setDeleteState({ open: false, row: null })}
      />
      <EditDebtConfigModal
        open={editModal.open}
        debtConfigId={editModal.id}
        onClose={() => setEditModal({ open: false, id: null })}
        onSave={(success) => {
          setEditModal({ open: false, id: null });
          if (success && typeof onRefresh === "function") onRefresh();
        }}
        onShowAlert={onShowAlert}
      />
      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      {/* Dialog xem chi tiết công nợ */}
      <DebtDetailDialog
        open={detailDialog.open}
        onClose={() => setDetailDialog({ open: false, debtConfigId: null })}
        debtConfigId={detailDialog.debtConfigId}
        onShowAlert={onShowAlert}
      />
    </div>
  );
}
