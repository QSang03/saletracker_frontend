"use client";

import { useState } from "react";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { DateRangePicker, DateRange } from "@/components/ui/date-range-picker";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import GenericBarChart from "@/components/ui/charts/GenericBarChart";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import { Button } from "../ui/button";

function formatDateTimeVN(date: Date) {
  return date
    .toLocaleString("vi-VN", {
      hour12: false,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    })
    .replace(",", "");
}

const chartConfig = {
  nhuCau: { label: "Nhu cầu", color: "var(--chart-1)" },
  daChot: { label: "Đã chốt", color: "var(--chart-2)" },
  chuaChot: { label: "Chưa chốt", color: "var(--chart-3)" },
};

const fakeTableData = [
  [
    "18/6/2025",
    "Mr Thiên Ptkh Nguyên Kim",
    "MDO_LDO_HG_BAOLOC-Ms-Linh",
    "MÁY SCANJET HP PRO 2000 S2 (6FW06A)",
    1,
    "6.800.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thiên Ptkh Nguyên Kim",
    "NGUYENKIM-HQC_TBI_GP_PSYS (Nhóm)",
    "MÁY IN HP PRO 4003DN ( 2Z609A )",
    1,
    "8.200.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Khánh Đàm Vi Tính Nguyên Kim",
    "HQC_TBI_TB_VPEM-Mr Hưng",
    "Máy tính để bàn Dell Optilex 7020SFF...",
    1,
    "12.700.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 8GB DDR4-2666",
    1,
    "400.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 8GB DDR4-3200",
    1,
    "400.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
  [
    "18/6/2025",
    "Mr Thủy Linh Kiện Nguyên Kim",
    "MTR_DLA_VT_GIAAN001-C.DUYÊN-0915323704",
    "RAM PC 16GB DDR4-3200",
    1,
    "750.000 VNĐ",
    "Chưa chốt",
  ],
];

const today = new Date();
const mockStats = {
  gdToday: 123,
  gdYesterday: 337,
  gd2DaysAgo: 251,
  gdExpiredToday: 79,
};

function getThisWeekRangeByWeekday(): DateRange {
  const today = new Date();
  const from = new Date(today);
  from.setDate(today.getDate() - 7);
  const to = new Date(today);
  return { from, to };
}

const defaultDateRange: DateRange = getThisWeekRangeByWeekday();

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border p-4 shadow-sm bg-white dark:bg-muted">
      <div className="text-2xl font-bold text-primary">{value}</div>
      <div className="text-sm text-muted-foreground">{label}</div>
    </div>
  );
}

export function ChartBarDeals() {
  const [open, setOpen] = useState(false);
  const [selectedData, setSelectedData] = useState<{
    name: string;
    type: string;
    value: number;
    timestamp: number;
  } | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);

  const allData = fakeTableData.map((_, i) => ({
    timestamp: Date.parse(
      "2025-06-" + (19 + i).toString().padStart(2, "0") + "T17:45:04"
    ),
    nhuCau: 100 + i * 10,
    daChot: 60 + i * 5,
    chuaChot: 40 + i * 5,
  }));

  const filteredData = allData.filter((item) => {
    return (
      (!dateRange.from || item.timestamp >= dateRange.from.getTime()) &&
      (!dateRange.to || item.timestamp <= dateRange.to.getTime())
    );
  });

  const displayData = filteredData.map((item) => ({
    ...item,
    name: formatDateTimeVN(new Date(item.timestamp)),
  }));

  const totalNhuCau = filteredData.reduce((sum, d) => sum + d.nhuCau, 0);
  const totalDaChot = filteredData.reduce((sum, d) => sum + d.daChot, 0);
  const totalChuaChot = filteredData.reduce((sum, d) => sum + d.chuaChot, 0);
  const totalChaoBan = totalDaChot + totalChuaChot;

  const handleBarClick = (data: {
    name: string;
    type: string;
    value: number;
    timestamp: number;
  }) => {
    setSelectedData(data);
    setOpen(true);
  };

  return (
    <>
      <Card>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatBox label="Số lượng chào bán" value={totalChaoBan} />
            <StatBox label="Số lượng đã chốt" value={totalDaChot} />
            <StatBox label="Số lượng chưa chốt" value={totalChuaChot} />
            <StatBox label="Số lượng nhu cầu" value={totalNhuCau} />
            <StatBox label="GD Hôm nay" value={mockStats.gdToday} />
            <StatBox label="GD 1 ngày trước" value={mockStats.gdYesterday} />
            <StatBox label="GD 2 ngày trước" value={mockStats.gd2DaysAgo} />
            <StatBox
              label="GD sẽ hết hạn hôm nay"
              value={mockStats.gdExpiredToday}
            />
          </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
            <DateRangePicker
              locale="vi"
              initialDateRange={dateRange}
              onUpdate={(range) => setDateRange(range.range)}
              align="start"
              showCompare={false}
            />
            <Button
              variant="gradient"
              size="sm"
              onClick={() => setDateRange(defaultDateRange)}
            >
              Đặt lại bộ lọc
            </Button>
            </div>

          <div className="w-full max-h-93">
            <GenericBarChart
              data={displayData}
              config={chartConfig}
              onBarClick={handleBarClick}
            />
          </div>
        </CardContent>

        <CardFooter className="text-sm text-muted-foreground">
          Nhấn vào từng cột để xem chi tiết.
        </CardFooter>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          className="w-screen p-6 rounded-xl shadow-xl animate-in fade-in-0 zoom-in-95"
          style={{
            maxWidth: "80vw",
            maxHeight: "71vh",
            height: "85vh",
            overflowX: "hidden",
            overflowY: "auto",
            backgroundColor: "white",
          }}
        >
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {selectedData?.name}
              {typeof selectedData?.type === "string" &&
                Object.keys(chartConfig).includes(selectedData.type) && (
                  <span className="text-muted-foreground">
                    {" "}
                    -{" "}
                    {
                      chartConfig[selectedData.type as keyof typeof chartConfig]
                        .label
                    }
                  </span>
                )}
            </DialogTitle>
          </DialogHeader>

          <div className="mt-6">
            <PaginatedTable
              headers={[
                "Ngày",
                "Người đặt",
                "Chi nhánh",
                "Sản phẩm",
                "Số lượng",
                "Giá",
                "Trạng thái",
              ]}
              rows={fakeTableData}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
