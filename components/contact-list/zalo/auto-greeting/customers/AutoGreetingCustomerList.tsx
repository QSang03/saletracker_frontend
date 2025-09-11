"use client";
import React from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function AutoGreetingCustomerList() {
  return (
    <Card className="modern-card border-0 shadow-none p-0">
      <CardContent className="p-0">
        <div className="card-header-modern">
          <div className="card-icon-modern">
            <i className="fas fa-address-book" />
          </div>
          <div className="card-title-modern">👥 Quản lý khách hàng</div>
        </div>

        <div
          className="upload-area"
          onClick={() => {
            // Hook into a hidden input if desired later
          }}
        >
          <div className="upload-icon-wrapper">
            <i className="fas fa-cloud-upload-alt" />
          </div>
          <div className="upload-title">📤 Upload danh sách</div>
          <div className="upload-subtitle">
            Kéo thả file Excel (.xlsx) hoặc click để chọn file
          </div>
        </div>

        <div className="customer-list-modern">
          <div className="customer-item-modern">
            <div className="customer-info-modern">
              <div className="customer-name-modern">👨‍💼 Nguyễn Văn A</div>
              <div className="customer-status-modern">📅 8 ngày trước</div>
            </div>
            <div className="status-badge-modern status-warning-modern">Cần gửi</div>
          </div>
          <div className="customer-item-modern">
            <div className="customer-info-modern">
              <div className="customer-name-modern">👩‍💼 Trần Thị B</div>
              <div className="customer-status-modern">📅 12 ngày trước</div>
            </div>
            <div className="status-badge-modern status-danger-modern">Khẩn cấp</div>
          </div>
          <div className="customer-item-modern">
            <div className="customer-info-modern">
              <div className="customer-name-modern">👨‍💻 Lê Văn C</div>
              <div className="customer-status-modern">📅 2 ngày trước</div>
            </div>
            <div className="status-badge-modern status-ok-modern">Ổn định</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
