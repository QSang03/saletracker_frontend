'use client';

import { useEffect, useState, useContext } from 'react';
import { useRouter } from 'next/navigation';
import { useDynamicPermission } from '@/hooks/useDynamicPermission';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, FileText } from 'lucide-react';
import PmTransactionManagement from '@/components/pm-transaction/PmTransactionManagement';
import { AuthContext } from '@/contexts/AuthContext';

export default function ManagerPMTransactionsPage() {
  const router = useRouter();
  const { isPM, getPMDepartments, isAdmin, getAccessibleDepartments, user } = useDynamicPermission();
  const [isLoading, setIsLoading] = useState(true);
  const { isLoading: authLoading } = useContext(AuthContext);

  useEffect(() => {
    // Kiểm tra quyền truy cập: cho phép cả PM và admin (dùng isAdmin từ hook)
    // Đợi context auth load xong để tránh redirect sớm khi reload trang
    if (authLoading) return;
    if (!isPM && !isAdmin) {
      router.push('/dashboard');
      return;
    }
    setIsLoading(false);
  }, [authLoading, isPM, isAdmin, router]);

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

  if (authLoading || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  // Kiểm tra nếu user không có quyền truy cập (dùng isAdmin từ hook)
  if (!isPM && !isAdmin) {
    return null;
  }

  const pmDepartments = isAdmin ? getAccessibleDepartments() : getPMDepartments;
  const hasSpecificPMRole = isAdmin || (pmDepartments && pmDepartments.length > 0);

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
        {!isAdmin && !hasSpecificPMRole && (
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Bạn có quyền truy cập vào chức năng này nhưng chưa được phân quyền cho phòng ban cụ thể nào.
              Vui lòng liên hệ quản trị viên để được cấp quyền xem dữ liệu của phòng ban.
            </AlertDescription>
          </Alert>
        )}

        {/* Hiển thị thông tin phòng ban được phân quyền */}
    {/* Department permission card removed per request */}

        {/* Component quản lý giao dịch */}
        <PmTransactionManagement />
      </div>
    </div>
  );
}
