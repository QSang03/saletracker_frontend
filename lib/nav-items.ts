// Định nghĩa navItems dùng chung cho sidebar, middleware, layout
export const navItems = [
  {
    title: "Thống kê",
    icon: "FileBarChart2",
    items: [
      { title: "Thống kê giao dịch", url: "/dashboard/transactions", roles: ["admin", "analysis", "PM", "view"] },
      { title: "Thống kê công nợ", url: "/dashboard/debts", roles: ["admin", "manager-cong-no", "user-cong-no", "view"] },
    ],
  },
  {
  title: "Giao dịch",
  icon: "ListOrdered",
  items: [
    { 
      title: "Quản lý đơn hàng", 
      url: "/dashboard/manager-order", 
      roles: ["admin", "analysis", "view", "PM"]
    },
    { title: "Quản lý Blacklist", url: "/dashboard/order-blacklist", roles: ["admin", "analysis", "view"] },
    { title: "Quản lý Chặn Phân Tích", url: "/dashboard/analysis-block-management", roles: ["admin"] },
    { title: "Quản lý Đơn hàng đã xóa", url: "/dashboard/order-trashed", roles: ["admin", "analysis", "view"] },
    { title: "Quản lý Đơn hàng đã ẩn", url: "/dashboard/order-hidden", roles: ["admin", "analysis", "view"] },
  ],
  },
  {
    title: "Công nợ",
    icon: "Briefcase",
    items: [
      { title: "Quản lý công nợ", url: "/dashboard/manager-debt", roles: ["admin", "manager-cong-no", "user-cong-no", "view"] },
      { title: "Cấu hình nhắc nợ", url: "/dashboard/debt-settings", roles: ["admin", "manager-cong-no", "user-cong-no", "view"] },
    ],
  },
  {
    title: "Chiến dịch",
    icon: "MessageCircle",
    items: [
      { title: "Cấu hình gửi tin nhắn", url: "/dashboard/campaigns", roles: ["admin", "manager-chien-dich", "user-chien-dich", "view"] },
      { title: "Lịch chiến dịch", url: "/dashboard/campaign-schedules", roles: ["admin", "manager-chien-dich", "user-chien-dich", "scheduler", "view"] },
    ],
  },
  {
    title: "Product Manager",
    icon: "Terminal",
    items: [
      { title: "Quản lý giao dịch", url: "/dashboard/manager-pm-transactions", roles: ["admin", "PM", "view"] },
      { title: "Đơn hàng chưa có mã", url: "/dashboard/pm-orders-no-product", roles: ["admin", "PM", "view"] },
      { title: "Quản lý sản phẩm", url: "/dashboard/products", roles: ["admin", "pm", "view"] },
    ],
  },
  {
    title: "Tài khoản",
    icon: "UserCog",
    items: [
      { title: "Quản lý tài khoản", url: "/dashboard/manage", roles: ["admin", "manager", "view"] },
      { title: "Quản lý bộ phận", url: "/dashboard/department", roles: ["admin", "view"] },
      { title: "Quản lý zalo", url: "/dashboard/zalo", roles: ["admin", "manager", "view"] },
      // { title: "Quản lý contact-list", url: "/dashboard/auto-reply", roles: ["admin"] },
      // { title: "Quản lý contact-list", url: "/dashboard/auto-reply" },
      { title: "Phân quyền", url: "/dashboard/roles", roles: ["admin"] },
    ],
  },
  {
    title: "Thông tin",
    icon: "UserCircle",
    items: [
      { title: "Liên kết tài khoản", url: "/dashboard/link-account" },
      { title: "Cấu hình khách hàng", url: "/dashboard/auto-greeting" },
      { title: "Zalo NKC", url: "/dashboard/zalo-nkc", roles: ["admin", "view"] },
    ],
  },
  {
    title: "Cài đặt",
    icon: "Wrench",
    items: [
      { title: "Cấu hình hệ thống", url: "/dashboard/config-system", roles: ["admin"] },
      { title: "Cấu hình server", url: "/dashboard/service-monitor", roles: ["admin"] },
      { title: "Chat GPT OSS", url: "/dashboard/gpt-oss", roles: ["admin"] },
    ],
  },
];
