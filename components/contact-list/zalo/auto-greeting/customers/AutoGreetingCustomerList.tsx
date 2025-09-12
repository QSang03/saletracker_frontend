"use client";
import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import CustomerHistoryModal from "../CustomerHistoryModal";

export default function AutoGreetingCustomerList() {
  const [openCustomerId, setOpenCustomerId] = useState<number | null>(null);

  const customers = [
    { id: 1, name: "👨‍💼 Nguyễn Văn A", status: "📅 8 ngày trước", badge: "Cần gửi" },
    { id: 2, name: "👩‍💼 Trần Thị B", status: "📅 12 ngày trước", badge: "Khẩn cấp" },
    { id: 3, name: "👨‍💻 Lê Văn C", status: "📅 2 ngày trước", badge: "Ổn định" },
  ];

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
          {customers.map((c) => (
            <div key={c.id} className="customer-item-modern">
              <div className="customer-info-modern">
                <div className="customer-name-modern">{c.name}</div>
                <div className="customer-status-modern">{c.status}</div>
              </div>
              <div className="customer-actions-modern flex items-center gap-2">
                <button
                  className="btn btn-sm"
                  onClick={() => setOpenCustomerId(c.id)}
                >
                  Lịch sử
                </button>
                <div className={`status-badge-modern ${c.badge === 'Khẩn cấp' ? 'status-danger-modern' : c.badge === 'Cần gửi' ? 'status-warning-modern' : 'status-ok-modern'}`}>
                  {c.badge}
                </div>
              </div>
            </div>
          ))}
        </div>

        <CustomerHistoryModal
          customerId={openCustomerId}
          open={!!openCustomerId}
          onClose={() => setOpenCustomerId(null)}
        />
      </CardContent>
    </Card>
  );
}
