"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface DataTableProps {
  headers: string[];
  rows: any[][];
  startIndex?: number;
  expectedRowCount?: number;
  renderCell?: (rowIndex: number, colIndex: number, value: any) => React.ReactNode;
}

export default function DataTable({
  headers,
  rows,
  startIndex = 0,
  expectedRowCount = rows.length,
  renderCell,
}: DataTableProps) {
  return (
    <div
      className="border rounded-xl overflow-auto shadow-inner"
      style={{
        maxHeight: "50vh",
        minHeight: `${expectedRowCount * 40}px`,
      }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
          <TableRow className="border-b">
            <TableHead className="w-12 text-center px-3 py-2">#</TableHead>
            {headers.map((header, index) => (
              <TableHead key={index} className="px-3 py-2">
                {header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {Array.from({ length: expectedRowCount }).map((_, index) => {
            const row = rows[index];
            const isEven = index % 2 === 0;

            if (!row) {
              return null;
            }

            return (
              <TableRow
                key={index}
                className={`transition-all border-b border-gray-400 ${
                  isEven ? "bg-gray-200" : "bg-white dark:bg-muted/20"
                }`}
              >
                <TableCell className="text-center font-semibold px-3 py-2">
                  {startIndex + index + 1}
                </TableCell>
                {headers.map((_, i) => (
                  <TableCell key={i} className="whitespace-pre-wrap px-3 py-2">
                    {renderCell ? renderCell(index, i, row[i]) : row[i]}
                  </TableCell>
                ))}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
