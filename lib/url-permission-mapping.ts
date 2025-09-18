// Mapping giữa URL và permissions để kiểm tra quyền truy cập cho role view
// Đồng bộ với tên permission trong giao diện phân quyền
export const URL_PERMISSION_MAPPING = {
  // 📊 THỐNG KÊ
  '/dashboard/transactions': { name: 'thong-ke-giao-dich', action: 'read' },
  '/dashboard/debts': { name: 'thong-ke-cong-no', action: 'read' },
  
  // 💰 GIAO DỊCH
  '/dashboard/manager-order': { name: 'quan-ly-don-hang', action: 'read' },
  '/dashboard/order-blacklist': { name: 'quan-ly-blacklist', action: 'read' },
  '/dashboard/analysis-block-management': { name: 'analysis-block-management', action: 'read' },
  '/dashboard/order-trashed': { name: 'don-hang-da-xoa', action: 'read' },
  '/dashboard/order-hidden': { name: 'don-hang-da-an', action: 'read' },
  
  // 💳 CÔNG NỢ
  '/dashboard/manager-debt': { name: 'cong-no', action: 'read' },
  '/dashboard/debt-settings': { name: 'cau-hinh-nhac-no', action: 'read' },
  
  // 📢 CHIẾN DỊCH
  '/dashboard/campaigns': { name: 'cau-hinh-gui-tin-nhan', action: 'read' },
  '/dashboard/campaign-schedules': { name: 'lich-chien-dich', action: 'read' },
  
  // 👨‍💼 PRODUCT MANAGER
  '/dashboard/manager-pm-transactions': { name: 'quan-ly-giao-dich-pm', action: 'read' },
  '/dashboard/pm-orders-no-product': { name: 'don-hang-chua-co-ma', action: 'read' },
  '/dashboard/products': { name: 'quan-ly-san-pham', action: 'read' },
  
  // 👤 TÀI KHOẢN
  '/dashboard/manage': { name: 'quan-ly-tai-khoan', action: 'read' },
  '/dashboard/department': { name: 'quan-ly-bo-phan', action: 'read' },
  '/dashboard/zalo': { name: 'quan-ly-zalo', action: 'read' },
  '/dashboard/roles': { name: 'roles', action: 'read' },
  
  // ℹ️ THÔNG TIN
  '/dashboard/link-account': { name: 'link-account', action: 'read' },
  '/dashboard/auto-greeting': { name: 'auto-greeting', action: 'read' },
  '/dashboard/zalo-nkc': { name: 'zalo-nkc', action: 'read' },
  
  // ⚙️ CÀI ĐẶT
  '/dashboard/config-system': { name: 'config-system', action: 'read' },
  '/dashboard/service-monitor': { name: 'service-monitor', action: 'read' },
  '/dashboard/gpt-oss': { name: 'gpt-oss', action: 'read' },
} as const;

// Helper function để lấy permission từ URL
export function getPermissionFromUrl(url: string): { name: string; action: string } | null {
  return URL_PERMISSION_MAPPING[url as keyof typeof URL_PERMISSION_MAPPING] || null;
}

// Helper function để kiểm tra user có quyền truy cập URL không
export function canAccessUrl(url: string, userPermissions: Array<{ name: string; action: string }>): boolean {
  const permission = getPermissionFromUrl(url);
  if (!permission) return true; // Nếu không có mapping, cho phép truy cập
  
  const { name, action } = permission;
  
  // Kiểm tra exact match với permission name
  return userPermissions.some(p => {
    return p.name === name && p.action === action;
  });
}
