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
import ExcelJS from "exceljs"; // Thay đổi import

interface CSVExportPanelProps {
  open: boolean;
  onClose: () => void;
  headers: string[];
  data: (string | number)[][];
  filtersDescription?: React.ReactNode;
  defaultExportCount?: number;
  // Optional async fetcher to get ALL data from backend (e.g., pageSize=1_000_000)
  fetchAllData?: () => Promise<(string | number)[][]>;
}

export default function CSVExportPanel({
  open,
  onClose,
  headers,
  data,
  filtersDescription,
  defaultExportCount = 50,
  fetchAllData,
}: CSVExportPanelProps) {
  const [mode, setMode] = useState<"rows" | "allData">("rows");
  const [rowCount, setRowCount] = useState(defaultExportCount);
  const [exporting, setExporting] = useState(false);

  React.useEffect(() => {
    if (open)
      setRowCount(
        defaultExportCount > 0 ? Math.min(defaultExportCount, data.length) : 1
      );
  }, [open, defaultExportCount, data.length]);

  const handleExport = async () => {
    setExporting(true);
    try {
      let exportData: (string | number)[][] = [];
      if (mode === "rows") {
        exportData = data.slice(0, rowCount);
      } else {
        // allData mode: if fetchAllData provided, use it to fetch all rows from backend
        if (fetchAllData) {
          exportData = await fetchAllData();
        } else {
          // Fallback to current provided data if no fetcher available
          exportData = data;
        }
      }

      // Tạo workbook mới
      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Your App Name";
      workbook.lastModifiedBy = "Your App Name";
      workbook.created = new Date();
      workbook.modified = new Date();

      // Tạo worksheet
      const worksheet = workbook.addWorksheet("Data");

      // Thêm headers với styling
      const headerRow = worksheet.addRow(headers);
      headerRow.font = { bold: true, color: { argb: "FFFFFF" } };
      headerRow.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "366092" },
      };
      headerRow.alignment = { horizontal: "center", vertical: "middle" };

      // Thêm dữ liệu
      exportData.forEach((row) => {
        const processedRow = row.map((cell) => {
          if (cell === null || cell === undefined) {
            return "";
          } else if (typeof cell === "object") {
            if (Array.isArray(cell)) {
              return (cell as any[]).join(", ");
            } else {
              return JSON.stringify(cell);
            }
          } else {
            return cell;
          }
        });
        worksheet.addRow(processedRow);
      });

      // Tự động điều chỉnh độ rộng cột
      worksheet.columns.forEach((column, index) => {
        let maxWidth = headers[index]?.length || 10;

        exportData.forEach((row) => {
          const cellValue = row[index];
          if (cellValue !== null && cellValue !== undefined) {
            const cellLength = String(cellValue).length;
            maxWidth = Math.max(maxWidth, cellLength);
          }
        });

        column.width = Math.min(maxWidth + 2, 50);
      });

      // Thêm border cho tất cả cells có dữ liệu
      const borderStyle = {
        top: { style: "thin" as const },
        left: { style: "thin" as const },
        bottom: { style: "thin" as const },
        right: { style: "thin" as const },
      };

      worksheet.eachRow({ includeEmpty: false }, (row) => {
        row.eachCell((cell) => {
          cell.border = borderStyle;
        });
      });

      // Freeze header row
      worksheet.views = [{ state: "frozen", ySplit: 1 }];

      // Xuất file Excel
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.setAttribute("download", `export-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      onClose();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xuất dữ liệu Excel</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {filtersDescription && (
            <div className="p-3 bg-muted rounded-lg text-sm">
              {filtersDescription}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="mode">Chế độ xuất</Label>
            <Select value={mode} onValueChange={(val) => setMode(val as any)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rows">Giới hạn số dòng</SelectItem>
                <SelectItem value="allData">
                  Toàn bộ dữ liệu đã lọc bao gồm các bộ lọc (nếu có)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {mode === "rows" && (
            <div className="space-y-2">
              <Label htmlFor="rowCount">
                Số dòng muốn xuất (tối đa {data.length})
              </Label>
              <Input
                id="rowCount"
                type="number"
                min={1}
                max={data.length}
                value={rowCount}
                onChange={(e) =>
                  setRowCount(
                    Math.min(Math.max(1, Number(e.target.value)), data.length)
                  )
                }
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={exporting}
            >
              Hủy
            </Button>
            <Button
              onClick={handleExport}
              className="flex-1"
              disabled={exporting}
            >
              {exporting ? "Đang xuất..." : "Tải Excel"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
