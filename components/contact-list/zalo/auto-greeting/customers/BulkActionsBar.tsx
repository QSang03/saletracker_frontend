"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Edit3, Trash2 } from "lucide-react";

interface BulkActionsBarProps {
  selectedCount: number;
  onBulkEdit: () => void;
  onBulkDelete: () => void;
}

const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedCount,
  onBulkEdit,
  onBulkDelete,
}) => {
  if (selectedCount === 0) {
    return null;
  }

  return (
    <div className="mb-4 p-4 bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border-2 border-blue-200 rounded-xl shadow-lg">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          <span className="text-base text-blue-700 font-semibold">
            Đã chọn{" "}
            <span className="px-3 py-1 bg-blue-100 rounded-lg font-bold mx-1">
              {selectedCount}
            </span>{" "}
            khách hàng
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkEdit}
            className="border-blue-300 text-blue-600 hover:bg-blue-50"
          >
            <span className="flex items-start justify-center">
              <Edit3 className="h-4 w-4 mr-2" />
              Chỉnh sửa hàng loạt
            </span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onBulkDelete}
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <span className="flex items-start justify-center">
              <Trash2 className="h-4 w-4 mr-2" />
              Xóa hàng loạt
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BulkActionsBar;
