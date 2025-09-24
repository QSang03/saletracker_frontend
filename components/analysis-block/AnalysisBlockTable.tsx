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
import { Edit2, Trash2, User, Calendar, MessageSquare, BarChart3, FileText, TrendingUp } from "lucide-react";
import { useAnalysisBlock, AnalysisBlockItem } from "@/hooks/useAnalysisBlock";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { formatDistanceToNow } from "date-fns";
import { vi } from "date-fns/locale";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface AnalysisBlockTableProps {
  analysisBlocks: AnalysisBlockItem[];
  total: number;
  loading?: boolean;
  onEdit: (id: number, data: { reason?: string; blockType?: string }) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

const blockTypeConfig = {
  analysis: {
    icon: BarChart3,
    label: 'Phân tích',
    color: 'orange',
    bgColor: 'bg-orange-50',
    textColor: 'text-orange-700',
    borderColor: 'border-orange-200',
  },
  reporting: {
    icon: FileText,
    label: 'Báo cáo',
    color: 'blue',
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  stats: {
    icon: TrendingUp,
    label: 'Thống kê',
    color: 'green',
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
};

export default function AnalysisBlockTable({
  analysisBlocks,
  total,
  loading = false,
  onEdit,
  onDelete,
}: AnalysisBlockTableProps) {
  const [editingItem, setEditingItem] = useState<AnalysisBlockItem | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [deletingItem, setDeletingItem] = useState<AnalysisBlockItem | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const { currentUser } = useCurrentUser();

  // Handle edit
  const handleEditClick = useCallback((item: AnalysisBlockItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSave = useCallback(
    async (id: number, data: { reason?: string; blockType?: string }) => {
      setActionLoading(true);
      try {
        await onEdit(id, data);
        setIsEditModalOpen(false);
        setEditingItem(null);
      } catch (error: any) {
        console.error("Error updating analysis block:", error);
        // Error handling is done in parent component via onEdit prop
        throw error; // Re-throw để parent component có thể xử lý
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
  const handleDeleteClick = useCallback((item: AnalysisBlockItem) => {
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
    } catch (error: any) {
      console.error("Error deleting analysis block item:", error);
      // Error handling is done in parent component via onDelete prop
      throw error; // Re-throw để parent component có thể xử lý
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

  // Get block type config
  const getBlockTypeConfig = (blockType: string) => {
    return blockTypeConfig[blockType as keyof typeof blockTypeConfig] || blockTypeConfig.analysis;
  };

  // Enhanced Skeleton Row Component
  const SkeletonTableRow = () => (
    <TableRow className="group transition-all duration-300 border-b border-orange-100">
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
      {/* Table Container */}
      <div className="relative rounded-2xl shadow-2xl bg-white border border-gray-200 max-h-[600px] overflow-auto">
        {/* Floating gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-transparent to-amber-500/5 pointer-events-none rounded-2xl"></div>

        <Table className="relative whitespace-nowrap min-w-full">
          {/* HEADER */}
          <TableHeader className="sticky top-0 z-20">
            <TableRow className="bg-orange-100 hover:bg-orange-200 transition-all duration-300 border-b-2 border-orange-200">
              <TableHead className="min-w-[60px] text-center sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0s" }}>📊</span>
                  <span>STT</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[200px] sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.1s" }}>👤</span>
                  <span>Khách hàng</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[180px] text-center sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.2s" }}>🆔</span>
                  <span>Zalo Contact ID</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[140px] text-center sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.3s" }}>🚫</span>
                  <span>Loại chặn</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[280px] sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.4s" }}>📝</span>
                  <span>Lý do chặn</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[180px] sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.5s" }}>👨‍💼</span>
                  <span>Người chặn</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[140px] text-center sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.6s" }}>📅</span>
                  <span>Thời gian</span>
                </div>
              </TableHead>
              
              <TableHead className="min-w-[120px] text-center sticky top-0 bg-orange-100 py-4 px-4 font-bold text-sm text-orange-800 tracking-wide">
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-bounce text-xs" style={{ animationDelay: "0.7s" }}>⚡</span>
                  <span>Thao tác</span>
                </div>
              </TableHead>
            </TableRow>
          </TableHeader>

          {/* BODY */}
          <TableBody>
            {loading ? (
              // Loading state
              Array.from({ length: 5 }).map((_, index) => (
                <SkeletonTableRow key={`skeleton-${index}`} />
              ))
            ) : analysisBlocks.length === 0 ? (
              // Empty state
              <TableRow>
                <TableCell colSpan={8} className="text-center py-20">
                  <div className="space-y-6">
                    <div className="text-6xl animate-pulse">📊</div>
                    <div className="text-xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
                      Tuyệt vời! Không có ai bị chặn phân tích
                    </div>
                    <div className="text-base text-gray-500">
                      Tất cả khách hàng đều có thể được phân tích bình thường
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              // Data rows
              analysisBlocks.map((item, idx) => {
                const blockConfig = getBlockTypeConfig(item.blockType);
                const Icon = blockConfig.icon;
                const isOwner = currentUser?.id === item.user?.id;
                
                return (
                  <TableRow 
                    key={item.id} 
                    className={`group relative transition-all duration-300 border-b border-orange-100 hover:bg-orange-50/50 ${
                      idx % 2 === 0 ? "bg-white" : "bg-orange-50/30"
                    }`}
                  >
                    <TableCell className="min-w-[60px] text-center py-4 px-4">
                      <span className="inline-flex items-center justify-center w-8 h-8 bg-gradient-to-r from-orange-100 to-amber-100 text-orange-700 rounded-full text-sm font-bold shadow-sm">
                        {idx + 1}
                      </span>
                    </TableCell>
                    
                    <TableCell className="min-w-[200px] py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
                        className="font-mono text-xs px-3 py-1.5 bg-orange-50 text-orange-700 border-orange-200 shadow-sm"
                      >
                        {item.zaloContactId}
                      </Badge>
                    </TableCell>
                    
                    <TableCell className="min-w-[140px] text-center py-4 px-4">
                      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${blockConfig.bgColor} ${blockConfig.textColor} border ${blockConfig.borderColor} shadow-sm`}>
                        <Icon className="h-3 w-3" />
                        <span className="text-xs font-medium">{blockConfig.label}</span>
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[280px] py-4 px-4">
                      <div className="max-w-[250px]">
                        {item.reason ? (
                          <div className="flex items-start gap-2">
                            <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5 flex-shrink-0" />
                            <span className="text-sm text-gray-900 leading-relaxed">
                              {item.reason}
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-400 italic">
                              Chưa có lý do
                            </span>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    
                    <TableCell className="min-w-[180px] py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-gradient-to-r from-orange-400 to-amber-400 rounded-full flex items-center justify-center text-white text-xs font-bold shadow-sm">
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
                          disabled={actionLoading}
                          className="h-8 w-8 p-0 rounded-lg transition-all duration-200 shadow-sm text-orange-600 border-orange-300 hover:border-orange-400 bg-white hover:bg-orange-50"
                          title="Chỉnh sửa"
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                        
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteClick(item)}
                          disabled={actionLoading}
                          className="h-8 w-8 p-0 rounded-lg transition-all duration-200 shadow-sm text-red-600 border-red-300 hover:border-red-400 bg-white hover:bg-red-50"
                          title="Xóa khỏi danh sách chặn"
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

      {/* Edit Modal - Simple inline edit */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4">Chỉnh sửa Analysis Block</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Lý do chặn
                </label>
                <textarea
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                  rows={3}
                  placeholder="Nhập lý do chặn..."
                  defaultValue={editingItem.reason || ''}
                  id="edit-reason"
                />
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleEditCancel}
                className="flex-1"
              >
                Hủy
              </Button>
              <Button
                onClick={() => {
                  const reason = (document.getElementById('edit-reason') as HTMLTextAreaElement)?.value;
                  handleEditSave(editingItem.id, { reason: reason.trim() || undefined });
                }}
                disabled={actionLoading}
                className="flex-1 bg-orange-500 hover:bg-orange-600"
              >
                {actionLoading ? 'Đang lưu...' : 'Lưu'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Xác nhận xóa khỏi danh sách chặn"
        message={
          <div className="space-y-4">
            <p className="text-gray-700">Bạn có chắc chắn muốn xóa khách hàng này khỏi danh sách chặn phân tích?</p>
            {deletingItem && (
              <div className="bg-gradient-to-r from-orange-50 to-amber-50 p-4 rounded-lg border border-orange-200">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm">
                    <User className="h-4 w-4 text-gray-500" />
                    <strong className="text-gray-700">Khách hàng:</strong>
                    <span className="text-gray-900">{deletingItem.customerName || "N/A"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <BarChart3 className="h-4 w-4 text-orange-500" />
                    <strong className="text-gray-700">Loại chặn:</strong>
                    <span className="text-gray-900">{getBlockTypeConfig(deletingItem.blockType).label}</span>
                  </div>
                  {deletingItem.reason && (
                    <div className="flex items-start gap-2 text-sm">
                      <MessageSquare className="h-4 w-4 text-orange-500 mt-0.5" />
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
        confirmText="🗑️ Xóa khỏi danh sách"
        cancelText="❌ Hủy"
      />
    </>
  );
}
