import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Edit,
  Trash2,
  Plus,
  Search,
  MessageSquare,
  Save,
  X,
} from "lucide-react";
import { OrderInquiryPreset } from "@/types";
import { api, orderInquiryPresetsApi } from "@/lib/api";
import { toast } from "sonner";

interface InquiryPresetsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PresetFormData {
  title: string;
  content: string;
}

const InquiryPresetsModal: React.FC<InquiryPresetsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [presets, setPresets] = useState<OrderInquiryPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingPreset, setEditingPreset] = useState<OrderInquiryPreset | null>(
    null
  );
  const [deletingPreset, setDeletingPreset] =
    useState<OrderInquiryPreset | null>(null);
  const [formData, setFormData] = useState<PresetFormData>({
    title: "",
    content: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch presets
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

  // Load presets when modal opens
  useEffect(() => {
    if (isOpen) {
      fetchPresets();
    }
  }, [isOpen]);

  // Filter presets based on search
  const filteredPresets = presets.filter(
    (preset) =>
      preset.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (preset.content &&
        preset.content.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Handle create new preset
  const handleCreate = () => {
    setIsCreating(true);
    setEditingPreset(null);
    setFormData({ title: "", content: "" });
  };

  // Handle edit preset
  const handleEdit = (preset: OrderInquiryPreset) => {
    setEditingPreset(preset);
    setIsCreating(false);
    setFormData({
      title: preset.title,
      content: preset.content || "",
    });
  };

  // Handle save (create or update)
  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error("Vui lòng nhập tiêu đề cho preset");
      return;
    }

    try {
      setSubmitting(true);

      if (editingPreset) {
        // Update existing preset
        await orderInquiryPresetsApi.update(editingPreset.id, {
          title: formData.title.trim(),
          content: formData.content.trim() || undefined,
        });
        toast.success("Cập nhật preset thành công!");
      } else {
        // Create new preset
        await orderInquiryPresetsApi.create({
          title: formData.title.trim(),
          content: formData.content.trim() || undefined,
        });
        toast.success("Tạo preset thành công!");
      }

      // Reset form and refresh list
      setFormData({ title: "", content: "" });
      setIsCreating(false);
      setEditingPreset(null);
      await fetchPresets();
    } catch (error: any) {
      console.error("Error saving preset:", error);
      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi lưu preset"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle delete preset
  const handleDelete = async () => {
    if (!deletingPreset) return;

    try {
      setSubmitting(true);
      await orderInquiryPresetsApi.delete(deletingPreset.id);
      toast.success("Xóa preset thành công!");
      setDeletingPreset(null);
      await fetchPresets();
    } catch (error: any) {
      console.error("Error deleting preset:", error);
      toast.error(
        error?.response?.data?.message || "Có lỗi xảy ra khi xóa preset"
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Handle cancel form
  const handleCancelForm = () => {
    setIsCreating(false);
    setEditingPreset(null);
    setFormData({ title: "", content: "" });
  };

  // Handle modal close
  const handleClose = () => {
    if (isCreating || editingPreset) {
      handleCancelForm();
    }
    onClose();
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="!max-w-[80vw] !max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Quản lý Preset Câu hỏi Thăm dò
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col space-y-4">
            {/* Search and Create Button */}
            <div className="flex items-center gap-3 p-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Tìm kiếm preset..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={isCreating || !!editingPreset || submitting}
                className="shrink-0"
              >
                <span className="flex items-center">
                  <span className="flex items-center">
                    <Plus className="h-4 w-4 mr-2" />
                    Tạo mới
                  </span>
                </span>
              </Button>
            </div>

            {/* Create/Edit Form */}
            {(isCreating || editingPreset) && (
              <div className="bg-gray-50 p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium text-gray-900">
                    {editingPreset ? "Chỉnh sửa Preset" : "Tạo Preset mới"}
                  </h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCancelForm}
                    disabled={submitting}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="title">Tiêu đề *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) =>
                        setFormData({ ...formData, title: e.target.value })
                      }
                      placeholder="Nhập tiêu đề cho preset..."
                      disabled={submitting}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="content">Nội dung câu hỏi</Label>
                    
                    {/* Template Variables Guide */}
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm mt-1 mb-2">
                      <div className="flex items-start gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
                        <div className="flex-1">
                          <div className="font-medium text-blue-800 mb-2">Biến template có thể sử dụng:</div>
                          <div className="grid grid-cols-1 gap-2">
                            <div className="flex items-center justify-between">
                              <div className="text-blue-700">
                                <code className="bg-blue-100 px-1 rounded mr-2">{"{you}"}</code>
                                <span className="text-sm">- Tự động thay thành cách xưng hô với khách hàng</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const textarea = document.getElementById('content') as HTMLTextAreaElement;
                                  const cursorPos = textarea?.selectionStart || formData.content.length;
                                  const newContent = formData.content.slice(0, cursorPos) + '{you}' + formData.content.slice(cursorPos);
                                  setFormData({ ...formData, content: newContent });
                                  // Focus và set cursor sau khi insert
                                  setTimeout(() => {
                                    if (textarea) {
                                      textarea.focus();
                                      textarea.setSelectionRange(cursorPos + 5, cursorPos + 5);
                                    }
                                  }, 10);
                                }}
                                disabled={submitting}
                              >
                                Chèn
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-blue-700">
                                <code className="bg-blue-100 px-1 rounded mr-2">{"{me}"}</code>
                                <span className="text-sm">- Tự động thay thành cách tự xưng (em/anh/chị)</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const textarea = document.getElementById('content') as HTMLTextAreaElement;
                                  const cursorPos = textarea?.selectionStart || formData.content.length;
                                  const newContent = formData.content.slice(0, cursorPos) + '{me}' + formData.content.slice(cursorPos);
                                  setFormData({ ...formData, content: newContent });
                                  // Focus và set cursor sau khi insert
                                  setTimeout(() => {
                                    if (textarea) {
                                      textarea.focus();
                                      textarea.setSelectionRange(cursorPos + 4, cursorPos + 4);
                                    }
                                  }, 10);
                                }}
                                disabled={submitting}
                              >
                                Chèn
                              </Button>
                            </div>
                            <div className="flex items-center justify-between">
                              <div className="text-blue-700">
                                <code className="bg-blue-100 px-1 rounded mr-2">{"{product_name}"}</code>
                                <span className="text-sm">- Tự động thay thành tên sản phẩm</span>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-6 px-2 text-xs"
                                onClick={() => {
                                  const textarea = document.getElementById('content') as HTMLTextAreaElement;
                                  const cursorPos = textarea?.selectionStart || formData.content.length;
                                  const newContent = formData.content.slice(0, cursorPos) + '{product_name}' + formData.content.slice(cursorPos);
                                  setFormData({ ...formData, content: newContent });
                                  // Focus và set cursor sau khi insert
                                  setTimeout(() => {
                                    if (textarea) {
                                      textarea.focus();
                                      textarea.setSelectionRange(cursorPos + 14, cursorPos + 14);
                                    }
                                  }, 10);
                                }}
                                disabled={submitting}
                              >
                                Chèn
                              </Button>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-blue-200 text-xs text-blue-600">
                            💡 <strong>Ví dụ:</strong> "Chào {"{you}"}, {"{me}"} có thể giới thiệu sản phẩm {"{product_name}"} cho anh/chị không ạ?"
                            <br />
                            📌 <strong>Quy tắc:</strong> Nếu {"{you}"} = anh/chị thì {"{me}"} = em; Nếu {"{you}"} = em thì {"{me}"} = anh/chị
                          </div>
                        </div>
                      </div>
                    </div>

                    <Textarea
                      id="content"
                      value={formData.content}
                      onChange={(e) =>
                        setFormData({ ...formData, content: e.target.value })
                      }
                      placeholder="Ví dụ: Chào {you}, {me} có thể giới thiệu sản phẩm {product_name} cho anh/chị không ạ?"
                      rows={4}
                      disabled={submitting}
                      className="mt-1"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button
                      onClick={handleSave}
                      disabled={submitting || !formData.title.trim()}
                      className="min-w-[100px]"
                    >
                      {submitting ? (
                        <div className="flex items-center gap-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white" />
                          Đang lưu...
                        </div>
                      ) : (
                        <span className="flex items-center">
                          <Save className="h-4 w-4 mr-2" />
                          {editingPreset ? "Cập nhật" : "Tạo mới"}
                        </span>
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleCancelForm}
                      disabled={submitting}
                    >
                      Hủy
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Presets Table */}
            <div className="flex-1 overflow-auto border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow className="bg-gray-50">
                    <TableHead className="w-[200px]">Tiêu đề</TableHead>
                    <TableHead>Nội dung</TableHead>
                    <TableHead className="w-[120px] text-center">
                      Thao tác
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, index) => (
                      <TableRow key={`skeleton-${index}`}>
                        <TableCell>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-full" />
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Skeleton className="h-8 w-8" />
                            <Skeleton className="h-8 w-8" />
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : filteredPresets.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="text-center py-8">
                        <div className="flex flex-col items-center gap-2 text-gray-500">
                          <MessageSquare className="h-8 w-8" />
                          <p>
                            {searchTerm
                              ? "Không tìm thấy preset nào"
                              : "Chưa có preset nào"}
                          </p>
                          {!searchTerm && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={handleCreate}
                              disabled={isCreating || !!editingPreset}
                            >
                              <span className="flex items-center">
                                <Plus className="h-4 w-4 mr-2" />
                                Tạo preset đầu tiên
                              </span>
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredPresets.map((preset) => (
                      <TableRow key={preset.id}>
                        <TableCell className="font-medium">
                          <div className="truncate" title={preset.title}>
                            {preset.title}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div
                            className="truncate text-gray-600"
                            title={preset.content || "Không có nội dung"}
                          >
                            {preset.content || (
                              <span className="italic text-gray-400">
                                Không có nội dung
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-center gap-1">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0"
                                  onClick={() => handleEdit(preset)}
                                  disabled={
                                    isCreating || !!editingPreset || submitting
                                  }
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Chỉnh sửa</p>
                              </TooltipContent>
                            </Tooltip>

                            <Tooltip>
                              <TooltipTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                  onClick={() => setDeletingPreset(preset)}
                                  disabled={
                                    isCreating || !!editingPreset || submitting
                                  }
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p>Xóa</p>
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deletingPreset}
        onOpenChange={() => !submitting && setDeletingPreset(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xác nhận xóa</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc chắn muốn xóa preset &quot;
              <strong>{deletingPreset?.title}</strong>&quot;? Hành động này
              không thể hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={submitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white" />
                  Đang xóa...
                </div>
              ) : (
                "Xóa"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default InquiryPresetsModal;
