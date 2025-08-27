// Mapping giữa URL và permissions để kiểm tra quyền truy cập cho role view
export const URL_PERMISSION_MAPPING = {
  // 📊 THỐNG KÊ
  '/dashboard/transactions': { name: 'thong-ke-giao-dich', action: 'read' },
  '/dashboard/debts': { name: 'thong-ke-cong-no', action: 'read' },
  
  // 💰 GIAO DỊCH
  '/dashboard/manager-order': { name: 'quan-ly-don-hang', action: 'read' },
  '/dashboard/order-blacklist': { name: 'quan-ly-blacklist', action: 'read' },
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
  '/dashboard/products': { name: 'quan-ly-san-pham', action: 'read' },
  
  // 👤 TÀI KHOẢN
  '/dashboard/manage': { name: 'quan-ly-tai-khoan', action: 'read' },
  '/dashboard/department': { name: 'quan-ly-bo-phan', action: 'read' },
  '/dashboard/zalo': { name: 'quan-ly-zalo', action: 'read' },
  '/dashboard/roles': { name: 'phan-quyen', action: 'read' },
  
  // ℹ️ THÔNG TIN
  '/dashboard/link-account': { name: 'lien-ket-tai-khoan', action: 'read' },
  '/dashboard/zalo-nkc': { name: 'zalo-nkc', action: 'read' },
  
  // ⚙️ CÀI ĐẶT
  '/dashboard/config-system': { name: 'cau-hinh-he-thong', action: 'read' },
  '/dashboard/service-monitor': { name: 'cau-hinh-server', action: 'read' },
  '/dashboard/gpt-oss': { name: 'chat-gpt-oss', action: 'read' },
} as const;

// Helper function để lấy permission từ URL
export function getPermissionFromUrl(url: string): { name: string; action: string } | null {
  return URL_PERMISSION_MAPPING[url as keyof typeof URL_PERMISSION_MAPPING] || null;
}

// Helper function để kiểm tra user có quyền truy cập URL không
export function canAccessUrl(url: string, userPermissions: Array<{ name: string; action: string }>): boolean {
  const permission = getPermissionFromUrl(url);
  if (!permission) return true; // Nếu không có mapping, cho phép truy cập
  // Accept variants so frontend mapping (thong-ke-*) and simple slugs both work
  const { name, action } = permission;
  // Derive slug from mapping name: if mapping already uses thong-ke- or thong_ke_ prefix, strip it
  const slug = name.replace(/^thong[-_]ke[-_]/, '');
  const alt1 = `thong-ke-${slug}`;
  const alt2 = `thong_ke_${slug}`;

  return userPermissions.some(p => {
    const pname = p.name || '';
    const matchesName = pname === name || pname === slug || pname === alt1 || pname === alt2;
    return matchesName && p.action === action;
  });
}
