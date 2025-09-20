"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  FileSpreadsheet,
  Upload,
  RefreshCw,
  Download,
  Filter,
  Users,
} from "lucide-react";

interface ActionButtonsProps {
  downloadingTemplate: boolean;
  loading: boolean;
  onDownloadTemplate: () => void;
  onImportModalOpen: () => void;
  onReload: () => void;
  onExportModalOpen: () => void;
  onImportFromContacts: () => void;
  onClearFilters: () => void;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  downloadingTemplate,
  loading,
  onDownloadTemplate,
  onImportModalOpen,
  onReload,
  onExportModalOpen,
  onImportFromContacts,
  onClearFilters,
}) => {
  return (
    <div className="flex flex-wrap gap-3 mb-4 justify-end">
      <Button
        variant="outline"
        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
        onClick={onDownloadTemplate}
        disabled={downloadingTemplate}
      >
        <span className="flex items-start justify-center">
          {downloadingTemplate ? (
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <FileSpreadsheet className="h-4 w-4 mr-2" />
          )}
          {downloadingTemplate ? "Đang tạo file mẫu..." : "Tải file mẫu Excel"}
        </span>
      </Button>
      <Button
        onClick={onImportModalOpen}
        className="bg-blue-600 hover:bg-blue-700 text-white"
      >
        <span className="flex items-start justify-center">
          <Upload className="h-4 w-4 mr-2" />
          + Nhập file danh sách khách hàng
        </span>
      </Button>
      <Button
        onClick={onReload}
        variant="outline"
        className="bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
      >
        <span className="flex items-start justify-center">
          <RefreshCw className="h-4 w-4 mr-2" />
          Làm mới
        </span>
      </Button>
      <Button
        onClick={onExportModalOpen}
        variant="outline"
        className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
      >
        <span className="flex items-start justify-center">
          <Download className="h-4 w-4 mr-2" />
          Xuất Excel
        </span>
      </Button>
      <Button
        onClick={onImportFromContacts}
        variant="outline"
        className="bg-green-50 border-green-200 text-green-700 hover:bg-green-100"
        disabled={loading}
      >
        <span className="flex items-start justify-center">
          <Users className="h-4 w-4 mr-2" />
          {loading ? "Đang tải..." : "Xuất từ Danh bạ"}
        </span>
      </Button>
      <Button
        onClick={onClearFilters}
        variant="outline"
        className="bg-red-50 border-red-200 text-red-700 hover:bg-red-100"
      >
        <span className="flex items-start justify-center">
          <Filter className="h-4 w-4 mr-2" />
          Xóa filter
        </span>
      </Button>
    </div>
  );
};

export default ActionButtons;

