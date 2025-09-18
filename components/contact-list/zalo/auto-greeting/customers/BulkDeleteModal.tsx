"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Trash2, X, AlertCircle } from "lucide-react";

interface BulkDeleteModalProps {
  isOpen: boolean;
  selectedCount: number;
  bulkSaving: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const BulkDeleteModal: React.FC<BulkDeleteModalProps> = ({
  isOpen,
  selectedCount,
  bulkSaving,
  onClose,
  onConfirm,
}) => {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <Trash2 className="h-5 w-5" />
            Xóa hàng loạt ({selectedCount} khách hàng)
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-red-700 font-medium">
                  Bạn có chắc chắn muốn xóa {selectedCount} khách hàng đã chọn?
                </p>
                <p className="text-sm text-red-600 mt-1">
                  Hành động này không thể hoàn tác. Tất cả dữ liệu liên quan đến
                  các khách hàng này sẽ bị xóa vĩnh viễn.
                </p>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={bulkSaving}>
            <span className="flex items-start justify-center">
              <X className="h-4 w-4 mr-2" />
              Hủy
            </span>
          </Button>
          <Button
            onClick={onConfirm}
            disabled={bulkSaving}
            className="bg-red-600 hover:bg-red-700"
          >
            {bulkSaving ? (
              <span className="flex items-start justify-center">
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Đang xóa...
              </span>
            ) : (
              <span className="flex items-start justify-center">
                <Trash2 className="h-4 w-4 mr-2" />
                Xóa vĩnh viễn
              </span>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BulkDeleteModal;
