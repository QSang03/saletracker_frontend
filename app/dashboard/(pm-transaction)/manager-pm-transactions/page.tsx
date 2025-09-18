'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import PmTransactionManagement from '@/components/pm-transaction/PmTransactionManagement';

export default function ManagerPMTransactionsPage() {
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
        if (path && path.startsWith('/dashboard/manager-pm-transactions')) {
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
  const hasSpecificPMRole = isAdmin || isViewRole || (pmDepartments && pmDepartments.length > 0);
  
  // Nếu user có role analysis, chỉ hiển thị đơn hàng của chính họ
  const isAnalysisUser = isAnalysisRole && !isAdmin && !isPM && !isViewRole;

  return (
    <div className="h-full overflow-hidden relative">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Quản lý giao dịch cho PM</h1>
            <p className="text-muted-foreground">Quản lý và theo dõi các giao dịch theo phòng ban</p>
          </div>
        </div>

        {/* Hiển thị thông báo nếu chỉ có role PM mà không có pm_{phong_ban} */}
        {!isAdmin && !isViewRole && !hasSpecificPMRole && !isAnalysisUser && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn có quyền truy cập vào chức năng này nhưng chưa được phân quyền cho phòng ban cụ thể nào.
              Vui lòng liên hệ quản trị viên để được cấp quyền xem dữ liệu của phòng ban.
            </AlertDescription>
          </Alert>
        )}

        {/* Hiển thị thông báo cho user có role analysis */}
        {isAnalysisUser && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn có quyền truy cập vào chức năng này với role analysis. Bạn sẽ chỉ thấy đơn hàng của chính mình.
            </AlertDescription>
          </Alert>
        )}

        {/* Hiển thị thông tin phòng ban được phân quyền */}
    {/* Department permission card removed per request */}

        {/* Component quản lý giao dịch */}
        <PmTransactionManagement isAnalysisUser={isAnalysisUser} />
      </div>
    </div>
  );
}
