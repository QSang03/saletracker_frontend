"use client";
import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

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
    case 1: return 'bg-green-100 text-green-700 border-green-300';
    case 2: return 'bg-red-100 text-red-700 border-red-300';
    default: return 'bg-gray-100 text-gray-600 border-gray-300';
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

  return (
    <div className="space-y-4">
      <div className="flex items-center">
        <h3 className="text-sm font-semibold">Lịch sử liên kết Zalo (Realtime)</h3>
      </div>
      {loading && <div className="text-xs text-muted-foreground">Đang tải...</div>}
      {error && <div className="text-xs text-red-500">{error}</div>}
      {(!loading && logs.length === 0) && <div className="text-xs text-muted-foreground">Chưa có log</div>}
      <ul className="space-y-2 text-xs">
        {logs.map(l => (
          <li
            key={l.id}
            className={`p-2 rounded border bg-background flex items-center gap-3 border-l-4 ${rowAccent(l.newStatus)}`}
          >
            <div className="flex-1 space-y-0.5">
              <div className="flex items-center gap-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusBadge(l.oldStatus)}`}>
                  {l.oldStatus}<span className="hidden sm:inline">{l.oldStatusLabel}</span>
                </span>
                <span className="text-[10px] opacity-60">➜</span>
                <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded border ${statusBadge(l.newStatus)}`}>
                  {l.newStatus}<span className="hidden sm:inline">{l.newStatusLabel}</span>
                </span>
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">{l.triggeredAt || '-'}</div>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between pt-2 border-t mt-3">
        <div className="text-[10px] text-muted-foreground">Trang {pages === 0 ? 0 : page}/{pages} • {total} log</div>
        <div className="flex items-center gap-1">
          <button disabled={page<=1} onClick={() => setPage(p=>Math.max(1,p-1))} className="text-[10px] px-2 py-1 border rounded disabled:opacity-40">Prev</button>
          <button disabled={page>=pages} onClick={() => setPage(p=>Math.min(pages,p+1))} className="text-[10px] px-2 py-1 border rounded disabled:opacity-40">Next</button>
          <select value={limit} onChange={e=>{setPage(1); setLimit(Number(e.target.value));}} className="text-[10px] border rounded px-1 py-0.5">
            {[5,10,20,50].map(n=> <option key={n} value={n}>{n}/trang</option>)}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ZaloLinkStatusTimeline;
