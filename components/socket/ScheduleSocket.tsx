// components/socket/ScheduleSocket.tsx
"use client";

import { memo, useCallback } from "react";
import { useWSHandler } from "@/hooks/useWSHandler";

interface ScheduleSocketProps {
  onPresenceUpdate?: (data: {
    userId: number;
    userName: string;
    departmentId: number;
    departmentName: string;
    position: { x: number; y: number; dayIndex?: number; time?: string };
    isEditing: boolean;
    editingField?: string;
  }) => void;
  
  onEditStart?: (data: {
    userId: number;
    userName: string;
    departmentId: number;
    fieldId: string;
    fieldType: 'calendar_cell' | 'form_field';
    coordinates?: { dayIndex: number; time: string } | { date: number; month: number; year: number };
  }) => void;
  
  onEditRenew?: (data: {
    userId: number;
    fieldId: string;
    expiresAt: string;
  }) => void;
  
  onEditStop?: (data: {
    userId: number;
    fieldId: string;
  }) => void;
  
  onPreviewPatch?: (data: {
    userId: number;
    userName: string;
    departmentId: number;
    fieldId: string;
    content: string;
    selection?: { start: number; end: number };
  }) => void;
  
  onConflictDetected?: (data: {
    scheduleId: string;
    conflictingUsers: Array<{
      userId: number;
      userName: string;
      departmentId: number;
    }>;
    conflictType: 'version' | 'edit_session';
  }) => void;
  
  onVersionUpdate?: (data: {
    scheduleId: string;
    version: number;
    updatedBy: number;
    updatedAt: string;
  }) => void;
}

export const ScheduleSocket = memo(function ScheduleSocket({
  onPresenceUpdate,
  onEditStart,
  onEditRenew,
  onEditStop,
  onPreviewPatch,
  onConflictDetected,
  onVersionUpdate,
}: ScheduleSocketProps) {
  
  // Presence tracking
  useWSHandler('schedule:presence:update', (data: any) => {
    onPresenceUpdate?.(data);
  });

  // Edit session management
  useWSHandler('schedule:edit:start', (data: any) => {
    onEditStart?.(data);
  });

  useWSHandler('schedule:edit:renew', (data: any) => {
    onEditRenew?.(data);
  });

  useWSHandler('schedule:edit:stop', (data: any) => {
    onEditStop?.(data);
  });

  // Live preview
  useWSHandler('schedule:preview:patch', (data: any) => {
    onPreviewPatch?.(data);
  });

  // Conflict detection
  useWSHandler('schedule:conflict:detected', (data: any) => {
    onConflictDetected?.(data);
  });

  // Version management
  useWSHandler('schedule:version:update', (data: any) => {
    onVersionUpdate?.(data);
  });

  return null;
});
