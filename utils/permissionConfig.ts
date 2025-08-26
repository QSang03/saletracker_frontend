export const PAGE_PERMISSIONS = {
  "/debt-config": [{ departmentSlug: "cong-no", actions: ["read"] }],
  "/user-management": [
    { departmentSlug: "quan-ly-nguoi-dung", actions: ["read"] },
  ],
  "/reports": [{ departmentSlug: "bao-cao", actions: ["read"] }],
  // Role "view" có thể truy cập tất cả pages nhưng chỉ có quyền read và export
  "/view-role": [{ departmentSlug: "*", actions: ["read", "export"] }],
} as const;

export const COMPONENT_PERMISSIONS = {
  "debt-config-table": [{ departmentSlug: "cong-no", actions: ["read"] }],
  "debt-config-create": [{ departmentSlug: "cong-no", actions: ["create"] }],
  "debt-config-edit": [{ departmentSlug: "cong-no", actions: ["update"] }],
  "debt-config-delete": [{ departmentSlug: "cong-no", actions: ["delete"] }],
  "debt-config-import": [{ departmentSlug: "cong-no", actions: ["import"] }],
  "debt-config-export": [{ departmentSlug: "cong-no", actions: ["export"] }],
  "debt-config-actions": [
    { departmentSlug: "cong-no", actions: ["read", "update", "delete"] },
  ],
  // Role "view" chỉ có quyền read và export cho tất cả components
  "view-role-read": [{ departmentSlug: "*", actions: ["read"] }],
  "view-role-export": [{ departmentSlug: "*", actions: ["export"] }],
} as const;

export const ORDER_PERMISSIONS = {
  "order-table": "dynamic",
  "order-create": "dynamic",
  "order-edit": "dynamic", 
  "order-delete": "dynamic",
  "order-import": "dynamic",
  "order-export": "dynamic",
  "order-actions": "dynamic",
  // Role "view" chỉ có quyền read và export cho orders
  "view-role-order-read": "dynamic",
  "view-role-order-export": "dynamic",
} as const;
