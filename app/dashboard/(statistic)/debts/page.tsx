"use client";

import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  ComponentProps,
} from "react";
import {
  Filter,
  Users,
  Clock,
  CheckCircle,
  AlertCircle,
  Search,
  Download,
  X,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart as RechartsPieChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Line,
  LineChart,
} from "recharts";
import StatsCard from "@/components/debt/debt-statistic/StatsCard";
import { FilterSection } from "@/components/debt/debt-statistic/FilterSection";
import ChartSection, {
  chartConfig,
} from "@/components/debt/debt-statistic/ChartSection";
import DebtModal from "@/components/debt/debt-statistic/DebtModal";
import { Debt } from "@/types";
import { DateRange } from "react-day-picker";

type StatusType = "paid" | "promised" | "no_info";
type BadgeVariant = ComponentProps<typeof Badge>["variant"];

interface StatusConfig {
  label: string;
  variant: BadgeVariant;
}

interface ChartDataItem {
  name: string;
  paid: number;
  promised: number;
  no_info: number;
}

interface PieDataItem {
  name: string;
  value: number;
  fill: string;
}

interface StatsData {
  total: number;
  paid: number;
  promised: number;
  noInfo: number;
  totalAmount: number;
  remainingAmount: number;
}

// Mock data với chỉ 3 trạng thái
const mockDebts: Debt[] = [
  {
    id: 1,
    customer_raw_code: "KH001",
    invoice_code: "INV001",
    bill_code: "BILL001",
    total_amount: 5000000,
    remaining: 0,
    issue_date: "2024-01-15",
    due_date: "2024-01-30",
    status: "paid",
    employee_code_raw: "NV001-Nguyễn Văn A",
    created_at: "2024-01-15",
  },
  {
    id: 2,
    customer_raw_code: "KH002",
    invoice_code: "INV002",
    bill_code: "BILL002",
    total_amount: 3000000,
    remaining: 3000000,
    issue_date: "2024-01-20",
    due_date: "2024-02-05",
    status: "promised",
    employee_code_raw: "NV002-Trần Thị B",
    created_at: "2024-01-20",
  },
  {
    id: 3,
    customer_raw_code: "KH003",
    invoice_code: "INV003",
    bill_code: "BILL003",
    total_amount: 7500000,
    remaining: 7500000,
    issue_date: "2024-01-10",
    due_date: "2024-01-25",
    status: "no_info",
    employee_code_raw: "NV003-Lê Văn C",
    created_at: "2024-01-10",
  },
  {
    id: 4,
    customer_raw_code: "KH004",
    invoice_code: "INV004",
    bill_code: "BILL004",
    total_amount: 2000000,
    remaining: 2000000,
    issue_date: "2024-01-25",
    due_date: "2024-02-10",
    status: "no_info",
    employee_code_raw: "NV001-Nguyễn Văn A",
    created_at: "2024-01-25",
  },
  {
    id: 5,
    customer_raw_code: "KH005",
    invoice_code: "INV005",
    bill_code: "BILL005",
    total_amount: 4200000,
    remaining: 0,
    issue_date: "2024-02-01",
    due_date: "2024-02-15",
    status: "paid",
    employee_code_raw: "NV002-Trần Thị B",
    created_at: "2024-02-01",
  },
  {
    id: 6,
    customer_raw_code: "KH006",
    invoice_code: "INV006",
    bill_code: "BILL006",
    total_amount: 6800000,
    remaining: 6800000,
    issue_date: "2024-02-05",
    due_date: "2024-02-20",
    status: "promised",
    employee_code_raw: "NV003-Lê Văn C",
    created_at: "2024-02-05",
  },
];

