"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle, AlertCircle, RefreshCw } from "lucide-react";

interface SystemConfig {
  enabled: boolean;
  cycleDays: number;
  executionTime: string;
  messageTemplate: string;
  allowCustomMessage: boolean;
}

interface SystemStatusBannerProps {
  systemConfig: SystemConfig | null;
  configLoading: boolean;
  onRefresh: () => void;
}

const SystemStatusBanner: React.FC<SystemStatusBannerProps> = ({
  systemConfig,
  configLoading,
  onRefresh,
}) => {
  return (
    <div
      className={`p-4 rounded-xl border-2 mb-4 ${
        configLoading
          ? "bg-gray-50 border-gray-200"
          : systemConfig?.allowCustomMessage
          ? "bg-green-50 border-green-200"
          : "bg-blue-50 border-blue-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {configLoading ? (
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600"></div>
          ) : systemConfig?.allowCustomMessage ? (
            <CheckCircle className="h-6 w-6 text-green-600" />
          ) : (
            <AlertCircle className="h-6 w-6 text-blue-600" />
          )}
          <div>
            <h4
              className={`font-semibold ${
                configLoading
                  ? "text-gray-800"
                  : systemConfig?.allowCustomMessage
                  ? "text-green-800"
                  : "text-blue-800"
              }`}
            >
              {configLoading
                ? "Đang tải cấu hình hệ thống..."
                : systemConfig?.allowCustomMessage
                ? "Hệ thống cho phép tùy chỉnh lời chào"
                : "Hệ thống sử dụng lời chào mặc định"}
            </h4>
            <p
              className={`text-sm ${
                configLoading
                  ? "text-gray-600"
                  : systemConfig?.allowCustomMessage
                  ? "text-green-600"
                  : "text-blue-600"
              }`}
            >
              {configLoading
                ? "Vui lòng chờ trong giây lát..."
                : systemConfig?.allowCustomMessage
                ? "Bạn có thể nhập lời chào riêng cho từng khách hàng. Nếu để trống, hệ thống sẽ dùng lời chào mặc định."
                : "Tất cả khách hàng sẽ nhận lời chào mặc định từ hệ thống."}
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={configLoading}
          className="border-gray-300 text-gray-600 hover:bg-gray-50"
        >
          <span className="flex items-start justify-center">
            <RefreshCw
              className={`h-4 w-4 mr-1 ${configLoading ? "animate-spin" : ""}`}
            />
            {configLoading ? "Đang tải..." : "Làm mới"}
          </span>
        </Button>
      </div>
    </div>
  );
};

export default SystemStatusBanner;
