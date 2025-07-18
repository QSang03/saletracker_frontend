import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ChangeLogDetailTable({ changes }: { changes: any[] }) {
  return (
    <div className="overflow-x-auto">
      <Table className="w-full max-w-7xl mx-auto border mt-2">
        <TableHeader>
          <TableRow>
            <TableHead className="border px-4 py-2">Tên cũ</TableHead>
            <TableHead className="border px-4 py-2">Tên mới</TableHead>
            <TableHead className="border px-4 py-2">Thời gian đổi</TableHead>
            <TableHead className="border px-4 py-2">Người đổi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {changes?.map((change: any, idx: number) => (
            <TableRow key={idx}>
              <TableCell className="border px-4 py-2">
                {change.oldFullName}
              </TableCell>
              <TableCell className="border px-4 py-2">
                {change.newFullName}
              </TableCell>
              <TableCell className="border px-4 py-2">
                {new Date(change.timeChange).toLocaleString("vi-VN")}
              </TableCell>
              <TableCell className="border px-4 py-2">
                {change.changerFullName}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}