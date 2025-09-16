"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Save, Play, Clock, Calendar, MessageSquare } from "lucide-react";

interface AutoGreetingConfig {
  enabled: boolean;
  cycleDays: number;
  executionTime: string;
  messageTemplate: string;
}

interface Props {
  onSave?: () => void;
  onRunNow?: () => void;
}

export default function AutoGreetingSettingsCard({ onSave, onRunNow }: Props) {
  const [config, setConfig] = useState<AutoGreetingConfig>({
    enabled: false,
    cycleDays: 10,
    executionTime: "09:00",
    messageTemplate: "🌟 Chào bạn! Chúc bạn ngày mới tràn đầy năng lượng!",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auto-greeting/config');
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
      toast.error('Lỗi tải cấu hình');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/auto-greeting/config', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(config),
      });

      if (response.ok) {
        toast.success('Cấu hình đã được lưu thành công');
        onSave?.();
      } else {
        toast.error('Lỗi lưu cấu hình');
      }
    } catch (error) {
      console.error('Error saving config:', error);
      toast.error('Lỗi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleRunNow = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/auto-greeting/run-now', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        onRunNow?.();
      } else {
        toast.error('Lỗi chạy auto-greeting');
      }
    } catch (error) {
      console.error('Error running auto-greeting:', error);
      toast.error('Lỗi chạy auto-greeting');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Đang tải cấu hình...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toggle Switch */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
        <div className="flex items-center space-x-4">
          <Switch
            checked={config.enabled}
            onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enabled: checked }))}
            className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-blue-500 data-[state=checked]:to-purple-600"
          />
          <div>
            <h3 className="font-semibold text-gray-800">Kích hoạt AI tự động</h3>
            <p className="text-sm text-gray-600">Hệ thống sẽ tự động gửi lời chào thân thiện để duy trì kết nối</p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-medium ${
          config.enabled 
            ? 'bg-green-100 text-green-800' 
            : 'bg-gray-100 text-gray-600'
        }`}>
          {config.enabled ? 'Đang hoạt động' : 'Tạm dừng'}
        </div>
      </div>

      {/* Configuration Form */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Cycle Days */}
        <div className="space-y-2">
          <Label htmlFor="cycleDays" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Calendar className="h-4 w-4" />
            Chu kỳ gửi (ngày)
          </Label>
          <Input
            id="cycleDays"
            type="number"
            min="1"
            max="30"
            value={config.cycleDays}
            onChange={(e) => setConfig(prev => ({ ...prev, cycleDays: parseInt(e.target.value) || 10 }))}
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Số ngày giữa các lần gửi tin nhắn</p>
        </div>

        {/* Execution Time */}
        <div className="space-y-2">
          <Label htmlFor="executionTime" className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Clock className="h-4 w-4" />
            Thời gian thực thi
          </Label>
          <Input
            id="executionTime"
            type="time"
            value={config.executionTime}
            onChange={(e) => setConfig(prev => ({ ...prev, executionTime: e.target.value }))}
            className="border-gray-300 focus:border-blue-500 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500">Thời gian gửi tin nhắn hàng ngày</p>
        </div>
      </div>

      {/* Message Template */}
      <div className="space-y-2">
        <Label htmlFor="messageTemplate" className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <MessageSquare className="h-4 w-4" />
          Template tin nhắn
        </Label>
        <Textarea
          id="messageTemplate"
          value={config.messageTemplate}
          onChange={(e) => setConfig(prev => ({ ...prev, messageTemplate: e.target.value }))}
          placeholder="Nhập template tin nhắn chào..."
          className="min-h-[100px] border-gray-300 focus:border-blue-500 focus:ring-blue-500"
        />
        <p className="text-xs text-gray-500">Tin nhắn mẫu sẽ được gửi cho khách hàng</p>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-4">
        <Button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Đang lưu...' : 'Lưu cài đặt'}
        </Button>
        <Button
          onClick={handleRunNow}
          disabled={saving}
          variant="outline"
          className="flex-1 border-2 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          <Play className="h-4 w-4 mr-2" />
          {saving ? 'Đang chạy...' : 'Chạy ngay'}
        </Button>
      </div>
    </div>
  );
}