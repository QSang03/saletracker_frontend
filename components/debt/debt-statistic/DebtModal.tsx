"use client";

import React, { useMemo, useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import { CalendarIcon, Check, ChevronsUpDown } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Search,
  AlertCircle,
  Download,
  X,
  Filter,
  Calendar,
  User,
  FileText,
} from "lucide-react";
import { Debt } from "@/types";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";

type StatusType = "paid" | "promised" | "no_info";

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline";
}

const statusConfig: Record<StatusType, StatusConfig> = {
  paid: { label: "Đã thanh toán", variant: "default" },
  promised: { label: "Khách hẹn trả", variant: "secondary" },
  no_info: { label: "Chưa có thông tin", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status as StatusType] ?? statusConfig.no_info;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

// Component FilterSection cho Modal
interface FilterSectionProps {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  selectedEmployees: string[];
  setSelectedEmployees: (value: string[]) => void;
  selectedDate: Date | undefined;
  setSelectedDate: (value: Date | undefined) => void;
  uniqueEmployees: string[];
  handleSearch: () => void;
  clearFilters: () => void;
  handleExport: () => void;
  totalCount: number;
  totalAmount: string;
  totalRemaining: string;
}

const FilterSection: React.FC<FilterSectionProps> = ({
  searchTerm,
  setSearchTerm,
  selectedEmployees,
  setSelectedEmployees,
  selectedDate,
  setSelectedDate,
  uniqueEmployees,
  handleSearch,
  clearFilters,
  handleExport,
  totalCount,
  totalAmount,
  totalRemaining,
}) => {
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  const toggleEmployee = (employee: string) => {
    if (selectedEmployees.includes(employee)) {
      setSelectedEmployees(selectedEmployees.filter((e) => e !== employee));
    } else {
      setSelectedEmployees([...selectedEmployees, employee]);
    }
  };

  const removeEmployee = (employee: string) => {
    setSelectedEmployees(selectedEmployees.filter((e) => e !== employee));
  };
  return (
    <div className="space-y-4">
      {/* Filter Controls */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {/* Filter Inputs */}
        <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <FileText className="h-4 w-4 text-gray-500" />
                Tìm kiếm
              </Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Mã khách hàng, hóa đơn..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-10 pl-10 pr-10 bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm("")}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Employee Multi Select */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <User className="h-4 w-4 text-gray-500" />
                Nhân viên
              </Label>
              <Popover
                open={employeePopoverOpen}
                onOpenChange={setEmployeePopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={employeePopoverOpen}
                    className="h-10 w-full justify-between bg-white border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  >
                    <span className="truncate">
                      {selectedEmployees.length === 0
                        ? "Chọn nhân viên..."
                        : selectedEmployees.length === 1
                        ? selectedEmployees[0]
                        : `${selectedEmployees.length} nhân viên đã chọn`}
                    </span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-full p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Tìm nhân viên..."
                      className="h-9"
                    />
                    <CommandEmpty>Không tìm thấy nhân viên.</CommandEmpty>
                    <CommandGroup className="max-h-64 overflow-auto">
                      <CommandItem
                        value="clear-all"
                        onSelect={() => {
                          setSelectedEmployees([]);
                        }}
                        className="font-medium text-red-600 hover:text-red-700"
                      >
                        <X className="mr-2 h-4 w-4 inline-block" />
                        <span className="inline-block">Xóa tất cả</span>
                      </CommandItem>
                      {uniqueEmployees.map((employee) => (
                        <CommandItem
                          key={employee}
                          value={employee}
                          onSelect={() => toggleEmployee(employee)}
                        >
                          <Check
                            className={`mr-2 h-4 w-4 ${
                              selectedEmployees.includes(employee)
                                ? "opacity-100"
                                : "opacity-0"
                            }`}
                          />
                          {employee}
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Date Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                <Calendar className="h-4 w-4 text-gray-500" />
                Hạn thanh toán
              </Label>
              <div className="relative">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "h-10 w-full justify-start text-left font-normal bg-white border-gray-300 hover:border-blue-500",
                        !selectedDate && "text-muted-foreground"
                      )}
                    >
                      {selectedDate ? (
                        format(selectedDate, "PPP")
                      ) : (
                        <span>Chọn ngày</span>
                      )}
                      {selectedDate && (
                        <X
                          className="ml-auto h-4 w-4 text-gray-400 hover:text-gray-600"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedDate(undefined);
                          }}
                        />
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={selectedDate}
                      onSelect={setSelectedDate}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 py-4 bg-white border-t border-gray-200">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            {/* Active Filters */}
            <div className="flex items-center gap-3 flex-wrap">
              {(searchTerm || selectedEmployees.length > 0 || selectedDate) && (
                <>
                  <span className="text-sm font-medium text-gray-600">
                    Bộ lọc đang áp dụng:
                  </span>
                  <div className="flex gap-2 flex-wrap">
                    {searchTerm && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200"
                      >
                        Tìm kiếm: {searchTerm}
                        <button
                          onClick={() => setSearchTerm("")}
                          className="ml-2 hover:text-blue-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                    {selectedEmployees.map((employee) => (
                      <Badge
                        key={employee}
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-green-100 text-green-700 hover:bg-green-200"
                      >
                        NV: {employee}
                        <button
                          onClick={() => removeEmployee(employee)}
                          className="ml-2 hover:text-green-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                    {selectedDate && (
                      <Badge
                        variant="secondary"
                        className="text-xs px-2 py-1 bg-purple-100 text-purple-700 hover:bg-purple-200"
                      >
                        Ngày: {format(selectedDate, "PPP")}
                        <button
                          onClick={() => setSelectedDate(undefined)}
                          className="ml-2 hover:text-purple-900"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="h-9 px-4 text-sm font-medium text-gray-600 bg-white border-gray-300 hover:bg-gray-50 hover:text-gray-700"
              >
                <X className="h-4 w-4 inline-block mr-1" />
                Xóa bộ lọc
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                className="h-9 px-4 text-sm font-medium text-gray-700 bg-white border-gray-300 hover:bg-gray-50"
              >
                <Download className="h-4 w-4 inline-block mr-2" />
                Xuất Excel
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border">
        <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="h-6 w-6 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <FileText className="h-3 w-3 text-blue-600" />
          </div>
          <p className="text-xs text-gray-600">Tổng số phiếu</p>
          <p className="text-base font-bold text-gray-900">{totalCount}</p>
        </div>

        <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="h-6 w-6 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-green-600 font-bold text-xs">₫</span>
          </div>
          <p className="text-xs text-gray-600">Tổng tiền</p>
          <p className="text-base font-bold text-green-600">{totalAmount}</p>
        </div>

        <div className="text-center p-3 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="h-6 w-6 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-2">
            <span className="text-red-600 font-bold text-xs">!</span>
          </div>
          <p className="text-xs text-gray-600">Còn lại</p>
          <p className="text-base font-bold text-red-600">{totalRemaining}</p>
        </div>
      </div>
    </div>
  );
};

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  category: string;
  debts: Debt[];
}

const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  category,
  debts,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);

  // Extract unique employees from debts data
  const uniqueEmployees = useMemo(() => {
    const employees = new Set<string>();
    debts.forEach((debt) => {
      if (debt.employee_code_raw) {
        employees.add(debt.employee_code_raw);
      }
    });
    return Array.from(employees).sort();
  }, [debts]);

  const filteredDebts: Debt[] = useMemo(() => {
    return debts.filter((debt) => {
      const matchesSearch =
        debt.customer_raw_code
          .toLowerCase()
          .includes(searchTerm.toLowerCase()) ||
        debt.invoice_code.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesEmployee =
        selectedEmployees.length === 0 ||
        (debt.employee_code_raw &&
          selectedEmployees.includes(debt.employee_code_raw));

      const matchesDate =
        !selectedDate ||
        (debt.due_date && selectedDate
          ? new Date(debt.due_date).toISOString().split("T")[0] ===
            new Date(selectedDate).toISOString().split("T")[0]
          : true);

      return matchesSearch && matchesEmployee && matchesDate;
    });
  }, [debts, searchTerm, selectedEmployees, selectedDate]);

  const formatCurrency = useCallback((amount: number): string => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(amount);
  }, []);

  const formatDate = useCallback((date: string | Date | undefined): string => {
    if (!date) return "-";
    return new Date(date).toLocaleDateString("vi-VN");
  }, []);

  const getCategoryLabel = (cat: string) => {
    const labels = {
      paid: "Đã thanh toán",
      promised: "Khách hẹn trả",
      no_info: "Chưa có thông tin",
    };
    return labels[cat as keyof typeof labels] || cat;
  };

  const handleSearch = useCallback(() => {
    // Search is already handled by useMemo, but this could trigger additional actions
    console.log("Searching with filters:", {
      searchTerm,
      selectedEmployees,
      selectedDate,
    });
  }, [searchTerm, selectedEmployees, selectedDate]);

  const handleExport = useCallback(() => {
    // Export functionality could be implemented here
    console.log("Exporting filtered data:", filteredDebts);
  }, [filteredDebts]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEmployees([]);
    setSelectedDate(undefined);
  };

  const toggleEmployee = (employee: string) => {
    setSelectedEmployees((prev) =>
      prev.includes(employee)
        ? prev.filter((e) => e !== employee)
        : [...prev, employee]
    );
  };

  const removeEmployee = (employee: string) => {
    setSelectedEmployees((prev) => prev.filter((e) => e !== employee));
  };

  // Calculate totals
  const totalAmount = useMemo(() => {
    return filteredDebts.reduce((sum, debt) => sum + debt.total_amount, 0);
  }, [filteredDebts]);

  const totalRemaining = useMemo(() => {
    return filteredDebts.reduce((sum, debt) => sum + debt.remaining, 0);
  }, [filteredDebts]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
          <DialogTitle className="text-lg font-semibold">
            Chi tiết phiếu nợ - {getCategoryLabel(category)} (
            {filteredDebts.length} phiếu)
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 flex-1 overflow-hidden p-4">
          {/* Filter Section */}
          <FilterSection
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            selectedEmployees={selectedEmployees}
            setSelectedEmployees={setSelectedEmployees}
            selectedDate={selectedDate}
            setSelectedDate={setSelectedDate}
            uniqueEmployees={uniqueEmployees}
            handleSearch={handleSearch}
            clearFilters={clearFilters}
            handleExport={handleExport}
            totalCount={filteredDebts.length}
            totalAmount={formatCurrency(totalAmount)}
            totalRemaining={formatCurrency(totalRemaining)}
          />

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm">
            <Table>
              <TableHeader className="sticky top-0 bg-gray-50 z-10">
                <TableRow className="hover:bg-transparent border-b border-gray-200">
                  <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                    Mã hóa đơn
                  </TableHead>
                  <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                    Khách hàng
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right font-semibold text-sm text-gray-700 bg-gray-50">
                    Số tiền
                  </TableHead>
                  <TableHead className="h-12 px-4 text-right font-semibold text-sm text-gray-700 bg-gray-50">
                    Còn lại
                  </TableHead>
                  <TableHead className="h-12 px-4 text-center font-semibold text-sm text-gray-700 bg-gray-50">
                    Hạn thanh toán
                  </TableHead>
                  <TableHead className="h-12 px-4 text-center font-semibold text-sm text-gray-700 bg-gray-50">
                    Trạng thái
                  </TableHead>
                  <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                    Nhân viên
                  </TableHead>
                  <TableHead className="h-12 px-4 text-left font-semibold text-sm text-gray-700 bg-gray-50">
                    Ghi chú
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDebts.map((debt, index) => (
                  <TableRow
                    key={debt.id}
                    className={`hover:bg-blue-50 transition-colors border-b border-gray-100 ${
                      index % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                    }`}
                  >
                    <TableCell className="h-14 px-4 font-medium text-sm text-gray-900">
                      {debt.invoice_code}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700">
                      {debt.customer_raw_code}
                    </TableCell>
                    <TableCell className="h-14 px-4 font-semibold text-sm text-right text-gray-900">
                      {formatCurrency(debt.total_amount)}
                    </TableCell>
                    <TableCell className="h-14 px-4 font-semibold text-sm text-right text-orange-600">
                      {formatCurrency(debt.remaining)}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-center text-gray-700">
                      {formatDate(debt.due_date)}
                    </TableCell>
                    <TableCell className="h-14 px-4 text-center">
                      <StatusBadge status={debt.status || "no_info"} />
                    </TableCell>
                    <TableCell className="h-14 px-4 text-sm text-gray-700">
                      {debt.employee_code_raw || "-"}
                    </TableCell>
                    <TableCell
                      className="h-14 px-4 text-sm text-gray-700 max-w-[200px]"
                      title={debt.note || "-"}
                    >
                      <div className="truncate">{debt.note || "-"}</div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          {filteredDebts.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <AlertCircle className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-xl font-medium mb-2">
                Không tìm thấy kết quả nào
              </p>
              <p className="text-sm">Thử thay đổi bộ lọc để xem thêm kết quả</p>
              {(searchTerm || selectedEmployees.length > 0 || selectedDate) && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Xóa tất cả bộ lọc
                </Button>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DebtModal;
