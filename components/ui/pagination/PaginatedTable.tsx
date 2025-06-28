
"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import DataTable from "@/components/ui/tables/DataTable";

interface PaginatedTableProps {
  headers: string[];
  rows: (string | number)[][];
  itemsPerPage?: number;
}

export default function PaginatedTable({
  headers,
  rows,
  itemsPerPage = 10,
}: PaginatedTableProps) {
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");

  const filteredRows = useMemo(
    () =>
      rows.filter((row) =>
        row.some((cell) =>
          String(cell).toLowerCase().includes(search.toLowerCase())
        )
      ),
    [search, rows]
  );

  const totalPages = Math.ceil(filteredRows.length / itemsPerPage);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * itemsPerPage, (page + 1) * itemsPerPage),
    [filteredRows, page, itemsPerPage]
  );

  const handleExportCSV = () => {
    const csvContent = [
      headers.join(","),
      ...paginatedRows.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `page-${page + 1}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center gap-4">
        <Input
          placeholder="Tìm kiếm..."
          className="w-80"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
        />
        <Button variant="gradient" size="sm" onClick={handleExportCSV}>
          Xuất CSV (Trang {page + 1})
        </Button>
      </div>

      <DataTable
        headers={headers}
        rows={paginatedRows}
        startIndex={page * itemsPerPage}
        expectedRowCount={itemsPerPage}
      />

      <div className="flex justify-center gap-2 pt-2">
        <Button
          variant="gradient"
          size="sm"
          onClick={() => setPage((p) => Math.max(p - 1, 0))}
          disabled={page === 0}
        >
          Trước
        </Button>
        <span className="text-sm px-2">
          Trang {page + 1} / {totalPages || 1}
        </span>
        <Button
          variant="gradient"
          size="sm"
          onClick={() => setPage((p) => Math.min(p + 1, totalPages - 1))}
          disabled={page >= totalPages - 1}
        >
          Sau
        </Button>
      </div>
    </div>
  );
}
