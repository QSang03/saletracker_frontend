"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useSearch } from '@/hooks/zalo-chat/useSearch';
import { P } from '@/components/common/PDynamic';

interface SearchBarProps {
  userId: number;
  onApply?: (query: string) => void;
}

export default function SearchBar({ userId, onApply }: SearchBarProps) {
  const [q, setQ] = useState('');
  const [committed, setCommitted] = useState('');
  const [debounced, setDebounced] = useState('');
  const [isDebouncing, setIsDebouncing] = useState(false);

  const params = useMemo(() => {
    if (!debounced.trim()) return null;
    return { q: debounced.trim(), user_id: userId, type: 'all' as const, limit: 20 };
  }, [debounced, userId]);

  const { data, isLoading, error } = useSearch(params);

  useEffect(() => {
    if (debounced && onApply) onApply(debounced);
  }, [debounced, onApply]);

  useEffect(() => {
    const value = q.trim();
    if (!value) {
      setDebounced('');
      setIsDebouncing(false);
      return;
    }
    setIsDebouncing(true);
    const t = setTimeout(() => {
      setDebounced(value);
      setIsDebouncing(false);
    }, 2000);
    return () => {
      clearTimeout(t);
      setIsDebouncing(false);
    };
  }, [q]);

  return (
    <P permission={{ departmentSlug: 'chat', action: 'search' }}>
      <div className="w-full">
        <div className="flex gap-2">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') setDebounced(q.trim());
            }}
            placeholder="Tìm kiếm (chờ 2s để gọi)..."
            className="w-full px-3 py-2 rounded-md bg-muted text-foreground outline-none"
          />
          <button className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm" onClick={() => setDebounced(q.trim())}>
            Tìm
          </button>
        </div>
        {isDebouncing && <div className="text-xs opacity-60 mt-1">Đang chờ 2s…</div>}
        {isLoading && debounced && <div className="text-xs opacity-60 mt-1">Đang tìm...</div>}
        {error && <div className="text-xs text-red-500 mt-1">{error}</div>}
        {/* Optional: you can render quick preview results here if needed */}
        {data?.results && Array.isArray(data.results?.messages) && data.results.messages.length > 0 && (
          <div className="text-[11px] opacity-70 mt-1">{data.results.messages.length} kết quả tin nhắn</div>
        )}
      </div>
    </P>
  );
}


