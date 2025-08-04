import React, { useState, useEffect, useCallback, Fragment } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { getAccessToken } from "@/lib/auth";
import type { DebtLog } from "@/types";
import { DebtSocket } from "@/components/socket/DebtSocket";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "";

interface DebtDetailDialogProps {
  open: boolean;
  onClose: () => void;
  debtConfigId: string | null;
  onShowAlert?: (alert: { type: "success" | "error"; message: string }) => void;
  isHistory?: boolean;
}

export default function DebtDetailDialog({
  open,
  onClose,
  debtConfigId,
  onShowAlert,
  isHistory = false,
}: DebtDetailDialogProps) {
  const [debtDetail, setDebtDetail] = useState<DebtLog | null>(null);
  const [loading, setLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'info' | 'messages'>('info');

  const fetchDebtDetail = async () => {
    if (!open || !debtConfigId) {
      setDebtDetail(null);
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const apiUrl = isHistory
        ? `${API_BASE_URL}/debt-histories/${debtConfigId}/detail`
        : `${API_BASE_URL}/debt-configs/${debtConfigId}/detail`;

      const response = await axios.get(apiUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });

      let debtData = null;

      if (response.data && response.data.success && response.data.data) {
        debtData = response.data.data;
      } else if (response.data && !response.data.success && response.data) {
        debtData = response.data;
      } else if (response.data) {
        debtData = response.data;
      }

      if (debtData) {
        setDebtDetail(debtData);
      } else {
        console.warn("No valid data found in API response");
        if (onShowAlert) {
          onShowAlert({
            type: "error",
            message: "Không thể tải chi tiết công nợ - dữ liệu không hợp lệ",
          });
        }
      }
    } catch (error) {
      console.error("Error fetching debt detail:", error);
      if (onShowAlert) {
        onShowAlert({ type: "error", message: "Lỗi khi tải chi tiết công nợ" });
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchDebtDetailCallback = useCallback(fetchDebtDetail, [
    open,
    debtConfigId,
    isHistory,
    onShowAlert,
  ]);

  useEffect(() => {
    fetchDebtDetailCallback();
  }, [fetchDebtDetailCallback]);

  useEffect(() => {
    if (!open) {
      setDebtDetail(null);
      setLoading(false);
      setShowImageModal(false);
      setActiveTab('info');
    }
  }, [open]);

  const handleDebtLogUpdate = useCallback(
    (data: any) => {
      const events = Array.isArray(data?.events) ? data.events : [data];
      interface DebtLogUpdateEvent {
        debt_config_id?: string | number;
        refresh_request?: boolean;
        [key: string]: any;
      }

      const typedEvents: DebtLogUpdateEvent[] = events as DebtLogUpdateEvent[];

      if (
        typedEvents.some(
          (event: DebtLogUpdateEvent) =>
            event?.debt_config_id &&
            debtConfigId &&
            event.debt_config_id.toString() === debtConfigId.toString() &&
            event.refresh_request
        )
      ) {
        fetchDebtDetail();
      }
    },
    [debtConfigId, fetchDebtDetail, onShowAlert]
  );

  const getRemindStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string; bg: string; icon: string }> = {
      "Debt Reported": {
        label: "Đã Gửi Báo Nợ",
        color: "text-blue-700",
        bg: "bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200",
        icon: "📋"
      },
      "First Reminder": {
        label: "Đã Gửi Nhắc Lần 1",
        color: "text-orange-700",
        bg: "bg-gradient-to-r from-orange-50 to-orange-100 border-orange-200",
        icon: "⏰"
      },
      "Second Reminder": {
        label: "Đã Gửi Nhắc Lần 2",
        color: "text-yellow-700",
        bg: "bg-gradient-to-r from-yellow-50 to-yellow-100 border-yellow-200",
        icon: "⚠️"
      },
      "Customer Responded": {
        label: "Khách Đã Phản Hồi",
        color: "text-green-700",
        bg: "bg-gradient-to-r from-green-50 to-green-100 border-green-200",
        icon: "✅"
      },
      "Not Sent": {
        label: "Chưa Gửi",
        color: "text-gray-600",
        bg: "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200",
        icon: "⏸️"
      },
      "Error Send": {
        label: "Gửi Không Thành Công",
        color: "text-red-700",
        bg: "bg-gradient-to-r from-red-50 to-red-100 border-red-200",
        icon: "❌"
      },
      "Sent But Not Verified": {
        label: "Đã Gửi, Cần Xác Thực",
        color: "text-pink-700",
        bg: "bg-gradient-to-r from-pink-50 to-pink-100 border-pink-200",
        icon: "🔍"
      },
    };
    return (
      statusMap[status] || { 
        label: status || "--", 
        color: "text-gray-600",
        bg: "bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200",
        icon: "❓"
      }
    );
  };

  const getCustomerTypeDisplay = (type: string) => {
    const typeMap: Record<string, { label: string; icon: string }> = {
      cash: { label: "Tiền Mặt", icon: "💵" },
      fixed: { label: "Cố Định", icon: "🏢" },
      "non-fixed": { label: "Không Cố Định", icon: "👤" },
    };
    return typeMap[type] || { label: type || "--", icon: "❓" };
  };

  const get = (obj: any, path: string, fallback: any = "--") => {
    if (!obj) return fallback;

    const value = path.split(".").reduce((acc, key) => {
      if (acc === null || acc === undefined) return fallback;
      return acc[key];
    }, obj);

    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    if (
      typeof value === "string" &&
      value.includes("T") &&
      value.includes("Z")
    ) {
      try {
        const date = new Date(value);
        if (!isNaN(date.getTime())) {
          return date.toLocaleString("vi-VN");
        }
      } catch {
        return value;
      }
    }

    return value;
  };

  const getGenderDisplay = (gender: string) => {
    const genderMap: Record<string, { label: string; icon: string; color: string }> = {
      Chị: { label: "Nữ", icon: "👩", color: "text-pink-600" },
      Anh: { label: "Nam", icon: "👨", color: "text-blue-600" },
      Nữ: { label: "Nữ", icon: "👩", color: "text-pink-600" },
      Nam: { label: "Nam", icon: "👨", color: "text-blue-600" },
    };
    return genderMap[gender] || { label: gender || "--", icon: "👤", color: "text-gray-600" };
  };

  const getImageSrc = (imageUrl: string | null) => {
    if (!imageUrl) return null;

    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      return imageUrl;
    }

    try {
      if (imageUrl.length > 100 && !imageUrl.includes("://")) {
        return `data:image/jpeg;base64,${imageUrl}`;
      }
    } catch (error) {
      console.error("Error processing image data:", error);
    }

    return imageUrl;
  };

  // Custom Loading Component
  const LoadingSpinner = () => (
    <div className="relative">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-spin"></div>
      <div className="relative bg-white rounded-full w-12 h-12 flex items-center justify-center">
        <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full animate-pulse"></div>
      </div>
    </div>
  );

  // Enhanced Info Card Component
  const InfoCard = ({ label, value, icon, color = "text-gray-800" }: { 
    label: string; 
    value: any; 
    icon?: string; 
    color?: string; 
  }) => (
    <div className="group relative overflow-hidden bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-lg hover:border-blue-200 transition-all duration-300 hover:-translate-y-1">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/50 to-purple-50/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative">
        <div className="flex items-center gap-2 text-xs font-semibold text-gray-500 mb-2">
          {icon && <span className="text-sm">{icon}</span>}
          {label}
        </div>
        <div className={`text-base font-semibold ${color} group-hover:text-blue-700 transition-colors duration-300`}>
          {value}
        </div>
      </div>
    </div>
  );

  // Enhanced Message Card Component
  const MessageCard = ({ 
    title, 
    time, 
    message, 
    icon, 
    bgClass, 
    borderClass 
  }: { 
    title: string; 
    time?: string; 
    message: string; 
    icon: string; 
    bgClass: string; 
    borderClass: string; 
  }) => (
    <div className={`group relative overflow-hidden rounded-xl ${bgClass} border-2 ${borderClass} p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1`}>
      <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
      <div className="relative">
        <div className="flex items-center gap-3 mb-3">
          <div className="text-xl animate-pulse">{icon}</div>
          <div>
            <h4 className="font-bold text-gray-800 text-sm">{title}</h4>
            {time && (
              <div className="text-xs text-gray-600 mt-1">
                <span className="inline-block w-1 h-1 bg-gray-400 rounded-full mr-2"></span>
                {time}
              </div>
            )}
          </div>
        </div>
        <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 text-gray-700 whitespace-pre-line text-sm leading-relaxed shadow-sm border border-white/50">
          {message || "Chưa có nội dung"}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <Fragment>
        <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[85vh] !max-h-[85vh] !p-0 overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-100">
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent animate-pulse"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-3xl animate-bounce">✨</span>
                    Chi Tiết Công Nợ Ngày Hiện Tại
                  </h2>
                  <p className="text-blue-100 mt-2 opacity-90">
                    Đang tải thông tin chi tiết với hiệu ứng siêu đỉnh...
                  </p>
                </div>
              </div>
            </DialogTitle>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <LoadingSpinner />
                <p className="text-gray-700 mt-6 text-lg font-medium animate-pulse">
                  Đang tải dữ liệu siêu wow...
                </p>
                <div className="flex justify-center gap-1 mt-4">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
            <div className="border-t bg-gradient-to-r from-gray-50 to-blue-50 p-4 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }

  if (open && !loading && !debtDetail) {
    return (
      <Fragment>
        <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[85vh] !max-h-[85vh] !p-0 overflow-hidden bg-gradient-to-br from-red-50 to-pink-100">
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-red-500 via-pink-600 to-red-700 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                <div className="relative">
                  <h2 className="text-2xl font-bold flex items-center gap-3">
                    <span className="text-3xl animate-pulse">⚠️</span>
                    Chi Tiết Công Nợ
                  </h2>
                  <p className="text-red-100 mt-2">
                    Không thể tải thông tin chi tiết
                  </p>
                </div>
              </div>
            </DialogTitle>
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="text-center">
                <div className="text-6xl mb-6 animate-bounce">😔</div>
                <p className="text-gray-700 text-lg font-medium">Không có dữ liệu để hiển thị</p>
                <p className="text-gray-500 text-sm mt-2">Vui lòng thử lại sau</p>
              </div>
            </div>
            <div className="border-t bg-gradient-to-r from-gray-50 to-red-50 p-4 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-700 hover:to-pink-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1"
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }

  const statusInfo = getRemindStatusDisplay(debtDetail?.remind_status || "");
  const customerType = getCustomerTypeDisplay(debtDetail?.customer_type || "");
  const genderInfo = getGenderDisplay(debtDetail?.customer_gender || "");

  return (
    <>
      <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
      <Dialog open={open} onOpenChange={onClose}>
        {open ? (
          <DialogContent className="!w-[95vw] !max-w-[95vw] !h-[90vh] !max-h-[90vh] !p-0 overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50">
            {/* Spectacular Header */}
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 text-white p-6 relative overflow-hidden">
                <div className="absolute inset-0">
                  <div className="absolute inset-0 bg-gradient-to-r from-white/10 via-transparent to-white/5 animate-pulse"></div>
                  <div className="absolute top-0 left-0 w-32 h-32 bg-white/5 rounded-full -translate-x-16 -translate-y-16 animate-spin"></div>
                  <div className="absolute bottom-0 right-0 w-24 h-24 bg-white/5 rounded-full translate-x-12 translate-y-12 animate-ping"></div>
                </div>
                <div className="relative">
                  <h2 className="text-3xl font-bold flex items-center gap-4">
                    <span className="text-4xl animate-bounce">💎</span>
                    Chi Tiết Công Nợ
                  </h2>
                  <p className="text-blue-100 mt-2 text-lg opacity-90 flex items-center gap-2">
                    <span className="animate-pulse">✨</span>
                    Thông tin chi tiết với giao diện cực kỳ ấn tượng
                  </p>
                </div>
              </div>
            </DialogTitle>

            {/* Tab Navigation */}
            <div className="bg-white border-b border-gray-200 px-6 py-4">
              <div className="flex gap-4">
                <button
                  onClick={() => setActiveTab('info')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === 'info'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform -translate-y-1'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  <span className="text-lg">👤</span>
                  Thông Tin & Hình Ảnh
                </button>
                <button
                  onClick={() => setActiveTab('messages')}
                  className={`px-6 py-3 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 ${
                    activeTab === 'messages'
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg transform -translate-y-1'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                  }`}
                >
                  <span className="text-lg">💬</span>
                  Tin Nhắn Chi Tiết
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto bg-gradient-to-br from-gray-50 to-blue-50">
              <div className="p-6">
                {activeTab === 'info' ? (
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    {/* Left: Image Section */}
                    <div className="space-y-6">
                      <div className="bg-white rounded-2xl p-6 shadow-xl border border-gray-200">
                        <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-3">
                          <span className="text-2xl">🖼️</span>
                          Hình Ảnh Công Nợ
                        </h3>

                        <div className="mb-6">
                          {debtDetail?.image_url ? (
                            <div
                              className="relative group cursor-zoom-in overflow-hidden rounded-xl"
                              onClick={() => setShowImageModal(true)}
                            >
                              <img
                                src={getImageSrc(debtDetail.image_url) || ""}
                                alt="Ảnh công nợ"
                                className="w-full h-auto max-h-[400px] object-cover transition-transform duration-500 group-hover:scale-105"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display = "none";
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-4">
                                <span className="text-white text-lg font-semibold bg-black/30 px-4 py-2 rounded-full backdrop-blur-sm">
                                  🔍 Click để phóng to
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full h-[400px] rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                              <div className="text-center text-gray-500">
                                <div className="text-8xl mb-4 animate-pulse">📷</div>
                                <p className="text-xl font-semibold">Không có ảnh</p>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div className={`inline-flex items-center gap-3 px-4 py-3 rounded-xl border-2 ${statusInfo.bg} font-semibold text-sm shadow-sm`}>
                          <span className="text-xl animate-pulse">{statusInfo.icon}</span>
                          <span className={statusInfo.color}>
                            {statusInfo.label}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right: Customer Info */}
                    <div className="space-y-4">
                      <h3 className="font-bold text-xl text-gray-800 mb-6 flex items-center gap-3">
                        <span className="text-2xl">📋</span>
                        Thông Tin Khách Hàng
                      </h3>

                      <div className="grid grid-cols-1 gap-4">
                        <InfoCard
                          label="Mã khách hàng"
                          value={debtDetail?.customer_code || "--"}
                          icon="🏷️"
                          color="text-purple-700"
                        />
                        
                        <InfoCard
                          label="Tên khách hàng"
                          value={debtDetail?.customer_name || "--"}
                          icon="👤"
                          color="text-blue-700"
                        />

                        <InfoCard
                          label="Loại khách hàng"
                          value={
                            <div className="flex items-center gap-2">
                              <span>{customerType.icon}</span>
                              {customerType.label}
                            </div>
                          }
                          color="text-green-700"
                        />

                        <InfoCard
                          label="Giới tính"
                          value={
                            <div className="flex items-center gap-2">
                              <span>{genderInfo.icon}</span>
                              <span className={genderInfo.color}>{genderInfo.label}</span>
                            </div>
                          }
                        />

                        {debtDetail?.actor && (
                          <InfoCard
                            label="Người chỉnh sửa cuối"
                            value={debtDetail.actor.fullName}
                            icon="✏️"
                            color="text-indigo-700"
                          />
                        )}

                        {debtDetail?.employee && (
                          <InfoCard
                            label="Nhân viên công nợ"
                            value={debtDetail.employee.fullName}
                            icon="👨‍💼"
                            color="text-orange-700"
                          />
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Messages Tab */
                  <div className="space-y-6">
                    <h3 className="font-bold text-2xl text-gray-800 mb-8 flex items-center gap-3">
                      <span className="text-3xl">💬</span>
                      Tin Nhắn Chi Tiết
                    </h3>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <MessageCard
                        title="Tin nhắn báo nợ"
                        time={debtDetail?.send_time ? get({ tempField: debtDetail.send_time }, "tempField", "--") : "--"}
                        message={debtDetail?.debt_message || "--"}
                        icon="📋"
                        bgClass="bg-gradient-to-br from-blue-50 to-blue-100"
                        borderClass="border-blue-300"
                      />

                      <MessageCard
                        title="Nhắc nợ lần 1"
                        time={debtDetail?.remind_time_1 ? get({ tempField: debtDetail.remind_time_1 }, "tempField", "Chưa nhắc") : "Chưa nhắc"}
                        message={debtDetail?.remind_message_1 || "--"}
                        icon="⏰"
                        bgClass="bg-gradient-to-br from-yellow-50 to-yellow-100"
                        borderClass="border-yellow-300"
                      />

                      <MessageCard
                        title="Nhắc nợ lần 2"
                        time={debtDetail?.remind_time_2 ? get({ tempField: debtDetail.remind_time_2 }, "tempField", "Chưa nhắc") : "Chưa nhắc"}
                        message={debtDetail?.remind_message_2 || "--"}
                        icon="⚠️"
                        bgClass="bg-gradient-to-br from-orange-50 to-orange-100"
                        borderClass="border-orange-300"
                      />

                      <MessageCard
                        title="Tin nhắn nhắc kinh doanh"
                        message={debtDetail?.business_remind_message || "--"}
                        icon="💼"
                        bgClass="bg-gradient-to-br from-green-50 to-green-100"
                        borderClass="border-green-300"
                      />

                      <div className="lg:col-span-2">
                        <MessageCard
                          title="Thông báo lỗi (nếu có)"
                          message={debtDetail?.error_msg || "Không có lỗi"}
                          icon="❌"
                          bgClass="bg-gradient-to-br from-red-50 to-red-100"
                          borderClass="border-red-300"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Spectacular Footer */}
            <div className="border-t bg-gradient-to-r from-slate-100 via-blue-50 to-purple-50 p-4 flex justify-between items-center">
              <div className="text-sm text-gray-600 flex items-center gap-2">
              </div>
              <Button
                onClick={onClose}
                className="bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-700 hover:from-indigo-700 hover:via-purple-700 hover:to-blue-800 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 flex items-center gap-2"
              >
                <span>🚀</span>
                Đóng
              </Button>
            </div>

            {/* Enhanced Image Modal */}
            {showImageModal && (
              <div
                className="fixed inset-0 z-[99999] flex items-center justify-center backdrop-blur-md"
                style={{
                  background: 'linear-gradient(135deg, rgba(0,0,0,0.8) 0%, rgba(30,41,59,0.9) 50%, rgba(0,0,0,0.8) 100%)'
                }}
                onClick={() => setShowImageModal(false)}
              >
                <div
                  className="relative bg-white/10 backdrop-blur-xl rounded-2xl p-6 border border-white/20 shadow-2xl"
                  style={{ width: "90vw", maxWidth: "1200px" }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    className="absolute -top-4 -right-4 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-full w-12 h-12 flex items-center justify-center text-xl font-bold shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 z-10"
                    onClick={() => setShowImageModal(false)}
                    type="button"
                  >
                    ✕
                  </button>
                  
                  <div className="overflow-y-auto max-h-[80vh] rounded-xl">
                    <img
                      src={getImageSrc(debtDetail?.image_url ?? null) || ""}
                      alt="Zoom ảnh công nợ"
                      className="w-full h-auto rounded-xl shadow-2xl"
                    />
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
