"use client";
import React, { useEffect, useMemo, useState } from "react";
import { ContactRole } from "@/types/auto-reply";
import { useKeywordRoutes } from "@/hooks/contact-list/useKeywordRoutes";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import RouteProductsDialog from "./RouteProductsDialog";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import type { AlertType } from "@/components/ui/loading/ServerResponseAlert";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import {
  Key,
  Globe,
  User,
  Package,
  Settings,
  X,
  Sparkles,
  Target,
  Zap,
  Hash,
  CheckCircle,
  Circle,
} from "lucide-react";

export default function ContactKeywordsModal({
  open,
  onClose,
  contactId,
  disabled,
}: {
  open: boolean;
  onClose: () => void;
  contactId: number;
  disabled?: boolean;
}) {
  const { routes, fetchRoutes, updateRoute } = useKeywordRoutes(contactId);
  const { currentUser } = useCurrentUser();
  const zaloDisabled = (currentUser?.zaloLinkStatus ?? 0) === 0;
  const [activeMap, setActiveMap] = useState<Record<number, boolean>>({});
  const [productsState, setProductsState] = useState<{
    open: boolean;
    routeId: number | null;
    productIds: number[];
  }>({ open: false, routeId: null, productIds: [] });
  const [alert, setAlert] = useState<{
    type: AlertType;
    message: string;
  } | null>(null);
  const [confirmToggle, setConfirmToggle] = useState<{
    open: boolean;
    routeId?: number;
    nextActive?: boolean;
    keyword?: string;
  }>({ open: false });

  useEffect(() => {
    if (open) fetchRoutes();
  }, [open, fetchRoutes]);

  useEffect(() => {
    const m: Record<number, boolean> = {};
    routes.forEach((r) => {
      if (r.contactId === contactId) m[r.routeId] = r.active;
    });
    setActiveMap(m);
  }, [routes, contactId]);

  const promptToggle = (route: { routeId: number; keyword: string }) => {
    if (disabled || zaloDisabled) return;
    const nextActive = !activeMap[route.routeId];
    setConfirmToggle({
      open: true,
      routeId: route.routeId,
      nextActive,
      keyword: route.keyword,
    });
  };

  const confirmToggleAction = async () => {
    if (!confirmToggle.routeId || confirmToggle.nextActive === undefined) {
      setConfirmToggle({ open: false });
      return;
    }
    try {
      setAlert({ type: "loading", message: "Đang cập nhật trạng thái…" });
      await updateRoute(confirmToggle.routeId, {
        active: !!confirmToggle.nextActive,
      });
      setActiveMap((prev) => ({
        ...prev,
        [confirmToggle.routeId!]: !!confirmToggle.nextActive,
      }));
      setAlert({ type: "success", message: "Cập nhật trạng thái thành công." });
    } catch (e: any) {
      setAlert({
        type: "error",
        message: "Cập nhật thất bại. Vui lòng thử lại.",
      });
    } finally {
      setConfirmToggle({ open: false });
    }
  };

  // Toggle xác nhận và lưu ngay; không có lưu hàng loạt

  // Group routes by type
  const { globalRoutes, contactRoutes } = useMemo(() => {
    const global = routes.filter((r) => r.contactId === null);
    const contact = routes.filter((r) => r.contactId === contactId);
    return { globalRoutes: global, contactRoutes: contact };
  }, [routes, contactId]);

  // Không kiểm tra thay đổi chưa lưu khi đóng modal

  return (
    <TooltipProvider>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          if (!v) onClose();
        }}
      >
        <DialogContent className="!max-w-4xl max-h-[85vh] flex flex-col bg-gradient-to-br from-blue-50/95 via-white/95 to-purple-50/95 backdrop-blur-xl border-0 shadow-2xl">
          {/* Decorative Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/3 via-purple-500/3 to-pink-500/3 pointer-events-none"></div>

          {/* Fixed Header */}
          <DialogHeader className="relative pb-4 flex-shrink-0">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl blur-sm opacity-40 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-blue-500 to-purple-500 p-2 rounded-xl">
                  <Key className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl xl:text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  Keywords áp dụng
                </DialogTitle>
                <p className="text-gray-500 text-sm leading-relaxed">
                  Quản lý keywords cho Contact #{contactId}
                </p>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-4">
              {/* Global Keywords Section */}
              {globalRoutes.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/8 to-teal-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Globe className="w-4 h-4 text-white" />
                        <span className="font-semibold text-white text-sm">
                          Keywords Global
                        </span>
                        <div className="ml-auto bg-white/25 rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">
                            {globalRoutes.length} keywords
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2">
                      {globalRoutes.map((r) => (
                        <div
                          key={r.routeId}
                          className="flex items-center justify-between bg-gray-50/60 hover:bg-emerald-50/60 border border-gray-200/50 rounded-lg px-3 py-3 transition-all duration-200"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-3 h-3 text-emerald-600" />
                              <span className="font-medium text-gray-900 text-sm">
                                {r.keyword}
                              </span>
                              <Badge
                                variant="outline"
                                className="bg-emerald-100 text-emerald-700 border-emerald-300"
                              >
                                <Globe className="w-3 h-3 mr-1" />
                                GLOBAL
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>
                                  SP: {(r.routeProducts || []).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {r.active ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Circle className="w-3 h-3 text-gray-400" />
                                )}
                                <span>
                                  {r.active ? "Đang hoạt động" : "Tạm dừng"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={true}
                                  className="h-8 px-3 text-xs bg-gray-100 text-gray-500 border-gray-300"
                                >
                                  <span className="flex items-center gap-2">
                                    <Package className="w-3 h-3 mr-1" />
                                    Sản phẩm
                                  </span>
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>
                                  Keywords global không thể chỉnh sửa từ contact
                                </p>
                              </TooltipContent>
                            </Tooltip>

                            <div className="flex items-center gap-2 bg-white/80 rounded-lg px-2 py-1">
                              <Switch
                                checked={r.active}
                                disabled={true}
                                className="data-[state=checked]:bg-emerald-500"
                              />
                              <span className="text-xs text-gray-600">
                                Global
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact-Specific Keywords Section */}
              {contactRoutes.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-500/8 to-purple-500/8 rounded-2xl blur-lg group-hover:blur-xl transition-all duration-500"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-white" />
                        <span className="font-semibold text-white text-sm">
                          Keywords riêng cho Contact
                        </span>
                        <div className="ml-auto bg-white/25 rounded-full px-2 py-1">
                          <span className="text-white text-xs font-medium">
                            {contactRoutes.length} keywords
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Content */}
                    <div className="p-3 space-y-2">
                      {contactRoutes.map((r) => (
                        <div
                          key={r.routeId}
                          className={`flex items-center justify-between border rounded-lg px-3 py-3 transition-all duration-200 ${
                            activeMap[r.routeId]
                              ? "bg-blue-50/60 border-blue-200 hover:bg-blue-100/60"
                              : "bg-gray-50/60 border-gray-200/50 hover:bg-gray-100/60"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-3 h-3 text-blue-600" />
                              <span className="font-medium text-gray-900 text-sm">
                                {r.keyword}
                              </span>
                              <Badge
                                  variant="outline"
                                  className="bg-blue-100 text-blue-700 border-blue-300"
                                >
                                  <Hash className="w-3 h-3 mr-1" />
                                  {(r as any).contact?.name || (r as any).contactName || `#${r.contactId}`}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <Package className="w-3 h-3" />
                                <span>
                                  SP: {(r.routeProducts || []).length}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                {activeMap[r.routeId] ? (
                                  <CheckCircle className="w-3 h-3 text-green-500" />
                                ) : (
                                  <Circle className="w-3 h-3 text-gray-400" />
                                )}
                                <span>
                                  {activeMap[r.routeId]
                                    ? "Đang hoạt động"
                                    : "Tạm dừng"}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 ml-3">
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={zaloDisabled || disabled}
                              onClick={() =>
                                setProductsState({
                                  open: true,
                                  routeId: r.routeId,
                                  productIds: (r.routeProducts || [])
                                    .sort((a, b) => a.priority - b.priority)
                                    .map((x) => x.productId),
                                })
                              }
                              className="h-8 px-3 text-xs hover:bg-blue-50 hover:border-blue-300 transition-colors"
                            >
                              <span className="flex items-center gap-2">
                                <Package className="w-3 h-3 mr-1" />
                                Sản phẩm
                              </span>
                            </Button>

                            <div className="flex items-center gap-2 bg-white/80 rounded-lg px-2 py-1">
                              <Switch
                                checked={!!activeMap[r.routeId]}
                                disabled={zaloDisabled || disabled}
                                onCheckedChange={() => promptToggle(r)}
                                className="data-[state=checked]:bg-green-500"
                              />
                              <span className="text-xs text-gray-600">
                                Trạng Thái Hoạt Động
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {globalRoutes.length === 0 && contactRoutes.length === 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-gray-500/8 to-slate-500/8 rounded-2xl blur-lg"></div>
                  <div className="relative bg-white/85 backdrop-blur-sm border border-white/60 rounded-2xl shadow-xl overflow-hidden">
                    <div className="p-12 text-center">
                      <div className="mx-auto w-16 h-16 bg-gradient-to-r from-gray-400 to-gray-500 rounded-full flex items-center justify-center mb-4 opacity-50">
                        <Key className="w-8 h-8 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-800 mb-2">
                        Chưa có keywords nào
                      </h3>
                      <p className="text-gray-500 text-sm">
                        Tạo keywords mới từ trang quản lý chính
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <DialogFooter className="relative pt-4 flex-shrink-0 border-t border-gray-200/50 bg-white/50 backdrop-blur-sm">
            <div className="flex gap-3 w-full justify-end">
              <Button
                variant="outline"
                onClick={onClose}
                className="bg-white/60 hover:bg-white border-gray-200 hover:shadow-lg transition-all duration-300 px-6 py-2 h-10 text-sm rounded-lg"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 mr-2" />
                  Đóng
                </span>
              </Button>
            </div>
          </DialogFooter>

          {/* Decorative Elements */}
          <div className="absolute top-4 right-4 opacity-15 pointer-events-none">
            <div className="flex gap-1">
              <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />
              <Key className="w-4 h-4 text-purple-500 animate-bounce" />
            </div>
          </div>
          <div className="absolute bottom-4 left-4 opacity-8 pointer-events-none">
            <Zap className="w-5 h-5 text-blue-500 animate-pulse" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Products Dialog */}
      {productsState.open && productsState.routeId !== null && (
        <RouteProductsDialog
          open={productsState.open}
          onClose={() =>
            setProductsState({ open: false, routeId: null, productIds: [] })
          }
          routeId={productsState.routeId}
          contactId={contactId}
          initialProductIds={productsState.productIds}
          onSaved={() => fetchRoutes()}
        />
      )}

      {alert && (
        <ServerResponseAlert
          type={alert.type}
          message={alert.message}
          onClose={() => setAlert(null)}
        />
      )}
      <ConfirmDialog
        isOpen={confirmToggle.open}
        title="Xác nhận thay đổi"
        message={`Bạn có chắc muốn ${
          confirmToggle.nextActive ? "bật" : "tắt"
        } keyword${
          confirmToggle.keyword ? ` "${confirmToggle.keyword}"` : ""
        }?`}
        confirmText="Xác nhận"
        cancelText="Hủy"
        onConfirm={confirmToggleAction}
        onCancel={() => setConfirmToggle({ open: false })}
      />
    </TooltipProvider>
  );
}
