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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Quản lý giao dịch cho PM</h1>
          <p className="text-muted-foreground">
            Quản lý và theo dõi các giao dịch theo phòng ban
          </p>
        </div>
      </div>

      {/* Hiển thị thông báo nếu chỉ có role PM mà không có pm_{phong_ban} */}
  {/* Nếu không phải admin và cũng không có pm-specific thì hiển thị cảnh báo */}
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
      {isAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Phòng ban được phân quyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Tất cả phòng ban</span>
            </div>
          </CardContent>
        </Card>
      ) : hasSpecificPMRole && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Phòng ban được phân quyền
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {pmDepartments.map((dept) => (
                <span
                  key={dept}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {dept}
                </span>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Component quản lý giao dịch */}
      <PmTransactionManagement />
    </div>
  );
}
