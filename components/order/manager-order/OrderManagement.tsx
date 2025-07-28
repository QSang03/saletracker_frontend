import React, { useState, useEffect } from "react";
import { Order } from "@/types";

interface OrderManagementProps {
  orders: Order[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  onEdit?: (order: Order, data: any) => void;
  onDelete?: (order: Order) => void;
}

const OrderManagement: React.FC<OrderManagementProps> = ({
  orders,
  expectedRowCount,
  startIndex,
  onReload,
  onEdit,
  onDelete,
}) => {
  const safeOrders = Array.isArray(orders) ? orders : [];

  // Custom hook lấy tên khách hàng từ zalo_message_id (gọi đúng API backend)
  const useCustomerName = (zalo_message_id?: string) => {
    const [customer, setCustomer] = useState<string>("");
    useEffect(() => {
      if (!zalo_message_id) {
        setCustomer("");
        return;
      }
      fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/customer-from-zalo-message/${zalo_message_id}`)
        .then(res => res.json())
        .then(data => {
          if (data && data.zalo_contact_id && data.zalo_contact_id !== 0) {
            setCustomer(data.name || data.full_name || data.sender_id || "Không xác định");
          } else {
            setCustomer("Không xác định");
          }
        })
        .catch(() => setCustomer("Không xác định"));
    }, [zalo_message_id]);
    return customer;
  };

  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          <th className="px-4 py-2">Mã đơn</th>
          <th className="px-4 py-2">Gia Hạn</th>
          <th className="px-4 py-2">Khách hàng</th>
          <th className="px-4 py-2">Ngày tạo</th>
          <th className="px-4 py-2">Tổng tiền</th>
          <th className="px-4 py-2">Trạng thái</th>
          <th className="px-4 py-2">Customer Request</th>
          <th className="px-4 py-2">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {safeOrders.length === 0 && (
          <tr>
            <td colSpan={8} className="text-center py-2 text-xs text-gray-400">
              <div>Không có dữ liệu đơn hàng</div>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-500">Chi tiết debug</summary>
                <pre style={{whiteSpace: 'pre-wrap', wordBreak: 'break-all', fontSize: '10px'}}>
                  Original orders: {JSON.stringify(orders, null, 2)}
                  {'\n'}Safe orders: {JSON.stringify(safeOrders, null, 2)}
                  {'\n'}Safe orders length: {safeOrders.length}
                </pre>
              </details>
            </td>
          </tr>
        )}
        {safeOrders.length > 0 && safeOrders.map((order, idx) => (
          Array.isArray(order.details) && order.details.length > 0 ? order.details.map((detail, detailIdx) => (
            <tr key={`${order.id || order.order_id || order.code || idx}-detail-${detailIdx}`} className="border-b">
              <td className="px-4 py-2">{order.id || order.order_id || order.code || 'N/A'}</td>
              <td className="px-4 py-2">{detail.extended || ''}</td>
              <td className="px-4 py-2">{detail.customer_name || ''}</td>
              <td className="px-4 py-2">{detail.created_at ? new Date(detail.created_at).toLocaleDateString("vi-VN") : 'N/A'}</td>
              <td className="px-4 py-2">{detail.unit_price ? Number(detail.unit_price).toLocaleString() : '0'}</td>
              <td className="px-4 py-2">{detail.status || ''}</td>
              <td className="px-4 py-2">{detail.customer_request_summary || ''}</td>
              <td className="px-4 py-2">
                {onEdit && (
                  <button
                    className="text-blue-600 hover:underline mr-2"
                    onClick={() => onEdit(order, detail)}
                  >
                    Sửa
                  </button>
                )}
                {onDelete && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => onDelete(order)}
                  >
                    Xóa
                  </button>
                )}
              </td>
            </tr>
          )) : (
            <tr key={order.id || order.order_id || order.code || idx} className="border-b">
              <td className="px-4 py-2">{order.id || order.order_id || order.code || 'N/A'}</td>
              <td colSpan={7} className="text-center py-2 text-xs text-gray-400">Không có chi tiết sản phẩm</td>
            </tr>
          )
        ))}
        {safeOrders.length < expectedRowCount &&
          Array.from({ length: expectedRowCount - safeOrders.length }).map((_, i) => (
            <tr key={"empty-" + i} className="border-b">
              <td colSpan={8} className="py-2">&nbsp;</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

export default OrderManagement;
