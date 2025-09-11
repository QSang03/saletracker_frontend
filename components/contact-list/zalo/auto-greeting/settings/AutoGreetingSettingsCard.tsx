"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  onSave?: () => void;
  onRunNow?: () => void;
}

export default function AutoGreetingSettingsCard({ onSave, onRunNow }: Props) {
  return (
    <Card className="modern-card border-0 shadow-none p-0">
      <CardContent className="p-0">
        <div className="card-header-modern">
          <div className="card-icon-modern">
            <i className="fas fa-cogs" />
          </div>
          <div className="card-title-modern">⚙️ Cấu hình hệ thống</div>
        </div>

        <div className="toggle-premium">
          <div className="toggle-row">
            <div className="toggle-content">
              <h3>
                <i className="fas fa-magic" style={{ color: "#667eea" }} />
                Kích hoạt AI tự động
              </h3>
              <p>
                Hệ thống sẽ tự động gửi lời chào thân thiện để duy trì kết nối
              </p>
            </div>
            {/* Placeholder toggle; wire up to state later */}
            <div className="toggle-switch-premium active">
              <div className="toggle-handle" />
            </div>
          </div>
        </div>

        <div className="form-grid-modern">
          <div className="form-group-modern">
            <label className="form-label-modern">🔄 Chu kỳ gửi (ngày)</label>
            <input type="number" className="form-input-modern" defaultValue={10} min={1} max={13} />
          </div>
          <div className="form-group-modern">
            <label className="form-label-modern">⏰ Thời gian thực thi</label>
            <input type="time" className="form-input-modern" defaultValue="09:00" />
          </div>
          <div className="form-group-modern template-full">
            <label className="form-label-modern">💬 Template tin nhắn</label>
            <input
              list="message-templates"
              className="text-input-with-suggestions"
              placeholder="Nhập hoặc chọn template tin nhắn..."
              defaultValue="🌟 Chào bạn! Chúc bạn ngày mới tràn đầy năng lượng!"
            />
            <datalist id="message-templates">
              <option value="🌟 Chào bạn! Chúc bạn ngày mới tràn đầy năng lượng!" />
              <option value="😊 Xin chào! Bạn có khỏe không?" />
              <option value="👋 Hi! Hôm nay thế nào rồi bạn?" />
              <option value="💪 Chúc bạn một ngày làm việc hiệu quả!" />
              <option value="🌅 Chúc bạn buổi sáng tốt lành!" />
              <option value="🎉 Hy vọng bạn có một ngày thật vui vẻ!" />
            </datalist>
          </div>
        </div>

        <div className="action-buttons">
          <button className="btn-modern btn-primary-modern" onClick={onSave}>
            <i className="fas fa-save" /> 💾 Lưu cài đặt
          </button>
          <button className="btn-modern btn-secondary-modern" onClick={onRunNow}>
            <i className="fas fa-rocket" /> 🚀 Chạy ngay
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
