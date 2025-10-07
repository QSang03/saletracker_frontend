"use client";

import React, { useMemo, useState } from "react";
import {
  CommandDialog,
  CommandInput,
  CommandList,
  CommandGroup,
  CommandItem,
  CommandEmpty,
  CommandSeparator,
} from "@/components/ui/command";
import { useDebounce } from "@/hooks/useDebounce";
import { useSearch } from "@/hooks/zalo-chat/useSearch";
import { Conversation, Message, Contact } from "@/types/zalo-chat";

type SearchData = {
  results?: {
    conversations?: Conversation[];
    messages?: Message[];
    contacts?: Contact[];
  };
};

interface SearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  userId?: number;
  onSelectConversation?: (c: Conversation) => void;
  onApplyQuery?: (q: string) => void;
  onSelectMessage?: (m: Message, q: string) => void;
}

export default function SearchDialog({
  isOpen,
  onOpenChange,
  userId,
  onSelectConversation,
  onApplyQuery,
  onSelectMessage,
}: SearchDialogProps) {
  const [query, setQuery] = useState("");
  const debounced = useDebounce(query, 300);

  const params = useMemo(() => {
    const q = debounced.trim();
    if (!q) return null;
    return {
      q,
      user_id: userId,
      type: "all" as const,
      limit: 20,
    };
  }, [debounced, userId]);

  const { data, isLoading } = useSearch<SearchData>(params);

  const conversations = data?.results?.conversations || [];
  const messages = data?.results?.messages || [];
  const contacts = data?.results?.contacts || [];

  return (
    <CommandDialog open={isOpen} onOpenChange={onOpenChange} title="Tìm kiếm" description="Tìm trong Zalo Chat">
      <CommandInput
        placeholder="Tìm kiếm..."
        value={query}
        onValueChange={(val) => setQuery(val)}
        autoFocus
      />
      <CommandList>
        <CommandEmpty>{isLoading ? "Đang tìm..." : "Nhập từ khóa để bắt đầu"}</CommandEmpty>

        {conversations.length > 0 && (
          <CommandGroup heading={`Cuộc hội thoại (${conversations.length})`}>
            {conversations.map((c) => (
              <CommandItem key={`conv-${c.id}`} value={`conv-${c.id}`} onSelect={() => {
                if (onSelectConversation) onSelectConversation(c);
                if (onApplyQuery) onApplyQuery(query.trim());
                onOpenChange(false);
              }}>
                <div className="flex items-center gap-2 w-full">
                  <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                    {c.participant?.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={c.participant.avatar} alt={c.conversation_name} className="w-full h-full object-cover" />
                    ) : (
                      <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium truncate">{c.conversation_name}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {c.last_message?.sender_name ? `${c.last_message.sender_name}: ` : ""}
                      {typeof c.last_message?.content === "string" ? c.last_message.content : ""}
                    </div>
                  </div>
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {messages.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Tin nhắn (${messages.length})`}>
              {messages.map((m) => (
                <CommandItem key={`msg-${m.id}`} value={`msg-${m.id}`} onSelect={() => {
                  const q = query.trim();
                  if (onApplyQuery) onApplyQuery(q);
                  if (onSelectMessage) onSelectMessage(m, q);
                  onOpenChange(false);
                }}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs">
                      {m.sender?.name?.slice(0, 2) || "TN"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">
                        {typeof m.content === "string" ? m.content : String(m.content)}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">
                        {new Date(m.timestamp).toLocaleString("vi-VN")}
                      </div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}

        {contacts.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading={`Danh bạ (${contacts.length})`}>
              {contacts.map((ct) => (
                <CommandItem key={`ct-${ct.id}`} value={`ct-${ct.id}`} onSelect={() => {
                  if (onApplyQuery) onApplyQuery(query.trim());
                  onOpenChange(false);
                }}>
                  <div className="flex items-center gap-2 w-full">
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                      {ct.avatar ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={ct.avatar} alt={ct.display_name} className="w-full h-full object-cover" />
                      ) : (
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{ct.display_name}</div>
                      <div className="text-xs text-muted-foreground truncate">{ct.account_display_name}</div>
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  );
}
