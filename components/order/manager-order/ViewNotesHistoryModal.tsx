import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderDetail } from "@/types";
import { 
  User as UserIcon, 
  Clock, 
  X, 
  FileText,
  ChevronDown,
  Search
} from "lucide-react";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";

interface ViewNotesHistoryModalProps {
  orderDetail: OrderDetail | null;
  isOpen: boolean;
  onClose: () => void;
}

// Fetch minimal user map id -> fullName for display
async function fetchAllUsersMap(): Promise<Record<number, string>> {
  try {
    const res = await api.get("/users/all-for-filter");
    const arr: Array<{ value: number; label: string }> = res.data || [];
    const map: Record<number, string> = {};
    for (const u of arr) {
      if (u && typeof u.value === "number") map[u.value] = u.label;
    }
    return map;
  } catch {
    return {};
  }
}

const formatTime = (s: string) => {
  try {
    const d = new Date(s);
    if (isNaN(d.getTime())) return s;
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return s;
  }
};

const formatRelativeTime = (dateString: string) => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Vừa xong";
    if (diffMins < 60) return `${diffMins} phút trước`;
    if (diffHours < 24) return `${diffHours} giờ trước`;
    if (diffDays < 7) return `${diffDays} ngày trước`;
    return formatTime(dateString);
  } catch {
    return formatTime(dateString);
  }
};

const getUserInitials = (name: string) => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

const ViewNotesHistoryModal: React.FC<ViewNotesHistoryModalProps> = ({
  orderDetail,
  isOpen,
  onClose,
}) => {
  const [userMap, setUserMap] = useState<Record<number, string>>({});
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!isOpen) return;
    let mounted = true;
    (async () => {
      setLoadingUsers(true);
      const m = await fetchAllUsersMap();
      if (mounted) setUserMap(m);
      setLoadingUsers(false);
    })();
    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const history = useMemo(() => {
    const list = orderDetail?.notes_history || [];
    const sorted = list
      .slice()
      .sort(
        (a, b) =>
          new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
      );
    
    if (searchTerm.trim()) {
      return sorted.filter(item => 
        item.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.user_id && userMap[item.user_id]?.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    return sorted;
  }, [orderDetail, searchTerm, userMap]);

  const toggleExpand = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const shouldTruncate = (content: string) => content && content.length > 100;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0 overflow-hidden">
        <div className="bg-white rounded-lg">
          <DialogHeader className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <DialogTitle className="text-lg font-semibold text-gray-800">
                  Lịch sử ghi chú
                </DialogTitle>
              </div>
            </div>
            <DialogDescription className="text-xs text-gray-500 mt-1">
              Đơn hàng #{orderDetail?.id} • {history.length} thay đổi
            </DialogDescription>
            
            {/* Search bar */}
            {history.length > 0 && (
              <div className="relative mt-3">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-3 h-3" />
                <Input
                  placeholder="Tìm kiếm..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs border-gray-200"
                />
              </div>
            )}
          </DialogHeader>

          <div className="px-4 py-3">
            {(!history || history.length === 0) && !searchTerm && (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-sm">Chưa có lịch sử ghi chú</p>
              </div>
            )}

            {searchTerm && history.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <Search className="w-6 h-6 text-gray-300 mx-auto mb-2" />
                <p className="text-xs">Không tìm thấy "{searchTerm}"</p>
              </div>
            )}

            {history && history.length > 0 && (
              <div className="max-h-[50vh] overflow-y-auto">
                <div className="relative">
                  {/* Timeline line */}
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200"></div>
                  
                  <div className="space-y-3">
                    {history.map((h, idx) => {
                      const userName = h.user_id != null 
                        ? userMap[h.user_id] || `User #${h.user_id}` 
                        : "Hệ thống";
                      const isExpanded = expandedItems.has(idx);
                      const needsTruncation = shouldTruncate(h.content || "");
                      const displayContent = needsTruncation && !isExpanded 
                        ? (h.content || "").slice(0, 100) + "..." 
                        : h.content || "(trống)";

                      return (
                        <div key={idx} className="relative flex gap-3">
                          {/* Avatar circle */}
                          <div className="relative z-10 flex-shrink-0">
                            <div className={`
                              w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-medium
                              ${h.user_id ? 'bg-purple-500' : 'bg-gray-400'}
                            `}>
                              {h.user_id ? getUserInitials(userName) : 'SYS'}
                            </div>
                            {idx === 0 && (
                              <div className="absolute -top-0.5 -right-0.5 w-3 h-3 bg-green-400 rounded-full border border-white"></div>
                            )}
                          </div>

                          {/* Content card */}
                          <div className="flex-1 min-w-0">
                            <div className={`
                              p-3 rounded-lg border text-sm
                              ${idx === 0 
                                ? 'bg-purple-50 border-purple-200' 
                                : 'bg-gray-50 border-gray-200'
                              }
                            `}>
                              {/* Header */}
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-gray-800 text-xs">
                                    {userName}
                                  </span>
                                  {idx === 0 && (
                                    <Badge variant="secondary" className="bg-green-100 text-green-600 text-xs px-1.5 py-0.5 h-auto">
                                      Mới nhất
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {formatRelativeTime(h.changed_at)}
                                </div>
                              </div>

                              {/* Content */}
                              <div className="text-gray-700 text-xs leading-relaxed whitespace-pre-wrap break-words">
                                {displayContent}
                              </div>

                              {/* Expand button */}
                              {needsTruncation && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleExpand(idx)}
                                  className="mt-2 h-auto p-1 text-purple-600 hover:text-purple-700"
                                >
                                  <span className="flex items-center gap-1 text-xs">
                                    {isExpanded ? 'Thu gọn' : 'Xem thêm'}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                                  </span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-100">
              <div className="text-xs text-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Theo thời gian mới nhất</span>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ViewNotesHistoryModal;
