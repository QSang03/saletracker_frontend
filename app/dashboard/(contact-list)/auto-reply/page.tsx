"use client";
import React, { useState } from "react";
import ContactTable from "@/components/contact-list/zalo/contacts/ContactTable";
import PersonasManagerModal from "@/components/contact-list/zalo/persona/PersonasManagerModal";
import { useAutoReplySettings } from "@/hooks/contact-list/useAutoReplySettings";
import SaleProductsModal from "@/components/contact-list/zalo/products/SaleProductsModal";
import KeywordsModal from "@/components/contact-list/zalo/keywords/KeywordsModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { ServerResponseAlert, AlertType } from "@/components/ui/loading/ServerResponseAlert";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  MessageCircle,
  Package,
  Key,
  User,
  Zap,
  AlertTriangle,
  Settings2,
} from "lucide-react";

export default function AutoReplyPage() {
  const { currentUser } = useCurrentUser();
  const [saleProductsOpen, setSaleProductsOpen] = useState(false);
  const [keywordsOpen, setKeywordsOpen] = useState(false);
  const [personasManagerOpen, setPersonasManagerOpen] = useState(false);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [pendingToggleValue, setPendingToggleValue] = useState<boolean | null>(null);

  // ServerResponseAlert states
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<AlertType>("success");
  const [alertMessage, setAlertMessage] = useState("");

  const { enabled: globalOn, update: updateGlobal } = useAutoReplySettings();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;

  const handleToggleChange = (checked: boolean) => {
    setPendingToggleValue(checked);
    setConfirmDialogOpen(true);
  };

  const handleConfirmToggle = async () => {
    if (pendingToggleValue !== null) {
      try {
        // Show loading alert
        setAlertType("loading");
        setAlertMessage("Đang cập nhật cài đặt tự động nhắn tin...");
        setAlertVisible(true);

        // Simulate API call delay (replace with actual API call)
  await updateGlobal(pendingToggleValue);
        
        // Hide loading alert first
        setAlertVisible(false);
        
        // Show success alert after a brief delay
        setTimeout(() => {
          setAlertType("success");
          setAlertMessage(
            pendingToggleValue 
              ? "✅ Đã bật tự động nhắn tin thành công! Hệ thống sẽ tự động trả lời tin nhắn từ khách hàng."
              : "✅ Đã tắt tự động nhắn tin thành công! Hệ thống ngừng tự động trả lời tin nhắn."
          );
          setAlertVisible(true);
        }, 300);

      } catch (error) {
        // Hide loading alert
        setAlertVisible(false);
        
        // Show error alert after a brief delay
        setTimeout(() => {
          setAlertType("error");
          setAlertMessage(
            pendingToggleValue
              ? "❌ Không thể bật tự động nhắn tin. Vui lòng thử lại sau."
              : "❌ Không thể tắt tự động nhắn tin. Vui lòng thử lại sau."
          );
          setAlertVisible(true);
        }, 300);
      }
    }
    
    setConfirmDialogOpen(false);
    setPendingToggleValue(null);
  };

  const handleCancelToggle = () => {
    setConfirmDialogOpen(false);
    setPendingToggleValue(null);
  };

  const handleAlertClose = () => {
    setAlertVisible(false);
  };

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* ServerResponseAlert */}
        {alertVisible && (
          <div className="fixed top-4 right-4 z-50">
            <ServerResponseAlert
              type={alertType}
              message={alertMessage}
              onClose={handleAlertClose}
              duration={alertType === "loading" ? 0 : 4000}
            />
          </div>
        )}

        {/* Status Alert */}
        {!globalOn && (
          <div className="mb-6">
            <Alert
              variant="default"
              className="bg-amber-50 border-amber-200 shadow-lg rounded-xl"
            >
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <AlertDescription className="text-amber-700 font-medium">
                ⚠️ Tự động nhắn tin đang tắt. Tất cả thao tác cấu hình chỉ lưu
                trữ, bot sẽ không phản hồi.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Main Content - All in One Card */}
        <Card className="shadow-lg">
          <CardHeader className="border-b bg-gray-50/50">
            {/* Controls Row - All in One Line */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-4">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
                    <MessageCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                      Zalo Auto-Reply
                    </h1>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Hệ thống tự động trả lời thông minh
                    </p>
                  </div>
                </div>
              </div>

              {/* All Controls in Same Row */}
              <div className="flex items-center gap-4">
                {/* Action Buttons */}
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    disabled={zaloDisabled}
                    onClick={() => setSaleProductsOpen(true)}
                    className="group hover:shadow-md transition-all duration-300 border-orange-200 hover:border-orange-300 hover:bg-orange-50 h-10"
                  >
                    <span className="flex items-center gap-2">
                      <Package className="w-4 h-4 mr-2 text-orange-500 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-sm">Sản phẩm</span>
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    disabled={zaloDisabled}
                    onClick={() => setKeywordsOpen(true)}
                    className="group hover:shadow-md transition-all duration-300 border-yellow-200 hover:border-yellow-300 hover:bg-yellow-50 h-10"
                  >
                    <span className="flex items-center gap-2">
                      <Key className="w-4 h-4 mr-2 text-yellow-500 group-hover:rotate-12 transition-transform duration-300" />
                      <span className="text-sm">Keywords</span>
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    disabled={zaloDisabled}
                    onClick={() => setPersonasManagerOpen(true)}
                    className="group hover:shadow-md transition-all duration-300 border-purple-200 hover:border-purple-300 hover:bg-purple-50 h-10"
                  >
                    <span className="flex items-center gap-2">
                      <User className="w-4 h-4 mr-2 text-purple-500 group-hover:scale-110 transition-transform duration-300" />
                      <span className="text-sm">Personas</span>
                    </span>
                  </Button>
                </div>

                {/* Separator */}
                <div className="w-px h-8 bg-gray-200"></div>

                {/* Global Switch với Tooltip */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-3 bg-white rounded-xl p-3 border shadow-sm cursor-pointer">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={globalOn}
                          disabled={zaloDisabled}
                          onCheckedChange={handleToggleChange}
                          className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-green-500 data-[state=checked]:to-emerald-500"
                        />
                        <Label className="text-sm font-medium flex items-center gap-2 cursor-pointer">
                          <Zap
                            className={`w-4 h-4 ${
                              globalOn ? "text-green-500" : "text-gray-400"
                            }`}
                          />
                          Bật tự động nhắn tin
                        </Label>
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>
                      {globalOn
                        ? "Nhấn để tắt tự động trả lời cho tất cả liên hệ"
                        : "Nhấn để bật tự động trả lời cho tất cả liên hệ"}
                    </p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-0">
            <ContactTable globalAutoReplyEnabled={!!globalOn} />
          </CardContent>
        </Card>

        {/* Modals */}
        <SaleProductsModal
          open={saleProductsOpen}
          onClose={() => setSaleProductsOpen(false)}
        />
        <KeywordsModal
          open={keywordsOpen}
          onClose={() => setKeywordsOpen(false)}
        />
  <PersonasManagerModal open={personasManagerOpen} onClose={() => setPersonasManagerOpen(false)} />

        {/* Confirm Dialog */}
        <ConfirmDialog
          isOpen={confirmDialogOpen}
          title={
            pendingToggleValue ? "Bật tự động nhắn tin" : "Tắt tự động nhắn tin"
          }
          message={
            <div className="space-y-3">
              <p className="text-gray-700">
                {pendingToggleValue
                  ? "Bạn có chắc chắn muốn bật tự động trả lời cho tất cả liên hệ?"
                  : "Bạn có chắc chắn muốn tắt tự động trả lời cho tất cả liên hệ?"}
              </p>
              <div
                className={`p-3 rounded-lg border-l-4 ${
                  pendingToggleValue
                    ? "bg-green-50 border-green-400 text-green-700"
                    : "bg-amber-50 border-amber-400 text-amber-700"
                }`}
              >
                <div className="flex items-start gap-2">
                  {pendingToggleValue ? (
                    <Zap className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5" />
                  )}
                  <div className="text-sm">
                    {pendingToggleValue
                      ? "Hệ thống sẽ tự động trả lời tin nhắn từ khách hàng dựa trên cấu hình đã thiết lập."
                      : "Hệ thống sẽ ngừng tự động trả lời. Tất cả tin nhắn sẽ cần được xử lý thủ công."}
                  </div>
                </div>
              </div>
            </div>
          }
          onConfirm={handleConfirmToggle}
          onCancel={handleCancelToggle}
          confirmText={pendingToggleValue ? "Bật ngay" : "Tắt ngay"}
          cancelText="Hủy"
        />
      </div>
    </TooltipProvider>
  );
}
