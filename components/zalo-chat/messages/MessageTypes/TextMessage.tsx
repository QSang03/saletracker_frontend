"use client";

import React from 'react';
import { Message } from '@/types/zalo-chat';
import MessageBubble from '../MessageBubble';

export default function TextMessage({
  message,
  side,
  showSender,
}: {
  message: Message;
  side?: 'left' | 'right';
  showSender?: boolean;
}) {
  return <MessageBubble message={message} side={side} showSender={showSender} />;
}
