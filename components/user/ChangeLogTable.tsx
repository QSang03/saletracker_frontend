import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

interface ChangeLog {
  id: number;
  userId: number;
  userFullName: string;
  departmentName: string;
  changerFullNames: string[];
  changes: any[];
  [key: string]: any;
}

export default function ChangeLogTable({
  changeLogs,
  onShowDetail,
  page = 1,
  pageSize = 10,
  emptyText = "Không có lịch sử đổi tên nào.",
}: {
  changeLogs: ChangeLog[];
  onShowDetail: (log: ChangeLog) => void;
  page?: number;
  pageSize?: number;
  emptyText?: string;
}) {
  const emptyRows = Math.max(0, pageSize - changeLogs.length);

  return (
    <div className="overflow-x-auto">
      <Table className="w-full max-w-7xl mx-auto border border-gray-200 rounded-lg shadow-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center px-3 py-2.5">#</TableHead>
            <TableHead className="px-3 py-2.5 text-left">User ID</TableHead>
            <TableHead className="px-3 py-2.5 text-left">
              Tên người bị đổi
            </TableHead>
            <TableHead className="px-3 py-2.5 text-left">Người đổi</TableHead>
            <TableHead className="px-3 py-2.5 text-center">
              Xem chi tiết
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changeLogs.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-gray-400">
                {emptyText}
              </TableCell>
            </TableRow>
          ) : (
            <>
              {changeLogs.map((log, idx) => {
                const isEven = idx % 2 === 0;
                return (
                  <TableRow
                    key={log.id}
                    className={`transition-colors ${
                      isEven ? "bg-gray-200" : "bg-white dark:bg-muted/20"
                    }`}
                  >
                    <TableCell className="text-center px-3 py-2.5">
                      {(page - 1) * pageSize + idx + 1}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {log.userId || log.user?.id || ""}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {log.userFullName || ""}
                    </TableCell>
                    <TableCell className="px-3 py-2.5">
                      {[...new Set(log.changerFullNames || [])].join(", ")}
                    </TableCell>
                    <TableCell className="px-3 py-2.5 text-center">
                      <Button
                        size="sm"
                        variant="gradient"
                        onClick={() => onShowDetail(log)}
                      >
                        Xem chi tiết
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {Array.from({ length: emptyRows }).map((_, idx) => {
                const isEven = (changeLogs.length + idx) % 2 === 0;
                return (
                  <TableRow
                    key={`empty-${idx}`}
                    className={
                      isEven ? "bg-gray-200" : "bg-white dark:bg-muted/20"
                    }
                  >
                    <TableCell className="px-3 py-4">&nbsp;</TableCell>
                    <TableCell className="px-3 py-4"></TableCell>
                    <TableCell className="px-3 py-4"></TableCell>
                    <TableCell className="px-3 py-4"></TableCell>
                    <TableCell className="px-3 py-4"></TableCell>
                  </TableRow>
                );
              })}
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}