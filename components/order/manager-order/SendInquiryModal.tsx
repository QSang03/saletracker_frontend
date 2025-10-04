import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, X, AlertCircle, CheckCircle } from "lucide-react";
import { OrderDetail, OrderInquiryPreset } from "@/types";
import { orderInquiryPresetsApi } from "@/lib/api";
import { toast } from "sonner";

interface SendInquiryModalProps {
  orderDetail: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
  onSend?: (orderDetail: OrderDetail, message: string) => Promise<void>;
}

const SendInquiryModal: React.FC<SendInquiryModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
  onSend,
}) => {
  const [presets, setPresets] = useState<OrderInquiryPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPresetId, setSelectedPresetId] = useState<string>("");
  const [customMessage, setCustomMessage] = useState("");
  const [sending, setSending] = useState(false);

  // Fetch presets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPresets();
      // Reset form
      setSelectedPresetId("");
      setCustomMessage("");
    }
  }, [isOpen]);

  const fetchPresets = async () => {
    try {
      setLoading(true);
      const response = await orderInquiryPresetsApi.getMyPresets();
      setPresets(response || []);
    } catch (error: any) {
      console.error("Error fetching presets:", error);
      toast.error(
        error?.response?.data?.message ||
          "Có lỗi xảy ra khi tải danh sách preset"
      );
    } finally {
      setLoading(false);
    }
  };

  // Get selected preset
  const selectedPreset = presets.find(
    (p) => p.id.toString() === selectedPresetId
  );

  // Get final message (preset content or custom message)
  const finalMessage = selectedPreset?.content || customMessage;

  const handleSend = async () => {
    if (!orderDetail) return;

    if (!finalMessage.trim()) {
      toast.error("Vui lòng chọn preset hoặc nhập tin nhắn tùy chỉnh");
      return;
    }

    try {
      setSending(true);

      if (onSend) {
        await onSend(orderDetail, finalMessage.trim());
      }

      toast.success("Gửi câu hỏi thăm dò thành công!");
      onClose();
    } catch (error: any) {
      console.error("Error sending inquiry:", error);
      toast.error(
        error?.response?.data?.message ||
          "Có lỗi xảy ra khi gửi câu hỏi thăm dò"
      );
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    if (sending) return;
    onClose();
  };

  if (!orderDetail) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-blue-600" />
            Gửi câu hỏi thăm dò sản phẩm
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto space-y-4">
          {/* Order Info */}
          <div className="bg-gray-50 p-4 rounded-lg border">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-gray-900">
                Thông tin đơn hàng
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-gray-600">Mã đơn:</span>{" "}
                <span className="font-medium">#{orderDetail.id}</span>
              </div>
              <div>
                <span className="text-gray-600">Khách hàng:</span>{" "}
                <span className="font-medium">
                  {orderDetail.customer_name || "N/A"}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-gray-600">Sản phẩm:</span>{" "}
                <span className="font-medium">
                  {orderDetail.raw_item || "N/A"}
                </span>
              </div>
            </div>
          </div>

          {/* Preset Selection */}
          <div className="space-y-3">
            <Label htmlFor="preset">Chọn preset câu hỏi</Label>
            {loading ? (
              <Skeleton className="h-10 w-full" />
            ) : (
              <Select
                value={selectedPresetId}
                onValueChange={(value) => {
                  setSelectedPresetId(value);
                  setCustomMessage(""); // Clear custom message when selecting preset
                }}
                disabled={sending}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Chọn preset có sẵn..." />
                </SelectTrigger>
                <SelectContent>
                  {presets.length === 0 ? (
                    <div className="p-2 text-center text-gray-500 text-sm">
                      Chưa có preset nào
                    </div>
                  ) : (
                    presets.map((preset) => (
                      <SelectItem key={preset.id} value={preset.id.toString()}>
                        <div className="flex flex-col">
                          <span className="font-medium">{preset.title}</span>
                          {preset.content && (
                            <span className="text-xs text-gray-500 truncate max-w-[300px]">
                              {preset.content}
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Custom Message */}
          <div className="space-y-3">
            <Label htmlFor="message">
              Hoặc nhập tin nhắn tùy chỉnh
              {selectedPreset && (
                <span className="text-xs text-gray-500 ml-2">
                  (sẽ ghi đè preset đã chọn)
                </span>
              )}
            </Label>
            <Textarea
              id="message"
              value={customMessage}
              onChange={(e) => {
                setCustomMessage(e.target.value);
                if (e.target.value.trim()) {
                  setSelectedPresetId("");
                }
              }}
              placeholder="Nhập tin nhắn thăm dò tùy chỉnh..."
              rows={4}
              disabled={sending}
            />
          </div>

          {/* Preview */}
          {finalMessage && (
            <div className="space-y-2">
              <Label>Xem trước tin nhắn sẽ gửi:</Label>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm text-blue-800 whitespace-pre-wrap">
                    {finalMessage}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={sending}
            className="flex-1"
          >
            <span className="flex items-center justify-center">
              <X className="h-4 w-4 mr-2" />
              Hủy
            </span>
          </Button>
          <Button
            onClick={handleSend}
            disabled={sending || !finalMessage.trim()}
            className="flex-1"
          >
            {sending ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white" />
                Đang gửi...
              </div>
            ) : (
              <span className="flex items-center justify-center">
                <Send className="h-4 w-4 mr-2" />
                Gửi câu hỏi
              </span>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SendInquiryModal;