// Main Dashboard Component
const DebtStatisticsDashboard: React.FC = () => {
  const [chartType, setChartType] = useState<string>("bar");
  const [timeRange, setTimeRange] = React.useState<
    "week" | "month" | "quarter"
  >("week");
  const [range, setRange] = React.useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [selectedDebts, setSelectedDebts] = useState<Debt[]>([]);

  // Simulate loading với cơ chế Next.js
  useEffect(() => {
    const timer = setTimeout(() => 200, 1000);
    return () => clearTimeout(timer);
  }, []);

  // Memoized calculations với chỉ 3 trạng thái
  const stats: StatsData = useMemo(() => {
    const total = mockDebts.length;
    const paid = mockDebts.filter((d) => d.status === "paid").length;
    const promised = mockDebts.filter((d) => d.status === "promised").length;
    const noInfo = mockDebts.filter((d) => d.status === "no_info").length;

    return {
      total,
      paid,
      promised,
      noInfo,
      totalAmount: mockDebts.reduce((sum, debt) => sum + debt.total_amount, 0),
      remainingAmount: mockDebts.reduce((sum, debt) => sum + debt.remaining, 0),
    };
  }, []);

  const chartData: ChartDataItem[] = useMemo(() => {
    const groupedData: ChartDataItem[] = [
      { name: "Tuần 1", paid: 2, promised: 1, no_info: 1 },
      { name: "Tuần 2", paid: 3, promised: 2, no_info: 0 },
      { name: "Tuần 3", paid: 1, promised: 1, no_info: 2 },
      { name: "Tuần 4", paid: 2, promised: 2, no_info: 1 },
    ];
    return groupedData;
  }, [timeRange, range]);

  const pieData: PieDataItem[] = useMemo(
    () => [
      {
        name: chartConfig.paid.label as string,
        value: stats.paid,
        fill: chartConfig.paid.color,
      },
      {
        name: chartConfig.promised.label as string,
        value: stats.promised,
        fill: chartConfig.promised.color,
      },
      {
        name: chartConfig.no_info.label as string,
        value: stats.noInfo,
        fill: chartConfig.no_info.color,
      },
    ],
    [stats]
  );

  const handleChartClick = useCallback((data: unknown, category: string) => {
    setSelectedCategory(category);
    setSelectedDebts(mockDebts.filter((debt) => debt.status === category));
    setModalOpen(true);
  }, []);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  const handleApply = React.useCallback(() => {
    if (!range?.from || !range.to) {
      console.warn("Vui lòng chọn đủ khoảng ngày.");
      return;
    }
    // Ví dụ: gọi API fetch dữ liệu theo khoảng ngày
    const fromStr = range.from.toISOString().slice(0, 10);
    const toStr = range.to.toISOString().slice(0, 10);
    console.log(
      "Áp dụng lọc từ",
      fromStr,
      "đến",
      toStr,
      "với timeRange:",
      timeRange
    );
    // fetchData({ from: fromStr, to: toStr, preset: timeRange });
  }, [range, timeRange]);

  return (
    <main className="flex flex-col gap-4 pt-0 pb-0">
      <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
        <div className="rounded-xl border bg-background p-6 shadow-sm h-auto overflow-hidden">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8 pb-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  Thống kê công nợ
                </h1>
                <p className="text-sm text-gray-600 mt-1">
                  Theo dõi và phân tích tình trạng công nợ khách hàng
                </p>
              </div>
            </div>
          </div>

          {/* Stats Cards - Card nhỏ hơn, padding thoải mái hơn */}
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4 mb-6">
            <StatsCard
              title="Tổng số phiếu nợ"
              value={stats.total}
              icon={Users}
              color="text-blue-600"
              trend={5}
              description="Tổng phiếu trong kỳ"
            />
            <StatsCard
              title="Đã thanh toán"
              value={stats.paid}
              icon={CheckCircle}
              color="text-green-600"
              trend={12}
              description={formatCurrency(
                stats.totalAmount - stats.remainingAmount
              )}
            />
            <StatsCard
              title="Khách hẹn trả"
              value={stats.promised}
              icon={Clock}
              color="text-yellow-600"
              trend={-3}
              description="Có cam kết thanh toán"
            />
            <StatsCard
              title="Chưa có thông tin"
              value={stats.noInfo}
              icon={AlertCircle}
              color="text-gray-600"
              trend={0}
              description="Chưa có phản hồi"
            />
          </div>

          {/* Filters */}
          <FilterSection
            range={range}
            setRange={setRange}
            timeRange={timeRange}
            setTimeRange={setTimeRange}
          />

          {/* Charts */}
          <ChartSection
            chartType={chartType}
            setChartType={setChartType}
            chartData={chartData}
            pieData={pieData}
            onChartClick={handleChartClick}
          />

          {/* Modal */}
          <DebtModal
            isOpen={modalOpen}
            onClose={() => setModalOpen(false)}
            category={selectedCategory}
            debts={selectedDebts}
          />
        </div>
      </div>
    </main>
  );
};

export default DebtStatisticsDashboard;
