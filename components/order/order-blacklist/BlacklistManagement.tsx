import React, { useState, useCallback } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Edit2, Trash2, User, Calendar, MessageSquare } from 'lucide-react';
import { useBlacklist, BlacklistItem } from '@/hooks/useBlacklist';
import EditBlacklistReasonModal from './EditBlacklistReasonModal';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import { formatDistanceToNow } from 'date-fns';
import { vi } from 'date-fns/locale';

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

  // Handle edit
  const handleEditClick = useCallback((item: BlacklistItem) => {
    setEditingItem(item);
    setIsEditModalOpen(true);
  }, []);

  const handleEditSave = useCallback(async (id: number, reason: string) => {
    setActionLoading(true);
    try {
      await onEdit(id, reason);
    } finally {
      setActionLoading(false);
    }
  }, [onEdit]);

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
      console.error('Error deleting blacklist item:', error);
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
        locale: vi 
      });
    } catch {
      return 'N/A';
    }
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  if (blacklists.length === 0) {
    return (
      <div className="text-center py-12">
        <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
        <h3 className="mt-2 text-sm font-medium text-gray-900">
          Không có dữ liệu blacklist
        </h3>
        <p className="mt-1 text-sm text-gray-500">
          Chưa có khách hàng nào bị chặn.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-blue-50 text-blue-700">
              <TableHead className="w-8 text-center">#</TableHead>
              <TableHead className="w-40 pl-2">Khách hàng</TableHead>
              <TableHead className="w-36 text-center">Zalo Contact ID</TableHead>
              <TableHead className="w-56 pl-2">Lý do chặn</TableHead>
              <TableHead className="w-36 pl-2">Người chặn</TableHead>
              <TableHead className="w-28 text-center">Thời gian</TableHead>
              <TableHead className="w-20 text-center">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {blacklists.map((item, idx) => (
              <TableRow key={item.id} className="hover:bg-gray-50">
                <TableCell className="text-center font-semibold py-2 px-1">{idx + 1}</TableCell>
                <TableCell className="pl-2 py-2">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4 text-gray-400" />
                    <span className="font-medium text-gray-900 whitespace-nowrap">{item.customerName || 'N/A'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-2">
                  <Badge variant="outline" className="font-mono text-xs px-2 py-1">
                    {item.zaloContactId}
                  </Badge>
                </TableCell>
                <TableCell className="pl-2 py-2">
                  <div className="max-w-[220px] truncate">
                    {item.reason ? (
                      <span className="text-sm text-gray-900">{item.reason}</span>
                    ) : (
                      <span className="text-sm text-gray-400 italic">Chưa có lý do</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="pl-2 py-2">
                  <div className="text-sm">
                    <span className="font-medium text-gray-900 whitespace-nowrap">{item.user?.fullName || 'N/A'}</span>
                    <div className="text-gray-500 whitespace-nowrap">@{item.user?.username || 'N/A'}</div>
                  </div>
                </TableCell>
                <TableCell className="text-center py-2">
                  <div className="flex items-center justify-center gap-1 text-sm text-gray-500">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center py-2">
                  <div className="flex items-center justify-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditClick(item)}
                      disabled={actionLoading}
                      className="h-8 w-8 p-0"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteClick(item)}
                      disabled={actionLoading}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={isDeleteDialogOpen}
        title="Xác nhận xóa"
        message={
          <div className="space-y-2">
            <p>Bạn có chắc chắn muốn xóa khách hàng này khỏi blacklist?</p>
            {deletingItem && (
              <div className="bg-gray-50 p-3 rounded-md">
                <div className="text-sm">
                  <strong>Khách hàng:</strong> {deletingItem.customerName || 'N/A'}
                </div>
                <div className="text-sm">
                  <strong>Zalo ID:</strong> {deletingItem.zaloContactId}
                </div>
                {deletingItem.reason && (
                  <div className="text-sm">
                    <strong>Lý do:</strong> {deletingItem.reason}
                  </div>
                )}
              </div>
            )}
            <p className="text-sm text-red-600">
              Hành động này không thể hoàn tác.
            </p>
          </div>
        }
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        confirmText="Xóa"
        cancelText="Hủy"
      />
    </>
  );
}
