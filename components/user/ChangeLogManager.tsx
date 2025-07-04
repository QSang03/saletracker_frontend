import { useState, useEffect } from "react";
import { getAccessToken } from "@/lib/auth";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import ChangeLogTable from "./ChangeLogTable";
import ChangeLogDetailTable from "./ChangeLogDetailTable";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";

interface ChangeLog {
  id: number;
  userId: number;
  userFullName: string;
  departmentName: string;
  changerFullNames: string[];
  changes: any[];
  [key: string]: any;
}

interface LogFilters {
  search: string;
  departments: string[];
}

export default function ChangeLogManager({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [allChangeLogs, setAllChangeLogs] = useState<ChangeLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<ChangeLog | null>(null);

  // State cho filter và phân trang FE
  const [filters, setFilters] = useState<LogFilters>({ search: "", departments: [] });
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    if (open) fetchAllChangeLogs();
    // eslint-disable-next-line
  }, [open]);

  const fetchAllChangeLogs = async () => {
    setIsLoading(true);
    const token = getAccessToken();
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/users/change-logs?page=1&limit=10000`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (res.ok) {
      const { data } = await res.json();
      setAllChangeLogs(data);
      setPage(1);
      setFilters({ search: "", departments: [] });
    }
    setIsLoading(false);
  };

  // Lấy danh sách phòng ban duy nhất
  const availableDepartments = Array.from(
    new Set(allChangeLogs.map((log) => log.departmentName).filter(Boolean))
  );

  // Filter FE
  const filteredLogs = allChangeLogs.filter((log) => {
    if (
      filters.search &&
      !(
        log.userFullName?.toLowerCase().includes(filters.search.toLowerCase()) ||
        log.userId?.toString().includes(filters.search)
      )
    ) {
      return false;
    }
    if (
      filters.departments.length > 0 &&
      !filters.departments.includes(log.departmentName)
    ) {
      return false;
    }
    return true;
  });

  // Phân trang FE
  const paginatedLogs = filteredLogs.slice(
    (page - 1) * pageSize,
    page * pageSize
  );

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent
        className="w-screen max-w-2xl p-6 rounded-xl shadow-xl"
        style={{
          maxWidth: "70vw",
          maxHeight: "93vh",
          backgroundColor: "white",
          overflow: "auto",
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Lịch sử thay đổi tên người dùng
          </DialogTitle>
          <DialogDescription>
            Danh sách các lần thay đổi họ tên của user (chỉ admin xem được).
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4" style={{ minHeight: "77vh" }}>
          {isLoading ? (
            <LoadingSpinner size={32} />
          ) : (
            <PaginatedTable
              page={page}
              total={filteredLogs.length}
              pageSize={pageSize}
              onPageChange={setPage}
              enableSearch
              enableDepartmentFilter
              availableDepartments={availableDepartments}
              emptyText="Không có lịch sử đổi tên nào."
              onFilterChange={(newFilters: any) => {
                setFilters(newFilters);
                setPage(1);
              }}
            >
              <ChangeLogTable
                changeLogs={paginatedLogs}
                onShowDetail={setSelectedLog}
                page={page}
                pageSize={pageSize}
              />
            </PaginatedTable>
          )}
        </div>
        {selectedLog && (
          <Dialog
            open={!!selectedLog}
            onOpenChange={() => setSelectedLog(null)}
          >
            <DialogContent
              className="w-screen max-w-3xl p-6 rounded-xl shadow-xl"
              style={{
                maxWidth: "40vw",
                backgroundColor: "white",
                overflow: "auto",
              }}
            >
              <DialogHeader>
                <DialogTitle>
                  Lịch sử đổi tên của user {selectedLog.userFullName}
                </DialogTitle>
              </DialogHeader>
              <ChangeLogDetailTable changes={selectedLog.changes || []} />
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  );
}