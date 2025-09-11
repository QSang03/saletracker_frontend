"use client";
import React from "react";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function PermissionModal({ open, onClose }: Props) {
  if (!open) return null;
  return (
    <div className="modal show" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title">
            <i className="fas fa-user-shield" /> Quản lý quyền chỉnh sửa tin nhắn
          </div>
          <button className="modal-close" onClick={onClose}>
            <i className="fas fa-times" />
          </button>
        </div>
        <div className="modal-body">
          <div className="search-container">
            <input
              type="text"
              className="search-input"
              placeholder="🔍 Tìm kiếm theo tên hoặc email..."
            />
            <select className="filter-select">
              <option value="all">Tất cả quyền</option>
              <option value="allowed">Có quyền</option>
              <option value="denied">Không có quyền</option>
            </select>
          </div>

          <table className="permissions-table">
            <thead>
              <tr>
                <th>Người dùng</th>
                <th>Quyền chỉnh sửa</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {/* Placeholder rows; hook up to data later */}
              <tr>
                <td>
                  <div className="user-info-table">
                    <div className="user-avatar-table">AS</div>
                    <div>
                      <div className="user-name-table">Admin System</div>
                      <div className="user-email-table">admin@saletracker.com</div>
                    </div>
                  </div>
                </td>
                <td>
                  <input
                    list="permission-options-1"
                    className="text-input-with-suggestions"
                    defaultValue="Toàn quyền"
                    placeholder="Nhập hoặc chọn quyền..."
                  />
                  <datalist id="permission-options-1">
                    <option value="Toàn quyền" />
                    <option value="Chỉnh sửa template" />
                    <option value="Chỉ xem" />
                    <option value="Không có quyền" />
                  </datalist>
                </td>
                <td>
                  <label className="permission-switch">
                    <input type="checkbox" defaultChecked />
                    <span className="permission-slider" />
                  </label>
                </td>
                <td>
                  <button className="action-btn btn-delete" disabled style={{ opacity: 0.5, cursor: "not-allowed" }}>
                    <i className="fas fa-trash" /> Xóa
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
