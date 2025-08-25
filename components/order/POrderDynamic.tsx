// components/order/POrderDynamic.tsx
import React from 'react';
import { useOrderPermissions } from '@/hooks/useOrderPermissions';

interface POrderDynamicProps {
  children: React.ReactNode;
  action?: 'read' | 'create' | 'update' | 'delete' | 'import' | 'export' | 'hide';
  requireAnalysis?: boolean;
  fallback?: React.ReactNode;
  showLoading?: boolean;
  loadingComponent?: React.ReactNode;
}

export const POrderDynamic: React.FC<POrderDynamicProps> = ({
  children,
  action,
  requireAnalysis = true,
  fallback = null,
  showLoading = false,
  loadingComponent = <div>Đang tải...</div>
}) => {
  const {
    user,
    hasAnalysisRole,
    canAccessOrderAction
  } = useOrderPermissions();

  // Loading state
  if (!user && showLoading) {
    return <>{loadingComponent}</>;
  }

  // Kiểm tra role analysis
  if (requireAnalysis && !hasAnalysisRole) {
    return <>{fallback}</>;
  }

  // Kiểm tra action permission
  if (action && !canAccessOrderAction(action)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};
