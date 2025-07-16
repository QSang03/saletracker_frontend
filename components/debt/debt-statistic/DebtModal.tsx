"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef } from "react";
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

type StatusType = "paid" | "pay_later" | "no_information_available";

interface StatusConfig {
  label: string;
  variant: "default" | "secondary" | "outline";
}

const statusConfig: Record<StatusType, StatusConfig> = {
  paid: { label: "Đã thanh toán", variant: "default" },
  pay_later: { label: "Khách hẹn trả", variant: "secondary" },
  no_information_available: { label: "Chưa có thông tin", variant: "outline" },
};

interface StatusBadgeProps {
  status: string;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = statusConfig[status as StatusType] ?? statusConfig.no_information_available;
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
  loading?: boolean;
  onPageChange?: (page: number) => Promise<void>;
  totalCount?: number;
  totalPages?: number;
  currentPage?: number;
}

const DebtModal: React.FC<DebtModalProps> = ({
  isOpen,
  onClose,
  category,
  debts,
  loading = false,
  onPageChange,
  totalCount: propTotalCount,
  totalPages: propTotalPages,
  currentPage: propCurrentPage = 1,
}) => {
  
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [employeePopoverOpen, setEmployeePopoverOpen] = useState(false);
  
  // Use props for pagination if available, otherwise fall back to local state with lazy loading
  const [localCurrentPage, setLocalCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [sortField, setSortField] = useState<keyof Debt>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  // Lazy loading states
  const [displayedItems, setDisplayedItems] = useState(10); // Start with 10 items
  const [isLazyLoading, setIsLazyLoading] = useState(false);
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Determine if we're using external pagination (from parent) or internal pagination
  const useExternalPagination = !!(onPageChange && propTotalCount && propTotalPages);
  const currentPage = useExternalPagination ? propCurrentPage : localCurrentPage;
  const totalCountExternal = useExternalPagination ? propTotalCount : 0;
  const totalPagesExternal = useExternalPagination ? propTotalPages : 0;

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

    
    const filtered = debts.filter((debt) => {
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
        (debt.pay_later && typeof debt.pay_later === 'string'
          ? new Date(debt.pay_later).toDateString() === selectedDate.toDateString()
          : debt.due_date 
            ? new Date(debt.due_date).toDateString() === selectedDate.toDateString()
            : false);

      return matchesSearch && matchesEmployee && matchesDate;
    });
    

    return filtered;
  }, [debts, searchTerm, selectedEmployees, selectedDate]);

  // Sort filtered debts
  const sortedDebts = useMemo(() => {
    return [...filteredDebts].sort((a, b) => {
      const aVal = a[sortField];
      const bVal = b[sortField];
      
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      
      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }
      
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [filteredDebts, sortField, sortDirection]);

  // Paginate sorted debts or use external data with lazy loading
  const paginatedDebts = useMemo(() => {
    if (useExternalPagination) {
      // If using external pagination, the debts are already paginated from server
      return filteredDebts;
    } else {
      // For lazy loading, show only the first N items based on displayedItems
      return sortedDebts.slice(0, displayedItems);
    }
  }, [sortedDebts, filteredDebts, displayedItems, useExternalPagination]);

  // Calculate pagination info for lazy loading
  let totalItems: number;
  let totalPages: number;
  let startItem: number;
  let endItem: number;

  if (useExternalPagination) {
    // External pagination - use props from parent
    totalItems = totalCountExternal;
    totalPages = totalPagesExternal;
    startItem = totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0;
    endItem = Math.min(currentPage * pageSize, totalItems);
  } else {
    // Lazy loading - show total items but display incrementally
    totalItems = sortedDebts.length;
    startItem = 1;
    endItem = Math.min(displayedItems, totalItems);
    totalPages = 1; // All data in one "page" with lazy loading
  }

  // Reset page when filters change
  React.useEffect(() => {
    if (useExternalPagination && onPageChange) {
      onPageChange(1);
    } else {
      setLocalCurrentPage(1);
      setDisplayedItems(10); // Reset lazy loading to 10 items
    }
  }, [searchTerm, selectedEmployees, selectedDate, useExternalPagination, onPageChange]);

  // Handle sorting
  const handleSort = useCallback((field: keyof Debt) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
    if (useExternalPagination && onPageChange) {
      onPageChange(1);
    } else {
      setLocalCurrentPage(1);
    }
  }, [sortField, useExternalPagination, onPageChange]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    if (useExternalPagination && onPageChange) {
      // Use external pagination handler
      onPageChange(page);
    } else {
      // Use local pagination
      setLocalCurrentPage(page);
    }
  }, [useExternalPagination, onPageChange]);

  const handlePageSizeChange = useCallback((size: number) => {
    setPageSize(size);
    if (useExternalPagination && onPageChange) {
      // Reset to page 1 when changing page size in external pagination
      onPageChange(1);
    } else {
      setLocalCurrentPage(1);
    }
  }, [useExternalPagination, onPageChange]);

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
      pay_later: "Khách hẹn trả", 
      no_info: "Chưa có thông tin",
      no_information_available: "Chưa có thông tin",
    };
    return labels[cat as keyof typeof labels] || cat;
  };

  // Function to get debt status based on category and debt data
  const getDebtStatus = (debt: Debt, modalCategory: string): string => {
    // Use actual status from database if available
    if (debt.status) {
      return debt.status;
    }
    
    // If this is paid category, all debts should show as paid
    if (modalCategory === 'paid') {
      return 'paid';
    }
    
    // For other categories, determine status based on debt data
    const remaining = Number(debt.remaining) || 0;
    const payLater = debt.pay_later;
    
    // Check if actually paid (remaining very small)
    if (remaining < 1000) {
      return 'paid';
    }
    
    // Check if has promise date
    if (payLater) {
      if (typeof payLater === 'string' && payLater.trim() !== '') {
        return 'pay_later';
      }
      if (typeof payLater === 'boolean' && payLater === true) {
        return 'pay_later';
      }
      if (payLater instanceof Date) {
        return 'pay_later';
      }
    }
    
    // Default to no info
    return 'no_information_available';
  };

  const handleSearch = useCallback(() => {
    // Search is already handled by useMemo, but this could trigger additional actions
  }, [searchTerm, selectedEmployees, selectedDate]);

  const handleExport = useCallback(() => {
    // Export functionality could be implemented here

  }, [sortedDebts]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedEmployees([]);
    setSelectedDate(undefined);
    if (useExternalPagination && onPageChange) {
      onPageChange(1); // Reset to page 1 when clearing filters
    } else {
      setLocalCurrentPage(1); // Reset pagination when clearing filters
    }
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

  // Calculate totals with proper null/undefined handling and category-specific logic
  // IMPORTANT: Calculate based on ALL sorted debts, not just displayed items
  const totalAmount = useMemo(() => {
    const total = sortedDebts.reduce((sum, debt) => {
      const amount = Number(debt.total_amount) || 0;
      return sum + (isNaN(amount) ? 0 : amount);
    }, 0);

    return total;
  }, [sortedDebts]);

  const totalRemaining = useMemo(() => {
    // For "paid" category, remaining should always be 0
    if (category === 'paid') {
      return 0;
    }
    
    // For other categories, calculate actual remaining from ALL sorted debts
    const remaining = sortedDebts.reduce((sum, debt) => {
      const remainingAmount = Number(debt.remaining) || 0;
      return sum + (isNaN(remainingAmount) ? 0 : remainingAmount);
    }, 0);

    return remaining;
  }, [sortedDebts, category]);

  // Lazy loading scroll handler
  const handleScroll = useCallback(() => {
    if (!tableContainerRef.current || isLazyLoading || useExternalPagination) return;
    
    const { scrollTop, scrollHeight, clientHeight } = tableContainerRef.current;
    const threshold = 100; // Load more when within 100px of bottom
    
    if (scrollTop + clientHeight >= scrollHeight - threshold) {
      if (displayedItems < sortedDebts.length) {
        setIsLazyLoading(true);
        
        // Simulate loading delay for better UX
        setTimeout(() => {
          setDisplayedItems(prev => {
            const newCount = Math.min(prev + 20, sortedDebts.length);
            return newCount;
          });
          setIsLazyLoading(false);
        }, 300);
      }
    }
  }, [isLazyLoading, displayedItems, sortedDebts.length, useExternalPagination]);

  // Add scroll listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (container && !useExternalPagination) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [handleScroll, useExternalPagination]);

  // Reset displayed items when data changes
  useEffect(() => {
    if (!useExternalPagination) {
      setDisplayedItems(10); // Reset to initial load of 10 items
    }
  }, [debts, searchTerm, selectedEmployees, selectedDate, useExternalPagination]);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] !h-[80vh] !max-h-[80vh] overflow-hidden flex flex-col p-0">
        <DialogHeader className="flex flex-row items-center justify-between p-4 border-b bg-background">
          <DialogTitle className="text-lg font-semibold">
            Chi tiết phiếu nợ - {getCategoryLabel(category)} (
            {useExternalPagination ? totalCountExternal : filteredDebts.length} phiếu)
            {!useExternalPagination && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                [Hiển thị: {displayedItems}/{sortedDebts.length}]
              </span>
            )}
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
            totalCount={useExternalPagination ? totalCountExternal : totalItems}
            totalAmount={formatCurrency(totalAmount)}
            totalRemaining={formatCurrency(totalRemaining)}
          />

          {/* Table */}
          <div className="flex-1 overflow-auto rounded-lg border border-gray-200 bg-white shadow-sm" ref={tableContainerRef}>
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
                    Ngày hẹn thanh toán
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
                {paginatedDebts.map((debt, index) => (
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
                      {debt.pay_later && typeof debt.pay_later !== 'boolean' ? 
                        formatDate(debt.pay_later) : 
                        (debt.due_date ? formatDate(debt.due_date) : '-')
                      }
                    </TableCell>
                    <TableCell className="h-14 px-4 text-center">
                      <StatusBadge status={getDebtStatus(debt, category)} />
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
                
                {/* Lazy loading indicator */}
                {!useExternalPagination && isLazyLoading && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-16 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-sm text-gray-500">Đang tải thêm...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                
                {/* End of data indicator */}
                {!useExternalPagination && !isLazyLoading && displayedItems >= sortedDebts.length && sortedDebts.length > 10 && (
                  <TableRow>
                    <TableCell colSpan={8} className="h-12 text-center text-sm text-gray-500">
                      ✅ Đã hiển thị tất cả {sortedDebts.length} kết quả
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Lazy Loading Status Bar - only show for internal pagination */}
          {!useExternalPagination && totalItems > 10 && (
            <div className="flex items-center justify-between px-6 py-3 border-t bg-gray-50 text-sm text-gray-600">
              <span>Hiển thị {displayedItems} trên {totalItems} kết quả</span>
              <div className="flex items-center space-x-2">
                {displayedItems < totalItems && (
                  <>
                    <span className="text-blue-600">Cuộn xuống để xem thêm</span>
                    <div className="h-2 w-2 bg-blue-600 rounded-full animate-pulse"></div>
                  </>
                )}
                {displayedItems >= totalItems && (
                  <span className="text-green-600">✅ Đã tải xong</span>
                )}
              </div>
            </div>
          )}

          {/* Pagination Controls - only show for external pagination */}
          {useExternalPagination && totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Hiển thị {startItem}-{endItem} trên {totalItems} kết quả</span>
                <Select value={pageSize.toString()} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                  <SelectTrigger className="w-20 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25">25</SelectItem>
                    <SelectItem value="50">50</SelectItem>
                    <SelectItem value="100">100</SelectItem>
                    <SelectItem value="200">200</SelectItem>
                  </SelectContent>
                </Select>
                <span>mỗi trang</span>
              </div>
              
              <div className="flex items-center gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                >
                  Đầu
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                >
                  Trước
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    
                    return (
                      <Button
                        key={pageNum}
                        variant={currentPage === pageNum ? "default" : "outline"}
                        size="sm"
                        className="w-8 h-8 p-0"
                        onClick={() => handlePageChange(pageNum)}
                      >
                        {pageNum}
                      </Button>
                    );
                  })}
                </div>
                
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                >
                  Tiếp
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                >
                  Cuối
                </Button>
              </div>
            </div>
          )}

          {loading && (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-muted-foreground">Đang tải dữ liệu...</p>
            </div>
          )}

          {!loading && (useExternalPagination ? totalCountExternal === 0 : totalItems === 0) && (
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
