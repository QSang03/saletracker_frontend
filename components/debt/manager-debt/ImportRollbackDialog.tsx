"use client";
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { getAccessToken } from "@/lib/auth";

interface ImportSession {
  import_session_id: string;
  created_at: string;
  total_records: number;
  user: {
    id: number;
    fullName: string;
    username: string;
  }
}

interface ImportRollbackDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (message: string) => void;
  onError?: (message: string) => void;
  isRollingBack?: boolean;
  setIsRollingBack?: (v: boolean) => void;
}

export default function ImportRollbackDialog({
  open,
  onOpenChange,
  onSuccess,
  onError,
  isRollingBack = false,
  setIsRollingBack,
}: ImportRollbackDialogProps) {
  const [sessions, setSessions] = useState<ImportSession[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().slice(0, 10)
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Lấy danh sách sessions khi mở dialog hoặc thay đổi ngày
  useEffect(() => {
    if (open) {
      fetchImportHistory();
    }
  }, [open, selectedDate]);

  const fetchImportHistory = async () => {
    try {
      setIsLoading(true);
      const token = await getAccessToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/debts/import-history?date=${selectedDate}`,
      {
        headers: {
        Authorization: `Bearer ${token}`,
        },
      }
    );

      if (!response.ok) {
        throw new Error("Không thể lấy lịch sử import");
      }

      const data = await response.json();
      setSessions(data);
      setSelectedSessionId(""); // Reset selection khi load lại
    } catch (error) {
      console.error("Error fetching import history:", error);
      onError?.("Không thể lấy lịch sử import");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRollback = async () => {
    if (!selectedSessionId) {
      onError?.("Vui lòng chọn session để rollback");
      return;
    }

    setShowConfirm(false);
    onOpenChange(false);
    try {
      setIsRollingBack && setIsRollingBack(true);
      const token = await getAccessToken();
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/debts/import-rollback`,
      {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
        import_session_id: selectedSessionId,
        }),
      }
    );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Khôi phục thất bại");
      }

      const result = await response.json();
      onSuccess?.(result.message || "Khôi phục thành công");
      
      // Reset state
      setSelectedSessionId("");
      setSessions([]);
    } catch (error: any) {
      console.error("Error during rollback:", error);
      onError?.(error.message || "Có lỗi xảy ra khi rollback");
    } finally {
      setIsRollingBack && setIsRollingBack(false);
      setShowConfirm(false);
    }
  };

  const selectedSession = sessions.find(s => s.import_session_id === selectedSessionId);

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString("vi-VN");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Khôi phục dữ liệu công nợ</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Chọn ngày */}
            <div className="space-y-2">
              <Label htmlFor="date">Chọn ngày</Label>
              <Input
                id="date"
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full"
              />
            </div>

            {/* Hiển thị danh sách sessions */}
            <div className="space-y-2">
              <Label>Chọn session import để khôi phục</Label>

              {isLoading ? (
                <div className="flex items-center justify-center p-4">
                  <LoadingSpinner />
                  <span className="ml-2">Đang tải...</span>
                </div>
              ) : sessions.length === 0 ? (
                <Alert>
                  <AlertDescription>
                    Không có session import nào trong ngày {new Date(selectedDate).toLocaleDateString("vi-VN")}
                  </AlertDescription>
                </Alert>
              ) : (
                <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn session import..." />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((session) => (
                      <SelectItem key={session.import_session_id} value={session.import_session_id}>
                        <div className="flex flex-col">
                          <span className="font-medium">{session.import_session_id}</span>
                          {/* <span className="font-medium">{session.user.fullName}</span> */}
                          <span className="text-sm text-muted-foreground">
                            {formatDateTime(session.created_at)} - {session.total_records} bản ghi
                          </span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Hiển thị thông tin session được chọn */}
            {selectedSession && (
              <Alert>
                <AlertDescription>
                  <div className="space-y-1">
                    <div><strong>Session:</strong> {selectedSession.import_session_id}</div>
                    <div><strong>Thời gian:</strong> {formatDateTime(selectedSession.created_at)}</div>
                    <div><strong>Người Import:</strong> {selectedSession.user.fullName}</div>
                    <div><strong>Số bản ghi:</strong> {selectedSession.total_records}</div>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-800">
                ⚠️ <strong>Cảnh báo:</strong> Thao tác sẽ khôi phục dữ liệu về trạng thái trước khi import. 
                Hành động này không thể hoàn tác!
              </AlertDescription>
            </Alert>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isRollingBack}
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={() => setShowConfirm(true)}
              disabled={!selectedSessionId || isRollingBack}
            >
              {isRollingBack ? (
                <>
                  <LoadingSpinner className="mr-2 h-4 w-4" />
                  Đang rollback...
                </>
              ) : (
                "Rollback"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận Rollback"
        message={
          selectedSession
            ? `Bạn có chắc chắn muốn rollback session "${selectedSession.import_session_id}" với ${selectedSession.total_records} bản ghi không? Thao tác này không thể hoàn tác!`
            : "Bạn có chắc chắn muốn thực hiện rollback?"
        }
        onConfirm={handleRollback}
        onCancel={() => setShowConfirm(false)}
        confirmText="Rollback"
      />
    </>
  );
}
