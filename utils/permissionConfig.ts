export const PAGE_PERMISSIONS = {
  "/debt-config": [{ departmentSlug: "cong-no", actions: ["read"] }],
  "/user-management": [
    { departmentSlug: "quan-ly-nguoi-dung", actions: ["read"] },
  ],
  "/reports": [{ departmentSlug: "bao-cao", actions: ["read"] }],
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
} as const;
