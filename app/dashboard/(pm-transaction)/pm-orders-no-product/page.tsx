'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';
import PmOrdersNoProductManagement from '@/components/pm-transaction/PmOrdersNoProductManagement';

export default function PMOrdersNoProductPage() {
  const router = useRouter();
  const { isPM, isViewRole, isAnalysisRole, getPMDepartments, isAdmin, getAccessibleDepartments, user } = useDynamicPermission();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Chờ user được load để tránh redirect sớm khi user chưa sẵn sàng
    if (!user) return;
    // Kiểm tra quyền truy cập: cho phép PM, admin, view (xem-only), hoặc analysis
    if (!isPM && !isAdmin && !isViewRole && !isAnalysisRole) {
      router.push('/dashboard');
      return;
    }
    setIsLoading(false);
  }, [user, isPM, isAdmin, isViewRole, isAnalysisRole, router]);

  // Đăng ký đường dẫn hiện tại là lastVisitedUrl để reload giữ đúng trang PM
  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const path = window.location.pathname;
        if (path && path.startsWith('/dashboard/pm-orders-no-product')) {
          localStorage.setItem('lastVisitedUrl', path);
        }
      }
    } catch (e) {
      // ignore
    }
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Kiểm tra nếu user không có quyền truy cập
  if (!isPM && !isAdmin && !isViewRole && !isAnalysisRole) {
    return null;
  }

  const pmDepartments = (isAdmin || isViewRole) ? getAccessibleDepartments() : getPMDepartments();

  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            📦 Đơn hàng không có mã sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <PmOrdersNoProductManagement />
        </CardContent>
      </Card>
    </div>
  );
}

