import { useContext } from "react";
import { AuthContext } from "../contexts/AuthContext";

export const useViewRole = () => {
  const { user } = useContext(AuthContext);

  const isViewRole = user?.roles?.some((role: any) => role.name === "view") || false;

  // Helper functions để ẩn/hiển thị UI elements
  const hideEditButtons = isViewRole;
  const hideDeleteButtons = isViewRole;
  const hideCreateButtons = isViewRole;
  const hideImportButtons = isViewRole;
  const showExportButtons = true; // Luôn hiển thị export cho role view
  const hideFormInputs = isViewRole;
  const hideDropdowns = isViewRole;
  const hideModals = isViewRole;
  const hideActionButtons = isViewRole;
  const hideBulkActions = isViewRole;
  const showFilterControls = true; // Luôn hiển thị filter
  const showPaginationControls = true; // Luôn hiển thị pagination
  const showSearchInputs = true; // Luôn hiển thị search
  const hideSettingsButtons = isViewRole;
  const hideUserManagementActions = isViewRole;
  const hideRoleManagementActions = isViewRole;

  // Helper function để hiển thị thông báo "Chỉ xem"
  const getViewOnlyMessage = () => {
    return isViewRole ? "Chỉ xem" : "";
  };

  // Helper function để kiểm tra có thể thực hiện action không
  const canPerformAction = (action: string) => {
    if (!isViewRole) return true;
    return action === "read" || action === "export";
  };

  return {
    isViewRole,
    hideEditButtons,
    hideDeleteButtons,
    hideCreateButtons,
    hideImportButtons,
    showExportButtons,
    hideFormInputs,
    hideDropdowns,
    hideModals,
    hideActionButtons,
    hideBulkActions,
    showFilterControls,
    showPaginationControls,
    showSearchInputs,
    hideSettingsButtons,
    hideUserManagementActions,
    hideRoleManagementActions,
    getViewOnlyMessage,
    canPerformAction,
  };
};
