import React from "react";

interface OrderTrashedManagementProps {
  orders: any[];
  expectedRowCount: number;
  startIndex: number;
  onReload: () => void;
  onRestore?: (order: any) => void;
  onDelete?: (order: any) => void;
}

const OrderTrashedManagement: React.FC<OrderTrashedManagementProps> = ({
  orders,
  expectedRowCount,
  startIndex,
  onReload,
  onRestore,
  onDelete,
}) => {
  return (
    <table className="min-w-full divide-y divide-gray-200">
      <thead>
        <tr>
          <th className="px-4 py-2">STT</th>
          <th className="px-4 py-2">Mã đơn</th>
          <th className="px-4 py-2">Khách hàng</th>
          <th className="px-4 py-2">Ngày tạo</th>
          <th className="px-4 py-2">Tổng tiền</th>
          <th className="px-4 py-2">Trạng thái</th>
          <th className="px-4 py-2">Thao tác</th>
        </tr>
      </thead>
      <tbody>
        {orders.length === 0 ? (
          <tr>
            <td colSpan={7} className="text-center py-6 text-gray-400">
              Không có đơn hàng nào trong thùng rác.
            </td>
          </tr>
        ) : (
          orders.map((order, idx) => (
            <tr key={order.id || idx} className="border-b">
              <td className="px-4 py-2">{startIndex + idx + 1}</td>
              <td className="px-4 py-2">{order.code || order.id}</td>
              <td className="px-4 py-2">{order.customer_name || order.customerName || ""}</td>
              <td className="px-4 py-2">{order.created_at ? new Date(order.created_at).toLocaleDateString("vi-VN") : ""}</td>
              <td className="px-4 py-2">{order.total_amount ? order.total_amount.toLocaleString() : 0}</td>
              <td className="px-4 py-2">{order.status || ""}</td>
              <td className="px-4 py-2">
                {onRestore && (
                  <button
                    className="text-green-600 hover:underline mr-2"
                    onClick={() => onRestore(order)}
                  >
                    Khôi phục
                  </button>
                )}
                {onDelete && (
                  <button
                    className="text-red-600 hover:underline"
                    onClick={() => onDelete(order)}
                  >
                    Xóa vĩnh viễn
                  </button>
                )}
              </td>
            </tr>
          ))
        )}
        {orders.length < expectedRowCount &&
          Array.from({ length: expectedRowCount - orders.length }).map((_, i) => (
            <tr key={"empty-" + i} className="border-b">
              <td colSpan={7} className="py-2">&nbsp;</td>
            </tr>
          ))}
      </tbody>
    </table>
  );
};

export default OrderTrashedManagement;
