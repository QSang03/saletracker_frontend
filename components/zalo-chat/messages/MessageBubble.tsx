"use client";

import React from 'react';
import { Message } from '@/types/zalo-chat';

export default function MessageBubble({
  message,
  side,
  showSender,
}: {
  message: Message;
  side?: 'left' | 'right';
  showSender?: boolean;
}) {
  const isRight = side ? side === 'right' : !!message.is_outgoing;
  const showName = showSender ?? !isRight;

  return (
    <div className={`max-w-[72%] ${isRight ? 'ml-auto text-right' : ''}`}>
      <div className={`inline-block px-3 py-2 rounded-2xl ${isRight ? 'bg-primary text-primary-foreground rounded-br-sm' : 'bg-muted rounded-bl-sm'}`}>
        {showName && <div className="text-[11px] opacity-70">{message.sender?.name}</div>}
        <div className="whitespace-pre-wrap break-words text-sm">
          {typeof message.content === 'string' ? message.content : (message as any)?.content?.text ?? JSON.stringify(message.content)}
        </div>
        <div className="text-[10px] opacity-60 mt-1 flex items-center gap-2">
          <span>{message.formatted_timestamp || (message as any).timestamp}</span>
          {isRight && <span className="opacity-80">{message.is_read ? 'Đã đọc' : 'Đã gửi'}</span>}
        </div>
      </div>
    </div>
  );
}
