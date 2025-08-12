import React, { useState, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Edit2, Trash2, User, Calendar, MessageSquare, Shield, ShieldOff } from "lucide-react";
import { useBlacklist, BlacklistItem } from "@/hooks/useBlacklist";
import EditBlacklistReasonModal from "./EditBlacklistReasonModal";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface BlacklistManagementProps {
  blacklists: BlacklistItem[];
  total: number;
  loading?: boolean;
  onEdit: (id: number, reason: string) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function BlacklistManagement({
  blacklists,
  total,
  loading = false,
  onEdit,
  onDelete,
}: BlacklistManagementProps) {
  const [editingItem, setEditingItem] = useState<BlacklistItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<BlacklistItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { currentUser } = useCurrentUser();

  // Handle edit
  const handleEditClick = useCallback((item: BlacklistItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSave = useCallback(
    async (id: number, reason: string) => {
      setActionLoading(true);
      try {
        await onEdit(id, reason);
      } finally {
        setActionLoading(false);
      }
    },
    [onEdit]
  );

  const handleEditCancel = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingItem(null);
  }, []);

  // Handle delete
  const handleDeleteClick = useCallback((item: BlacklistItem) => {
    setDeletingItem(item);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deletingItem) return;

    setActionLoading(true);
    try {
      await onDelete(deletingItem.id);
      setIsDeleteDialogOpen(false);
      setDeletingItem(null);
    } catch (error) {
      console.error("Error deleting blacklist item:", error);
    } finally {
      setActionLoading(false);
    }
  }, [deletingItem, onDelete]);

  const handleDeleteCancel = useCallback(() => {
    setIsDeleteDialogOpen(false);
    setDeletingItem(null);
  }, []);

  // Format date
  const formatDate = useCallback((dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: vi,
      });
    } catch {
      return "N/A";
    }
  }, []);

  // ✅ Enhanced Skeleton Row Component với Green theme
  const SkeletonTableRow = () => (
    <TableRow className="group transition-all duration-300 border-b border-green-100">
      <TableCell className="text-center py-4 px-4">
        <Skeleton className="h-4 w-6 mx-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="py-4 px-4">
        <Skeleton className="h-4 w-24 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="text-center py-4 px-4">
        <Skeleton className="h-6 w-20 mx-auto rounded-full animate-pulse" />
      </TableCell>
      <TableCell className="py-4 px-4">
        <Skeleton className="h-4 w-32 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="py-4 px-4">
        <Skeleton className="h-4 w-20 rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="text-center py-4 px-4">
        <Skeleton className="h-4 w-16 mx-auto rounded-lg animate-pulse" />
      </TableCell>
      <TableCell className="text-center py-4 px-4">
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-8 w-8 rounded-lg animate-pulse" />
          <Skeleton className="h-8 w-8 rounded-lg animate-pulse" />
        </div>
      </TableCell>
    </TableRow>
  );

  return (
    <>
      {/* ✅ Table Container với Green theme */}
      <div className="relative rounded-2xl shadow-2xl bg-white border border-gray-200 max-h-[600px] overflow-auto">
        {/* Floating gradient overlay với Green theme */}
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none rounded-2xl"></div>

        <Table className="relative whitespace-nowrap min-w-full">
          {/* ✅ HEADER VỚI GREEN THEME */}
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-green-100 hover:bg-green-200 transition-all duration-300 border-b-2 border-green-200">
              <TableHead className="min-w-[60px] text-center sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0s" }}>📊</span>
                  <span>STT</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[200px] sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.1s" }}>👤</span>
                  <span>Khách hàng</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[180px] text-center sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.2s" }}>🆔</span>
                  <span>Zalo Contact ID</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[280px] sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.3s" }}>🚫</span>
                  <span>Lý do chặn</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[180px] sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.4s" }}>👨‍💼</span>
                  <span>Người chặn</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[140px] text-center sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.5s" }}>📅</span>
                  <span>Thời gian</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[120px] text-center sticky top-0 bg-green-100 py-4 px-4 font-bold text-sm text-green-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.6s" }}>⚡</span>
                  <span>Thao tác</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* ✅ BODY với Green theme */}
          <TableBody>
            {loading ? (
              // ✅ Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonTableRow key={`skeleton-${index}`} />
              ))
            ) : blacklists.length === 0 ? (
              // ✅ Empty state TRONG table structure
              <TableRow>
                <TableCell colSpan={7} className="text-center py-20">
                  <div className="space-y-6">
                    <div className="text-6xl animate-pulse">🛡️</div>
                    <div className="text-xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
                      Tuyệt vời! Không có khách hàng nào bị chặn
                    </div>
                    <div className="text-base text-gray-500">
                      Tất cả khách hàng đều có thể liên hệ bình thường
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // ✅ Data rows với Green alternating colors
              blacklists.map((item, idx) => {
                const isOwner = currentUser?.id === item.user?.id;
                return (
                  <TableRow 
                    key={item.id} 
                    className={`group relative transition-all duration-300 border-b border-green-100 hover:bg-green-50/50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-green-50/30"
                    }`}
                  >
                    <TableCell className="min-w-[60px] text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-sm font-bold shadow-sm">
                        {idx + 1}
                      </span>
                    </TableCell>
                    
                    <TableCell className="min-w-[200px] py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-red-400 to-orange-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          <User className="h-4 w-4" />
                        </div>
                        <span className="font-medium text-gray-900 leading-relaxed">
                          {item.customerName || "N/A"}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[180px] text-center py-4 px-4">
                      <Badge
                        variant="outline"
                        className="font-mono text-xs px-3 py-1.5 bg-green-50 text-green-700 border-green-200 shadow-sm"
                      >
                        {item.zaloContactId}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="min-w-[280px] py-4 px-4">
                      <div className="max-w-[250px]">
                        {item.reason ? (
                          <div className="flex items-start gap-2">
                            <Shield className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-900 leading-relaxed">
                              {item.reason}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <ShieldOff className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-400 italic">
                              Chưa có lý do
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[180px] py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
                          {(item.user?.fullName || item.user?.username || "??").charAt(0).toUpperCase()}
                        </div>
                        <div className="text-sm">
                          <div className="font-medium text-gray-900 leading-relaxed">
                            {item.user?.fullName || "N/A"}
                          </div>
                          <div className="text-gray-500 text-xs">
                            @{item.user?.username || "N/A"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[140px] text-center py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Calendar className="h-3 w-3 text-gray-400" />
                        <span className="text-sm text-gray-600 font-medium">
                          {formatDate(item.created_at)}
                        </span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[120px] text-center py-4 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditClick(item)}
                          disabled={actionLoading || !isOwner}
                          className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 shadow-sm ${
                            isOwner
                              ? "text-green-600 border-green-300 hover:border-green-400 bg-white hover:bg-green-50"
                              : "text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed"
                          }`}
                          title={isOwner ? "Chỉnh sửa lý do chặn" : "Chỉ người tạo mới được chỉnh sửa"}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          disabled={actionLoading || !isOwner}
                          className={`h-8 w-8 p-0 rounded-lg transition-all duration-200 shadow-sm ${
                            isOwner
                              ? "text-red-600 border-red-300 hover:border-red-400 bg-white hover:bg-red-50"
                              : "text-gray-400 border-gray-300 bg-gray-100 cursor-not-allowed"
                          }`}
                          title={isOwner ? "Xóa khỏi blacklist" : "Chỉ người tạo mới được xóa"}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Modal */}
      <EditBlacklistReasonModal
        isOpen={isEditModalOpen}
        onClose={handleEditCancel}
        onSave={handleEditSave}
        blacklistItem={editingItem}
        loading={actionLoading}
      />

      {/* ✅ Enhanced Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Xác nhận xóa khỏi blacklist"
        message={
          <div className="space-y-4">
            <p className="text-gray-700">Bạn có chắc chắn muốn xóa khách hàng này khỏi blacklist?</p>
            {deletingItem && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <strong className="text-gray-700">Khách hàng:</strong>
                    <span className="text-gray-900">{deletingItem.customerName || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <MessageSquare className="h-4 w-4 text-green-500" />
                    <strong className="text-gray-700">Zalo ID:</strong>
                    <Badge variant="outline" className="font-mono text-xs">
                      {deletingItem.zaloContactId}
                    </Badge>
                  </div>
                  {deletingItem.reason && (
                    <div className="flex items-start gap-2 text-sm">
                      <Shield className="h-4 w-4 text-red-500 mt-0.5" />
                      <strong className="text-gray-700">Lý do:</strong>
                      <span className="text-gray-900">{deletingItem.reason}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
            <p className="text-sm text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 bg-red-500 rounded-full"></span>
              Hành động này không thể hoàn tác.
            </p>
          </div>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="🗑️ Xóa khỏi blacklist"
        cancelText="❌ Hủy"
      />
    </>
  );
}
