"use client";
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { CheckCircle, XCircle, AlertCircle, ArrowRight, Clock, Activity } from 'lucide-react';

interface LogItem {
  id: number;
  oldStatus: number;
  newStatus: number;
  oldStatusLabel: string;
  newStatusLabel: string;
  triggeredAt: string;
}

interface Props {
  userId: number;
  authToken?: string; // nếu truyền thì dùng, không thì lấy từ localStorage
  autoRefreshMs?: number; // giữ để fallback thủ công nếu cần
}

// màu cho badge
const statusBadge = (s: number) => {
  switch (s) {
    case 1: return 'bg-green-50 text-green-700 border-green-200 shadow-sm';
    case 2: return 'bg-red-50 text-red-700 border-red-200 shadow-sm';
    default: return 'bg-gray-50 text-gray-600 border-gray-200 shadow-sm';
  }
};

// icon cho status
const statusIcon = (s: number) => {
  switch (s) {
    case 1: return <CheckCircle className="w-3 h-3" />;
    case 2: return <XCircle className="w-3 h-3" />;
    default: return <AlertCircle className="w-3 h-3" />;
  }
};

// màu cho viền trái của dòng (theo trạng thái mới)
const rowAccent = (s: number) => {
  switch (s) {
    case 1: return 'border-l-green-500';
    case 2: return 'border-l-red-500';
    default: return 'border-l-gray-400';
  }
};

export const ZaloLinkStatusTimeline: React.FC<Props> = ({ userId, authToken, autoRefreshMs = 0 }) => {
  const [logs, setLogs] = useState<LogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [total, setTotal] = useState(0);
  const pages = total === 0 ? 0 : Math.ceil(total / limit);
  const socketRef = useRef<Socket | null>(null);
  const mountedRef = useRef(false);

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      let token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined);
      if (token) {
        try { token = JSON.parse(token as string); } catch {}
      }
    const res = await fetch(`/api/users/${userId}/zalo-link-status-logs?page=${page}&limit=${limit}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      if (!res.ok) throw new Error('Load logs failed');
      const data = await res.json();
    setLogs(data.logs || []);
    if (typeof data.total === 'number') setTotal(data.total);
    if (typeof data.limit === 'number') setLimit(data.limit);
    if (typeof data.page === 'number') setPage(data.page);
    } catch (e: any) {
      setError(e.message || 'Unexpected error');
    } finally {
      setLoading(false);
    }
  };

  // Initial load & websocket setup
  useEffect(() => {
    mountedRef.current = true;
    load();

    let token = authToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : undefined);
    if (token) {
      try { token = JSON.parse(token as string); } catch {}
    }

    const apiUrl = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || '';
    if (apiUrl) {
      const socket = io(apiUrl, {
        transports: ['websocket'],
        auth: token ? { token } : undefined,
      });
      socketRef.current = socket;

      socket.on('connect', () => {
        socket.emit('join-user-room', userId); // join riêng user
      });

      socket.on('zalo_link_status:changed', (payload: any) => {
        if (payload?.userId !== userId) return;
        // prepend new change (optimistic) then optionally reload page 1
        setLogs(prev => [
          {
            id: Date.now(), // temp id (will differ from DB id)
            oldStatus: payload.oldStatus,
            newStatus: payload.newStatus,
            oldStatusLabel: statusLabel(payload.oldStatus),
            newStatusLabel: statusLabel(payload.newStatus),
            triggeredAt: payload.triggeredAt?.replace('T',' ').replace('Z','') || new Date().toISOString(),
          },
          ...prev,
        ]);
        // refresh first page to sync real DB id (small debounce)
        setTimeout(() => {
          if (mountedRef.current) {
            load();
          }
        }, 400);
      });

      socket.on('disconnect', () => {
        // optional: could show a banner
      });
    }

    return () => {
      mountedRef.current = false;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Reload data when page/limit changes (manual pagination navigation)
  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit]);

  const statusLabel = (s: number) => {
    switch (s) {
      case 1: return 'ĐÃ LIÊN KẾT';
      case 2: return 'HUỶ LIÊN KẾT';
      default: return 'KHÁC';
    }
  };

  // Format timestamp từ "2025-09-19 14:53:36.000000" thành "14:53 2025-09-19"
  const formatTimestamp = (timestamp: string) => {
    if (!timestamp) return '-';
    try {
      const date = new Date(timestamp);
      const time = date.toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: false 
      });
      const dateStr = date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
      return `${time} ${dateStr}`;
    } catch (e) {
      return timestamp;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Lịch sử liên kết Zalo</h3>
          <p className="text-sm text-gray-500">Theo dõi trạng thái realtime</p>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-lg">
          <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
          Đang tải dữ liệu...
        </div>
      )}
      
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-200">
          <XCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      {(!loading && logs.length === 0) && (
        <div className="text-center py-8">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Clock className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-sm text-gray-500">Chưa có lịch sử liên kết</p>
        </div>
      )}

      {/* Timeline */}
      {logs.length > 0 && (
        <div className="space-y-4">
          {logs.map((l, index) => (
            <div
              key={l.id}
              className={`relative p-4 rounded-xl border bg-white shadow-sm hover:shadow-md transition-shadow ${rowAccent(l.newStatus)}`}
            >
              {/* Timeline dot */}
              <div className="absolute -left-2 top-6 w-4 h-4 bg-white border-2 border-gray-300 rounded-full"></div>
              
              <div className="flex items-start gap-4">
                {/* Status badges */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${statusBadge(l.oldStatus)}`}>
                      {statusIcon(l.oldStatus)}
                      <span className="font-semibold">{l.oldStatus}</span>
                      <span className="hidden sm:inline text-xs opacity-75">{l.oldStatusLabel}</span>
                    </div>
                    
                    <ArrowRight className="w-4 h-4 text-gray-400" />
                    
                    <div className={`inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border ${statusBadge(l.newStatus)}`}>
                      {statusIcon(l.newStatus)}
                      <span className="font-semibold">{l.newStatus}</span>
                      <span className="hidden sm:inline text-xs opacity-75">{l.newStatusLabel}</span>
                    </div>
                  </div>
                  
                  {/* Timestamp */}
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span className="font-mono">{formatTimestamp(l.triggeredAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {logs.length > 0 && (
        <div className="flex items-center justify-between pt-4 border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Trang <span className="font-semibold">{pages === 0 ? 0 : page}</span> / <span className="font-semibold">{pages}</span> • 
            Tổng <span className="font-semibold">{total}</span> bản ghi
          </div>
          <div className="flex items-center gap-2">
            <button 
              disabled={page <= 1} 
              onClick={() => setPage(p => Math.max(1, p - 1))} 
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Trước
            </button>
            <button 
              disabled={page >= pages} 
              onClick={() => setPage(p => Math.min(pages, p + 1))} 
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Sau
            </button>
            <select 
              value={limit} 
              onChange={e => { setPage(1); setLimit(Number(e.target.value)); }} 
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 bg-white hover:bg-gray-50 transition-colors"
            >
              {[5, 10, 20, 50].map(n => (
                <option key={n} value={n}>{n}/trang</option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};

export default ZaloLinkStatusTimeline;
