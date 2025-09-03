"use client";

import React, { useState } from 'react';
import { useScheduleEditing } from '@/hooks/useScheduleEditing';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit3, Square, RefreshCw, Users } from 'lucide-react';

export const TestEditingPanel: React.FC = () => {
  const { 
    editingUsers, 
    myEditingCell, 
    startEditing, 
    stopEditing, 
    getEditingUsers,
    forceRefreshEditingUsers 
  } = useScheduleEditing();
  
  const [testCellId, setTestCellId] = useState('test-cell-1');

  return (
    <div className="p-4 space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Test Editing State Persistence
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Test Controls */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cell ID:</label>
              <Input
                value={testCellId}
                onChange={(e) => setTestCellId(e.target.value)}
                placeholder="Nhập cell ID..."
              />
            </div>
            
            <div className="flex items-end gap-2">
              <Button
                onClick={() => startEditing(testCellId)}
                disabled={!testCellId}
                className="flex-1"
              >
                <Edit3 className="w-4 h-4 mr-2" />
                Bắt đầu sửa
              </Button>
              
              <Button
                onClick={() => stopEditing(testCellId)}
                disabled={!myEditingCell}
                variant="outline"
                className="flex-1"
              >
                <Square className="w-4 h-4 mr-2" />
                Dừng sửa
              </Button>
            </div>
          </div>

          {/* Debug Buttons */}
          <div className="flex gap-2">
            <Button
              onClick={getEditingUsers}
              variant="secondary"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh List
            </Button>
            
            <Button
              onClick={forceRefreshEditingUsers}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Force Refresh Users
            </Button>
          </div>

          {/* Current State */}
          <div className="p-3 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Trạng thái hiện tại:</h4>
            <div className="text-sm space-y-1">
              <div>Đang chỉnh sửa: <span className="font-mono">{myEditingCell || 'Không có'}</span></div>
              <div>Cell ID test: <span className="font-mono">{testCellId}</span></div>
            </div>
          </div>

          {/* Editing Users List */}
          <div className="p-3 bg-orange-50 dark:bg-orange-950/20 rounded-lg">
            <h4 className="font-medium mb-2 text-orange-900 dark:text-orange-100">
              Người đang sửa ({editingUsers.length}):
            </h4>
            <div className="space-y-1">
              {editingUsers.length === 0 ? (
                <p className="text-sm text-orange-700 dark:text-orange-300">Không có ai</p>
              ) : (
                editingUsers.map((user) => (
                  <div key={user.userId} className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {user.userName}
                    </Badge>
                    <span className="text-xs text-orange-600 dark:text-orange-400">
                      {user.cellId}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(user.startedAt).toLocaleTimeString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Instructions */}
          <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <h4 className="font-medium mb-2 text-blue-900 dark:text-blue-100">Hướng dẫn test:</h4>
            <ol className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-decimal list-inside">
              <li>Nhập cell ID và click "Bắt đầu sửa"</li>
              <li>F5 trang và kiểm tra xem editing state có được restore không</li>
              <li>Click "Force Refresh Users" để cập nhật danh sách</li>
              <li>Click "Refresh List" để cập nhật danh sách</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
