"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import React from "react";

interface CSVExportPanelProps {
  open: boolean;
  onClose: () => void;
  headers: string[];
  data: (string | number)[][];
  filtersDescription?: React.ReactNode;
  defaultExportCount?: number; // thêm prop mới
}

export default function CSVExportPanel({
  open,
  onClose,
  headers,
  data,
  filtersDescription,
  defaultExportCount = 50, // mặc định 50 nếu không truyền
}: CSVExportPanelProps) {
  const [mode, setMode] = useState<"rows" | "all">("rows");
  const [rowCount, setRowCount] = useState(defaultExportCount);

  // Khi modal mở lại, reset rowCount về defaultExportCount
  // Đảm bảo khi đổi số dòng/trang thì modal cũng cập nhật
  React.useEffect(() => {
    if (open)
      setRowCount(
        defaultExportCount > 0
          ? Math.min(defaultExportCount, data.length)
          : 1
      );
  }, [open, defaultExportCount, data.length]);

  const handleExport = () => {
    let exportData: (string | number)[][] = [];

    if (mode === "rows") {
      exportData = data.slice(0, rowCount);
    } else {
      exportData = data;
    }

    const csvContent = [
      headers.join(","),
      ...exportData.map((row) =>
        row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", `export-${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="space-y-4 max-w-md">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu CSV</DialogTitle>
        </DialogHeader>

        {filtersDescription && (
          <div className="text-sm text-muted-foreground">
            {filtersDescription}
          </div>
        )}

        <div className="space-y-3">
          <Label>Chế độ xuất</Label>
          <Select value={mode} onValueChange={(val) => setMode(val as any)}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="rows">Giới hạn số dòng</SelectItem>
              <SelectItem value="all">Toàn bộ dữ liệu đã lọc</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {mode === "rows" && (
          <div className="space-y-2">
            <Label>Số dòng muốn xuất (tối đa {data.length})</Label>
            <Input
              type="number"
              min={1}
              max={data.length}
              value={rowCount}
              onChange={(e) =>
                setRowCount(
                  Math.min(
                    Math.max(1, Number(e.target.value)),
                    data.length
                  )
                )
              }
            />
          </div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleExport}>Tải CSV</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


