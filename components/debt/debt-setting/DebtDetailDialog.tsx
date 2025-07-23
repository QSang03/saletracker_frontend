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
  debtConfigId: string | null; // Chỉ truyền ID thay vì data
  onShowAlert?: (alert: { type: "success" | "error"; message: string }) => void;
}

export default function DebtDetailDialog({
  open,
  onClose,
  debtConfigId,
  onShowAlert,
}: DebtDetailDialogProps) {
  // State để lưu data và loading
  const [debtDetail, setDebtDetail] = useState<DebtLog | null>(null);
  const [loading, setLoading] = useState(false);

  const [showImageModal, setShowImageModal] = useState(false);

  const fetchDebtDetail = async () => {
    if (!open || !debtConfigId) {
      setDebtDetail(null);
      return;
    }

    setLoading(true);
    try {
      const token = getAccessToken();
      const response = await axios.get(
        `${API_BASE_URL}/debt-configs/${debtConfigId}/detail`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Xử lý nhiều format response khác nhau
      let debtData = null;

      if (response.data && response.data.success && response.data.data) {
        // Format 1: { success: true, data: {...} }
        debtData = response.data.data;
      } else if (response.data && !response.data.success && response.data) {
        // Format 2: Direct data object
        debtData = response.data;
      } else if (response.data) {
        // Format 3: Fallback to response.data
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

  // Fetch data khi dialog mở và có debtConfigId
  // Memoize fetchDebtDetail to avoid unnecessary re-creations
  const fetchDebtDetailCallback = useCallback(fetchDebtDetail, [
    open,
    debtConfigId,
    onShowAlert,
  ]);

  useEffect(() => {
    fetchDebtDetailCallback();
  }, [fetchDebtDetailCallback]);

  // Reset state khi đóng dialog
  useEffect(() => {
    if (!open) {
      setDebtDetail(null);
      setLoading(false);
      setShowImageModal(false);
    }
  }, [open]);

  const handleDebtLogUpdate = useCallback(
    (data: any) => {

      // Kiểm tra xem có phải cùng debtConfigId không
      if (
        data?.debt_config_id &&
        debtConfigId &&
        data.debt_config_id.toString() === debtConfigId.toString() &&
        data.refresh_request
      ) {
        fetchDebtDetail();
      }
    },
    [debtConfigId, fetchDebtDetail, onShowAlert]
  );

  // Show loading state when loading
  if (loading) {
    return (
      <Fragment>
        <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[85vh] !max-h-[85vh] !p-0 overflow-hidden">
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-6">
                <h2 className="text-2xl font-bold">Chi Tiết Công Nợ</h2>
                <p className="text-blue-100 mt-1">
                  Đang tải thông tin chi tiết...
                </p>
              </div>
            </DialogTitle>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Đang tải dữ liệu...</p>
              </div>
            </div>
            <div className="border-t bg-gray-50 p-4 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-8 py-2 rounded-lg shadow-md transition-colors"
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }

  // Show error state when no data, only if dialog is open and not loading
  if (open && !loading && !debtDetail) {
    return (
      <Fragment>
        <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
        <Dialog open={open} onOpenChange={onClose}>
          <DialogContent className="!w-[90vw] !max-w-[90vw] !h-[85vh] !max-h-[85vh] !p-0 overflow-hidden">
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-red-600 to-red-800 text-white p-6">
                <h2 className="text-2xl font-bold">Chi Tiết Công Nợ</h2>
                <p className="text-red-100 mt-1">
                  Không thể tải thông tin chi tiết
                </p>
              </div>
            </DialogTitle>
            <div className="flex-1 flex items-center justify-center p-6">
              <div className="text-center">
                <div className="text-red-500 text-4xl mb-4">⚠️</div>
                <p className="text-gray-600">Không có dữ liệu để hiển thị</p>
              </div>
            </div>
            <div className="border-t bg-gray-50 p-4 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-red-600 hover:bg-red-700 text-white font-medium px-8 py-2 rounded-lg shadow-md transition-colors"
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </Fragment>
    );
  }

  // Map trạng thái nhắc nợ sang tiếng Việt và màu sắc
  const getRemindStatusDisplay = (status: string) => {
    const statusMap: Record<string, { label: string; color: string }> = {
      "Debt Reported": {
        label: "Đã Gửi Báo Nợ",
        color: "text-blue-600 font-semibold",
      },
      "First Reminder": {
        label: "Đã Gửi Nhắc Lần 1",
        color: "text-orange-500 font-semibold",
      },
      "Second Reminder": {
        label: "Đã Gửi Nhắc Lần 2",
        color: "text-yellow-600 font-semibold",
      },
      "Customer Responded": {
        label: "Khách Đã Phản Hồi",
        color: "text-green-600 font-semibold",
      },
      "Not Sent": { label: "Chưa Gửi", color: "text-gray-500 font-semibold" },
      "Error Send": {
        label: "Gửi Không Thành Công",
        color: "text-red-600 font-semibold",
      },
    };
    return (
      statusMap[status] || { label: status || "--", color: "text-gray-500" }
    );
  };

  // Map loại khách hàng
  const getCustomerTypeDisplay = (type: string) => {
    const typeMap: Record<string, string> = {
      cash: "Tiền Mặt",
      fixed: "Cố Định",
      "non-fixed": "Không Cố Định",
    };
    return typeMap[type] || type || "--";
  };

  // Helper to safely get nested fields
  const get = (obj: any, path: string, fallback: any = "--") => {
    if (!obj) return fallback;

    const value = path.split(".").reduce((acc, key) => {
      if (acc === null || acc === undefined) return fallback;
      return acc[key];
    }, obj);

    // Check for null, undefined, empty string
    if (value === null || value === undefined || value === "") {
      return fallback;
    }

    // Format date nếu giá trị là timestamp ISO
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

  // Map giới tính từ Chị/Anh sang Nữ/Nam
  const getGenderDisplay = (gender: string) => {
    const genderMap: Record<string, string> = {
      Chị: "Nữ",
      Anh: "Nam",
      Nữ: "Nữ",
      Nam: "Nam",
    };
    return genderMap[gender] || gender || "--";
  };

  // Helper function to format image source (handle both URL and base64)
  const getImageSrc = (imageUrl: string | null) => {
    if (!imageUrl) return null;

    // If it's already a data URI or HTTP URL, return as is
    if (imageUrl.startsWith("data:") || imageUrl.startsWith("http")) {
      return imageUrl;
    }

    // If it looks like base64 data, format it as a data URI
    try {
      // Simple check for base64 data - if it's a long string without protocol
      if (imageUrl.length > 100 && !imageUrl.includes("://")) {
        return `data:image/jpeg;base64,${imageUrl}`;
      }
    } catch (error) {
      console.error("Error processing image data:", error);
    }

    return imageUrl;
  };

  // Icon helper
  const StatusIcon = ({ status }: { status: string }) => {
    if (
      status?.toLowerCase().includes("thành công") ||
      status?.toLowerCase().includes("đã gửi")
    )
      return (
        <span className="inline-block w-3 h-3 rounded-full bg-green-500 mr-2" />
      );
    if (
      status?.toLowerCase().includes("không thành công") ||
      status?.toLowerCase().includes("lỗi")
    )
      return (
        <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-2" />
      );
    if (status?.toLowerCase().includes("chưa gửi"))
      return (
        <span className="inline-block w-3 h-3 rounded-full bg-gray-400 mr-2" />
      );
    return (
      <span className="inline-block w-3 h-3 rounded-full bg-yellow-400 mr-2" />
    );
  };

  return (
    <>
      <DebtSocket onDebtLogUpdate={handleDebtLogUpdate} />
      <Dialog open={open} onOpenChange={onClose}>
        {open ? (
          <DialogContent className="!w-[85vw] !max-w-[85vw] !h-[80vh] !max-h-[80vh] !p-0 overflow-hidden">
            {/* DialogTitle for accessibility */}
            <DialogTitle asChild>
              <div className="bg-gradient-to-r from-blue-600 to-blue-800 text-white p-4">
                <h2 className="text-xl font-bold">Chi Tiết Công Nợ</h2>
                <p className="text-blue-100 mt-1 text-sm">
                  Thông tin chi tiết về cấu hình công nợ khách hàng
                </p>
              </div>
            </DialogTitle>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 p-4">
                {/* Left: Ảnh và thông tin cơ bản */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-center mb-4">
                    <h3 className="font-semibold text-lg text-gray-800 mb-3">
                      Ảnh công nợ
                    </h3>

                    <div className="mb-4">
                      {debtDetail?.image_url ? (
                        <div className="mb-4">
                          {debtDetail?.image_url ? (
                            <div
                              className="relative w-full max-w-[600px] mx-auto cursor-zoom-in"
                              onClick={() => setShowImageModal(true)}
                            >
                              <img
                                src={getImageSrc(debtDetail.image_url) || ""}
                                alt="Ảnh công nợ"
                                className="w-full h-auto max-h-[500px] rounded-lg border-2 border-blue-200 shadow-md object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).style.display =
                                    "none";
                                }}
                              />
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity bg-black/20 rounded-lg">
                                <span className="text-white text-lg font-semibold">
                                  Click để phóng to
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="w-full max-w-[600px] mx-auto h-[500px] rounded-lg border-2 border-gray-300 border-dashed flex items-center justify-center bg-gray-100">
                              <div className="text-center text-gray-500">
                                <div className="text-6xl mb-3">📷</div>
                                <p className="text-lg">Không có ảnh</p>
                              </div>
                            </div>
                          )}

                          {/* Thêm modal zoom ảnh ngay sau đây */}
                          {showImageModal && (
                            <div
                              className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm"
                              onClick={() => setShowImageModal(false)}
                            >
                              <div
                                className="relative bg-transparent flex flex-col items-center justify-center"
                                style={{ width: "90vw", maxWidth: "1300px" }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                {/* Header và nút đóng luôn hiển thị */}
                                <button
                                  className="absolute bg-black/60 text-white rounded-full px-3 py-1 text-sm"
                                  onClick={() => setShowImageModal(false)}
                                  type="button"
                                  style={{ zIndex: 10, right: "-100px", top: "20px", cursor: "pointer" }}
                                >
                                  Đóng
                                </button>
                                {/* Scroll phần ảnh nếu quá dài */}
                                <div
                                  className="overflow-y-auto w-full"
                                  style={{
                                    maxHeight: "80vh",
                                    paddingTop: "10px",
                                    paddingBottom: "50px",
                                    scrollbarWidth: "none",
                                    msOverflowStyle: "none",
                                  }}
                                >
                                  <img
                                    src={
                                      getImageSrc(debtDetail.image_url) || ""
                                    }
                                    alt="Zoom ảnh công nợ"
                                    className="w-full h-auto rounded-xl shadow-2xl"
                                    style={{
                                      display: "block",
                                      margin: "auto",
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="w-full max-w-[600px] mx-auto h-[500px] rounded-lg border-2 border-gray-300 border-dashed flex items-center justify-center bg-gray-100">
                          <div className="text-center text-gray-500">
                            <div className="text-6xl mb-3">📷</div>
                            <p className="text-lg">Không có ảnh</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Thông tin khách hàng */}
                  <div className="space-y-2 text-left">
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="font-semibold text-gray-600 text-sm">
                        Mã khách hàng
                      </div>
                      <div className="text-base font-medium text-gray-800">
                        {debtDetail?.customer_code || "--"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="font-semibold text-gray-600 text-sm">
                        Tên khách hàng
                      </div>
                      <div className="text-base font-medium text-gray-800">
                        {debtDetail?.customer_name || "--"}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="font-semibold text-gray-600 text-sm">
                        Loại khách hàng
                      </div>
                      <div className="text-base font-medium text-gray-800">
                        {getCustomerTypeDisplay(
                          debtDetail?.customer_type || ""
                        )}
                      </div>
                    </div>
                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="font-semibold text-gray-600 text-sm">
                        Giới tính khách hàng
                      </div>
                      <div className="text-base font-medium text-gray-800">
                        {getGenderDisplay(debtDetail?.customer_gender || "")}
                      </div>
                    </div>

                    <div className="bg-white rounded-lg p-3 shadow-sm">
                      <div className="font-semibold text-gray-600 text-sm">
                        Tình trạng nhắc nợ
                      </div>
                      <div className="flex items-center">
                        <StatusIcon status={debtDetail?.remind_status || ""} />
                        <span
                          className={`text-sm ${
                            getRemindStatusDisplay(
                              debtDetail?.remind_status || ""
                            ).color
                          }`}
                        >
                          {
                            getRemindStatusDisplay(
                              debtDetail?.remind_status || ""
                            ).label
                          }
                        </span>
                      </div>
                    </div>
                    {/* Thông tin người thực hiện */}
                    {debtDetail?.actor && (
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="font-semibold text-gray-600 text-sm">
                          Người chỉnh sửa cuối cùng
                        </div>
                        <div className="text-sm font-medium text-green-700">
                          {debtDetail.actor.fullName}
                        </div>
                      </div>
                    )}
                    {debtDetail?.employee && (
                      <div className="bg-white rounded-lg p-3 shadow-sm">
                        <div className="font-semibold text-gray-600 text-sm">
                          Nhân viên công nợ
                        </div>
                        <div className="text-sm font-medium text-purple-700">
                          {debtDetail.employee.fullName}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Tin nhắn chi tiết */}
                <div className="space-y-4">
                  {/* Tin nhắn báo nợ */}
                  <div className="bg-blue-50 rounded-lg p-3 border-l-4 border-blue-400">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
                      <span className="inline-block w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                      Tin nhắn báo nợ
                    </h4>
                    <div className="mb-2">
                      <div className="text-xs text-gray-600 mb-1">
                        Thời gian báo nợ:
                      </div>
                      <div className="text-sm font-medium text-blue-700">
                        {debtDetail?.send_time
                          ? get(
                              { tempField: debtDetail.send_time },
                              "tempField",
                              "--"
                            )
                          : "--"}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 text-gray-700 whitespace-pre-line text-sm leading-relaxed shadow-sm">
                      {debtDetail?.debt_message || "--"}
                    </div>
                  </div>

                  {/* Tin nhắc nợ lần 1 */}
                  <div className="bg-yellow-50 rounded-lg p-3 border-l-4 border-yellow-400">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
                      <span className="inline-block w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      Nhắc nợ lần 1
                    </h4>
                    <div className="mb-2">
                      <div className="text-xs text-gray-600 mb-1">
                        Thời gian nhắc:
                      </div>
                      <div className="text-sm font-medium text-yellow-700">
                        {debtDetail?.remind_time_1
                          ? get(
                              { tempField: debtDetail.remind_time_1 },
                              "tempField",
                              "Chưa nhắc"
                            )
                          : "Chưa nhắc"}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 text-gray-700 whitespace-pre-line text-sm leading-relaxed shadow-sm">
                      {debtDetail?.remind_message_1 || "--"}
                    </div>
                  </div>

                  {/* Tin nhắc nợ lần 2 */}
                  <div className="bg-orange-50 rounded-lg p-3 border-l-4 border-orange-400">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
                      <span className="inline-block w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                      Nhắc nợ lần 2
                    </h4>
                    <div className="mb-2">
                      <div className="text-xs text-gray-600 mb-1">
                        Thời gian nhắc:
                      </div>
                      <div className="text-sm font-medium text-orange-700">
                        {debtDetail?.remind_time_2
                          ? get(
                              { tempField: debtDetail.remind_time_2 },
                              "tempField",
                              "Chưa nhắc"
                            )
                          : "Chưa nhắc"}
                      </div>
                    </div>
                    <div className="bg-white rounded p-3 text-gray-700 whitespace-pre-line text-sm leading-relaxed shadow-sm">
                      {debtDetail?.remind_message_2 || "--"}
                    </div>
                  </div>

                  {/* Tin nhắn nhắc kinh doanh */}
                  <div className="bg-green-50 rounded-lg p-3 border-l-4 border-green-400">
                    <h4 className="font-semibold text-gray-800 mb-2 flex items-center text-sm">
                      <span className="inline-block w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                      Tin nhắn nhắc kinh doanh
                    </h4>
                    <div className="bg-white rounded p-3 text-gray-700 whitespace-pre-line text-sm leading-relaxed shadow-sm">
                      {debtDetail?.business_remind_message || "--"}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t bg-gray-50 p-3 flex justify-end">
              <Button
                onClick={onClose}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium px-6 py-2 rounded-lg shadow-md transition-colors"
              >
                Đóng
              </Button>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </>
  );
}
