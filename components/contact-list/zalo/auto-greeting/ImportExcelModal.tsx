"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Eye,
  EyeOff,
  Sparkles,
  Zap,
  Star,
  X,
  User,
  MessageSquare,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { getAccessToken } from "@/lib/auth";
import { useCurrentUser } from "@/contexts/CurrentUserContext";

interface Customer {
  zaloDisplayName: string;
  salutation?: string;
  greetingMessage?: string;
  zaloId?: string; // Thêm zaloId field
  isActive?: number;
}

interface ExistingCustomer {
  id: string;
  userId: number;
  zaloDisplayName: string;
  salutation?: string;
  greetingMessage?: string;
  conversationType?: string;
  lastMessageDate?: string;
  customerLastMessageDate?: string;
  customerStatus?: string;
  daysSinceLastMessage: number | null;
  status: "ready" | "urgent" | "stable";
  isActive: number; // 1: active, 0: inactive
}

interface CustomerValidationError {
  index: number;
  field: "zaloDisplayName" | "salutation" | "greetingMessage";
  message: string;
  type: "empty" | "invalid_format" | "duplicate" | "backend_error";
}

interface DuplicateInfo {
  index: number;
  existingCustomer: ExistingCustomer;
  newCustomer: Customer;
}

interface ImportResult {
  success: number;
  failed: number;
  errors: string[];
  message: string;
  importedIds?: string[];
}

interface ImportExcelModalProps {
  open: boolean;
  onClose: () => void;
  onImportSuccess: (importedIds: string[]) => void;
}

export default function ImportExcelModal({
  open,
  onClose,
  onImportSuccess,
}: ImportExcelModalProps) {
  const { currentUser } = useCurrentUser();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [uploadedCustomers, setUploadedCustomers] = useState<Customer[]>([]);
  const [existingCustomers, setExistingCustomers] = useState<
    ExistingCustomer[]
  >([]);
  const [customerValidationErrors, setCustomerValidationErrors] = useState<
    CustomerValidationError[]
  >([]);
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [currentErrorIndex, setCurrentErrorIndex] = useState<number>(0);
  const [showDetails, setShowDetails] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [highlightedRowRef, setHighlightedRowRef] =
    useState<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing customers when modal opens
  const fetchExistingCustomers = useCallback(async () => {
    if (!currentUser) return;

    try {
      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/customers", {
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
      });

      if (response.ok) {
        const data = await response.json();
        // Backend returns array directly, not wrapped in {customers: []}
        setExistingCustomers(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Error fetching existing customers:", error);
    }
  }, [currentUser]);

  // Reset states when modal opens/closes
  useEffect(() => {
    if (!open) {
      setFile(null);
      setUploading(false);
      setImportResult(null);
      setUploadedCustomers([]);
      setExistingCustomers([]);
      setCustomerValidationErrors([]);
      setDuplicates([]);
      setCurrentErrorIndex(0);
      setShowDetails(false);
      setShowPreview(false);
      setShowConfirmModal(false);
    } else {
      // Fetch existing customers when modal opens
      fetchExistingCustomers();
    }
  }, [open, fetchExistingCustomers]);

  const validateCustomer = useCallback(
    (customer: Customer, index: number): CustomerValidationError[] => {
      const errors: CustomerValidationError[] = [];

      // Validate zalo display name
      if (!customer.zaloDisplayName || customer.zaloDisplayName.trim() === "") {
        errors.push({
          index,
          field: "zaloDisplayName",
          message: "Tên hiển thị Zalo không được để trống",
          type: "empty",
        });
      } else if (customer.zaloDisplayName.trim().length < 2) {
        errors.push({
          index,
          field: "zaloDisplayName",
          message: "Tên hiển thị Zalo quá ngắn (tối thiểu 2 ký tự)",
          type: "invalid_format",
        });
      } else if (customer.zaloDisplayName.trim().length > 100) {
        errors.push({
          index,
          field: "zaloDisplayName",
          message: "Tên hiển thị Zalo quá dài (tối đa 100 ký tự)",
          type: "invalid_format",
        });
      }

      return errors;
    },
    [existingCustomers]
  );

  const findDuplicates = useCallback((): DuplicateInfo[] => {
    const duplicates: DuplicateInfo[] = [];

    uploadedCustomers.forEach((customer, index) => {
      const normalizedName = customer.zaloDisplayName.trim().toLowerCase();
      const existingCustomer = existingCustomers.find(
        (existing) =>
          existing.zaloDisplayName.trim().toLowerCase() === normalizedName
      );

      if (existingCustomer) {
        duplicates.push({
          index,
          existingCustomer,
          newCustomer: customer,
        });
      }
    });

    return duplicates;
  }, [uploadedCustomers, existingCustomers]);

  const validateAllCustomers = useCallback((): CustomerValidationError[] => {
    const allErrors: CustomerValidationError[] = [];

    uploadedCustomers.forEach((customer, index) => {
      const errors = validateCustomer(customer, index);
      allErrors.push(...errors);
    });

    return allErrors;
  }, [uploadedCustomers, validateCustomer]);

  // Validate customers when they change
  useEffect(() => {
    if (uploadedCustomers.length > 0) {
      const errors = validateAllCustomers();
      const duplicates = findDuplicates();
      setCustomerValidationErrors(errors);
      setDuplicates(duplicates);
      if (errors.length > 0) {
        setCurrentErrorIndex(0);
      }
    } else {
      setCustomerValidationErrors([]);
      setDuplicates([]);
      setCurrentErrorIndex(0);
    }
  }, [uploadedCustomers, validateAllCustomers, findDuplicates]);

  const handleFileSelect = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      if (
        selectedFile.type !==
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" &&
        !selectedFile.name.endsWith(".xlsx")
      ) {
        toast.error("Vui lòng chọn file Excel (.xlsx)");
        return;
      }
      setFile(selectedFile);
      setImportResult(null);
      setUploadedCustomers([]);

      // Parse file to preview
      await parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const buffer = await file.arrayBuffer();
      await workbook.xlsx.load(buffer);

      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        toast.error("File Excel không có dữ liệu");
        return;
      }

      const customers: Customer[] = [];
      let headerRowIndex = -1;
      const headers: { [key: number]: string } = {};

      // Find header row
      for (let r = 1; r <= Math.min(10, worksheet.rowCount); r++) {
        const row = worksheet.getRow(r);
        let hasHeaders = false;
        
        // Build complete headers map for this row
        const tempHeaders: { [key: number]: string } = {};
        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const text = cell.text?.trim() || '';
          if (text) {
            tempHeaders[colNumber] = text;
          }
        });
        
        // Check if this row contains the expected headers
        const headerValues = Object.values(tempHeaders).map(h => h.toLowerCase().trim());
        const hasRequiredHeaders = headerValues.some(h => 
          h === "tên hiển thị zalo" || 
          h === "xưng hô" || 
          h === "tin nhắn chào" || 
          h === "kích hoạt" ||
          h === "trạng thái" ||
          h === "zalo id"
        );
        
        if (hasRequiredHeaders) {
          // Use the complete headers map
          Object.assign(headers, tempHeaders);
          headerRowIndex = r;
          hasHeaders = true;
          break;
        }
      }

      if (headerRowIndex === -1) {
        toast.error("Không tìm thấy header row trong file Excel");
        return;
      }

      // Parse data rows
      for (let r = headerRowIndex + 1; r <= worksheet.rowCount; r++) {
        const row = worksheet.getRow(r);
        let hasData = false;
        const rowData: any = {};

        row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
          const headerName = headers[colNumber];
          let text = '';
          
          // Handle different cell value types properly
          if (cell.value !== null && cell.value !== undefined) {
            if (typeof cell.value === 'number') {
              // For large numbers, use toFixed to avoid scientific notation
              if (Math.abs(cell.value) > 1e15) {
                text = cell.value.toFixed(0);
              } else {
                text = String(cell.value);
              }
            } else if (typeof cell.value === 'string') {
              text = cell.value.trim();
            } else if (cell.value && typeof cell.value === 'object' && 'result' in cell.value) {
              // Handle formula cells
              if (typeof cell.value.result === 'number') {
                if (Math.abs(cell.value.result) > 1e15) {
                  text = cell.value.result.toFixed(0);
                } else {
                  text = String(cell.value.result);
                }
              } else {
                text = String(cell.value.result || '').trim();
              }
            } else if (cell.text) {
              text = cell.text.trim();
            } else {
              text = String(cell.value).trim();
            }
          }
          // Always include cells with headerName, even if text is empty
          if (headerName) {
            rowData[headerName] = text;
            if (text) {
              hasData = true;
            }
          }
        });

        // Skip empty rows and footer
        const name = rowData["Tên hiển thị Zalo"];
        if (
          hasData &&
          name &&
          !String(name).toLowerCase().startsWith("tổng số khách hàng")
        ) {
          // Parse isActive field - check both possible column names
          let isActive = 1; // default to active
          const isActiveValue = rowData["Kích hoạt"] || rowData["Trạng thái"];
          if (isActiveValue) {
            const normalizedValue = isActiveValue.toLowerCase().trim();
            if (
              normalizedValue === "tắt" ||
              normalizedValue === "0" ||
              normalizedValue === "false" ||
              normalizedValue === "không" ||
              normalizedValue === "chưa kích hoạt"
            ) {
              isActive = 0;
            } else if (
              normalizedValue === "kích hoạt" ||
              normalizedValue === "1" ||
              normalizedValue === "true" ||
              normalizedValue === "có"
            ) {
              isActive = 1;
            }
          }

          const customerData = {
            zaloDisplayName: name,
            salutation: rowData["Xưng hô"] || "",
            greetingMessage: rowData["Tin nhắn chào"] || "",
            zaloId: rowData["Zalo ID"] || "", // Thêm zaloId từ cột ẩn
            isActive: isActive,
          };
          
          customers.push(customerData);
        }
      }

      setUploadedCustomers(customers);
      setShowPreview(true);
      toast.success(`Đã tải ${customers.length} khách hàng từ file Excel`);
    } catch (error) {
      toast.error("Lỗi khi đọc file Excel");
    }
  };

  const handleImport = async () => {
    if (!file || !currentUser) return;

    // Kiểm tra nếu có validation errors (không bao gồm duplicates)
    const nonDuplicateErrors = customerValidationErrors.filter(
      (error) => error.type !== "duplicate"
    );
    if (nonDuplicateErrors.length > 0) {
      setShowConfirmModal(true);
      return;
    }

    await performImport();
  };

  const performImport = async () => {
    if (!file || !currentUser) return;

    setUploading(true);
    try {
      // Tạo file Excel mới chỉ chứa các dòng không có lỗi (không bao gồm duplicates)
      const validCustomers = uploadedCustomers.filter(
        (_, index) =>
          !customerValidationErrors.some(
            (error) => error.index === index && error.type !== "duplicate"
          )
      );

      // Tạo workbook mới với chỉ valid customers
      const ExcelJS = (await import("exceljs")).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Danh sách khách hàng");

      // Thêm headers
      worksheet.columns = [
        { header: "Tên hiển thị Zalo", key: "zaloDisplayName", width: 30 },
        { header: "Xưng hô", key: "salutation", width: 15 },
        { header: "Tin nhắn chào", key: "greetingMessage", width: 50 },
        { header: "Trạng thái", key: "isActive", width: 15 }, // Changed from "Kích hoạt" to "Trạng thái" to match backend
        { header: "Zalo ID", key: "zaloId", width: 20 }, // Make it visible, not hidden
      ];

      // Thêm data
      validCustomers.forEach((customer) => {
        worksheet.addRow({
          zaloDisplayName: customer.zaloDisplayName,
          salutation: customer.salutation || "",
          greetingMessage: customer.greetingMessage || "",
          isActive: customer.isActive === 1 ? "Kích hoạt" : "Chưa kích hoạt",
          zaloId: customer.zaloId || "", // Make sure zaloId is included
        });
      });

      // Tạo buffer từ workbook
      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      // Tạo file mới từ blob
      const cleanFile = new File([blob], "clean_customers.xlsx", {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const formData = new FormData();
      formData.append("file", cleanFile);

      const token = getAccessToken();
      const response = await fetch("/api/auto-greeting/import-customers", {
        method: "POST",
        headers: {
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: formData,
      });

      const result: ImportResult = await response.json();
      setImportResult(result);

      if (result.success > 0) {
        toast.success(`Import thành công ${result.success} khách hàng!`);
        if (result.importedIds) {
          onImportSuccess(result.importedIds);
        }
        // Đóng modal sau khi import thành công
        setTimeout(() => {
          onClose();
        }, 1500); // Delay 1.5s để user thấy thông báo thành công
      }

      if (result.failed > 0) {
        toast.error(`${result.failed} khách hàng import thất bại`);
      }

      // Nếu không có khách hàng nào import thành công, đóng modal sau 2s
      if (result.success === 0) {
        setTimeout(() => {
          onClose();
        }, 2000); // Delay 2s để user thấy thông báo lỗi
      }
    } catch (error) {
      toast.error("Lỗi khi import file Excel");
    } finally {
      setUploading(false);
    }
  };

  const handleClose = () => {
    onClose();
  };

  const handleConfirmImport = async () => {
    setShowConfirmModal(false);
    await performImport();
  };

  const handleCancelImport = () => {
    setShowConfirmModal(false);
  };

  // Navigation functions for errors
  const navigateToNextError = useCallback(() => {
    setCurrentErrorIndex((prev) => {
      const nextIndex = prev + 1;
      return nextIndex >= customerValidationErrors.length ? 0 : nextIndex;
    });
  }, [customerValidationErrors.length]);

  const navigateToPrevError = useCallback(() => {
    setCurrentErrorIndex((prev) => {
      const prevIndex =
        prev === 0 ? customerValidationErrors.length - 1 : prev - 1;
      return prevIndex;
    });
  }, [customerValidationErrors.length]);

  const scrollToError = useCallback(
    (errorIndex: number) => {
      if (highlightedRowRef) {
        highlightedRowRef.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
    },
    [highlightedRowRef]
  );

  // Effect to scroll to current error
  useEffect(() => {
    if (
      customerValidationErrors.length > 0 &&
      currentErrorIndex < customerValidationErrors.length
    ) {
      const currentError = customerValidationErrors[currentErrorIndex];
      if (currentError) {
        // Find the row element and scroll to it
        const rowElement = document.querySelector(
          `[data-customer-index="${currentError.index}"]`
        ) as HTMLDivElement;
        if (rowElement) {
          setHighlightedRowRef(rowElement);
          setTimeout(() => {
            rowElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
          }, 100);
        }
      }
    }
  }, [currentErrorIndex, customerValidationErrors]);

  const handleRemoveCustomer = (index: number) => {
    setUploadedCustomers((prev) => prev.filter((_, i) => i !== index));
  };

  const getErrorTypeIcon = (type: string) => {
    switch (type) {
      case "empty":
        return <XCircle className="h-4 w-4 text-red-500" />;
      case "invalid_format":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case "duplicate":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "backend_error":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getErrorTypeColor = (type: string) => {
    switch (type) {
      case "empty":
        return "bg-red-50 border-red-200";
      case "invalid_format":
        return "bg-orange-50 border-orange-200";
      case "duplicate":
        return "bg-yellow-50 border-yellow-200";
      case "backend_error":
        return "bg-red-50 border-red-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        className="!max-w-[50vw] !max-h-[95vh] p-0 overflow-auto border-0 bg-transparent no-scrollbar-modal"
        style={{ msOverflowStyle: "none", scrollbarWidth: "none" }}
      >
        <style>{`.no-scrollbar-modal { -ms-overflow-style: none; scrollbar-width: none; } .no-scrollbar-modal::-webkit-scrollbar { display: none; }`}</style>

        {/* Floating background particles */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-4 left-6 text-blue-300 animate-pulse">
            <Star className="w-2 h-2 opacity-60" />
          </div>
          <div
            className="absolute top-8 right-8 text-indigo-300 animate-bounce"
            style={{ animationDelay: "0.5s" }}
          >
            <Zap className="w-3 h-3 opacity-40" />
          </div>
          <div
            className="absolute bottom-6 left-12 text-purple-300 animate-ping"
            style={{ animationDelay: "1s" }}
          >
            <Star className="w-2 h-2 opacity-30" />
          </div>
          <div
            className="absolute bottom-12 right-6 text-blue-200 animate-pulse"
            style={{ animationDelay: "1.5s" }}
          >
            <Sparkles className="w-3 h-3 opacity-50" />
          </div>
        </div>

        {/* Main modal container with stunning effects */}
        <div className="relative p-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-600 rounded-3xl animate-gradient-shift">
          <div className="relative bg-gradient-to-br from-white via-blue-50 to-indigo-50 backdrop-blur-xl rounded-3xl shadow-2xl">
            {/* Enhanced Header */}
            <DialogHeader className="relative p-8 pb-4">
              {/* Floating sparkles in header */}
              <div className="absolute top-4 right-4 text-blue-400 animate-bounce">
                <Sparkles className="w-5 h-5 drop-shadow-lg" />
              </div>

              {/* Upload icon with pulse effect */}
              <div className="flex items-center justify-center mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-blue-400 rounded-full animate-ping opacity-30"></div>
                  <div
                    className="absolute inset-0 bg-indigo-400 rounded-full animate-ping opacity-20"
                    style={{ animationDelay: "0.5s" }}
                  ></div>
                  <div className="relative w-16 h-16 bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 rounded-full flex items-center justify-center shadow-2xl border-4 border-white">
                    <Upload className="w-8 h-8 text-white animate-pulse" />
                  </div>
                </div>
              </div>

              <DialogTitle className="text-center text-2xl font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                📊 Import khách hàng từ Excel
              </DialogTitle>

              <DialogDescription className="text-center text-base text-gray-600 font-medium max-w-md mx-auto leading-relaxed">
                Tải lên file Excel để import danh sách khách hàng
                <br />
                <span className="text-blue-500 font-bold text-sm">
                  📋 Hỗ trợ file .xlsx với định dạng chuẩn
                </span>
              </DialogDescription>
            </DialogHeader>

            {/* Main content */}
            <div className="px-8 pb-8 space-y-6">
              {/* File Upload Section */}
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                <div className="relative bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border-2 border-blue-200 shadow-inner">
                  <div className="space-y-4">
                    <div>
                      <Label
                        htmlFor="file"
                        className="text-lg font-semibold text-gray-700 mb-3 block"
                      >
                        Chọn file Excel
                      </Label>
                      <Input
                        ref={fileInputRef}
                        id="file"
                        type="file"
                        accept=".xlsx"
                        onChange={handleFileSelect}
                        className="cursor-pointer"
                      />
                    </div>

                    {file && (
                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                        <FileSpreadsheet className="h-5 w-5 text-green-600" />
                        <span className="text-green-800 font-medium">
                          {file.name}
                        </span>
                        <span className="text-green-600 text-sm">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Preview Customers Table */}
              {showPreview && uploadedCustomers.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-blue-200 to-indigo-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-blue-50 to-white p-6 rounded-2xl border-2 border-blue-200 shadow-inner">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <h3 className="text-lg font-semibold text-gray-800">
                            Xem trước dữ liệu ({uploadedCustomers.length} khách
                            hàng)
                          </h3>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowPreview(false)}
                          className="flex items-center gap-2"
                        >
                          <span className="flex items-start justify-center gap-2">
                            <EyeOff className="h-4 w-4" />
                            Ẩn preview
                          </span>
                        </Button>
                      </div>

                      <div className="max-h-80 overflow-y-auto border rounded-lg">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12">STT</TableHead>
                              <TableHead>Tên hiển thị Zalo</TableHead>
                              <TableHead>Xưng hô</TableHead>
                              <TableHead>Tin nhắn chào</TableHead>
                              <TableHead className="w-24">Trạng thái</TableHead>
                              <TableHead className="w-16">Thao tác</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {uploadedCustomers.map((customer, index) => {
                              const hasError = customerValidationErrors.some(
                                (error) => error.index === index
                              );
                              const isCurrentError =
                                customerValidationErrors.length > 0 &&
                                currentErrorIndex <
                                  customerValidationErrors.length &&
                                customerValidationErrors[currentErrorIndex]
                                  ?.index === index;
                              return (
                                <TableRow
                                  key={index}
                                  data-customer-index={index}
                                  className={`${
                                    hasError ? "bg-red-50 border-red-200" : ""
                                  } ${
                                    isCurrentError
                                      ? "ring-2 ring-blue-500 bg-blue-100"
                                      : ""
                                  } transition-all`}
                                >
                                  <TableCell className="text-center text-sm text-gray-500">
                                    {index + 1}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      <User className="h-4 w-4 text-gray-400" />
                                      <span
                                        className={
                                          hasError
                                            ? "text-red-600 font-medium"
                                            : ""
                                        }
                                      >
                                        {customer.zaloDisplayName}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <span
                                      className={hasError ? "text-red-600" : ""}
                                    >
                                      {customer.salutation || "-"}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <div className="max-w-xs truncate">
                                      <span
                                        className={
                                          hasError ? "text-red-600" : ""
                                        }
                                      >
                                        {customer.greetingMessage || "-"}
                                      </span>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex items-center gap-2">
                                      {customer.isActive === 1 ? (
                                        <>
                                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                          <span className="text-green-600 font-medium text-sm">
                                            Kích hoạt
                                          </span>
                                        </>
                                      ) : (
                                        <>
                                          <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                                          <span className="text-red-600 font-medium text-sm">
                                            Tắt
                                          </span>
                                        </>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        handleRemoveCustomer(index)
                                      }
                                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>

                      {customerValidationErrors.length > 0 && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-800">
                              Có {customerValidationErrors.length} lỗi
                              validation
                            </span>
                          </div>
                          <div className="text-sm text-red-700">
                            Vui lòng sửa các lỗi trên trước khi import
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Import Results */}
              {importResult && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-green-200 to-blue-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-green-50 to-white p-6 rounded-2xl border-2 border-green-200 shadow-inner">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <CheckCircle className="h-6 w-6 text-green-600" />
                        <h3 className="text-lg font-semibold text-gray-800">
                          Kết quả import
                        </h3>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="bg-green-100 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <CheckCircle className="h-5 w-5 text-green-600" />
                            <span className="font-semibold text-green-800">
                              Thành công
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-green-600 mt-1">
                            {importResult.success}
                          </div>
                        </div>

                        <div className="bg-red-100 p-4 rounded-lg">
                          <div className="flex items-center gap-2">
                            <XCircle className="h-5 w-5 text-red-600" />
                            <span className="font-semibold text-red-800">
                              Thất bại
                            </span>
                          </div>
                          <div className="text-2xl font-bold text-red-600 mt-1">
                            {importResult.failed}
                          </div>
                        </div>
                      </div>

                      {importResult.errors &&
                        importResult.errors.length > 0 && (
                          <div className="mt-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowDetails(!showDetails)}
                              className="flex items-center gap-2"
                            >
                              {showDetails ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                              {showDetails ? "Ẩn chi tiết" : "Xem chi tiết lỗi"}
                            </Button>

                            {showDetails && (
                              <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                                {importResult.errors.map((error, index) => (
                                  <div
                                    key={index}
                                    className="p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700"
                                  >
                                    {error}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}

              {/* Validation Errors */}
              {customerValidationErrors.length > 0 && (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-red-200 to-orange-200 rounded-2xl blur opacity-30 group-hover:opacity-50 transition-opacity duration-300"></div>
                  <div className="relative bg-gradient-to-br from-red-50 to-white p-6 rounded-2xl border-2 border-red-200 shadow-inner">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 mb-4">
                        <AlertTriangle className="h-6 w-6 text-red-600" />
                        <h3 className="text-lg font-semibold text-gray-800">
                          Lỗi validation ({customerValidationErrors.length})
                        </h3>
                      </div>

                      {/* Duplicate Preview */}
                      {duplicates.length > 0 && (
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-center gap-2 mb-3">
                            <AlertTriangle className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-800">
                              🔄 {duplicates.length} khách hàng sẽ được cập nhật
                            </span>
                          </div>
                          <div className="text-sm text-blue-700 mb-2">
                            Những khách hàng sau sẽ được cập nhật với thông tin
                            mới từ file Excel:
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {duplicates.map((duplicate, index) => (
                              <div
                                key={index}
                                className="p-2 bg-white border border-blue-200 rounded text-xs"
                              >
                                <div className="font-medium text-blue-800">
                                  {duplicate.newCustomer.zaloDisplayName}
                                </div>
                                <div className="text-blue-600 mt-1">
                                  <div>
                                    • Xưng hô: "
                                    {duplicate.existingCustomer.salutation ||
                                      "Trống"}
                                    " → "
                                    {duplicate.newCustomer.salutation ||
                                      "Trống"}
                                    "
                                  </div>
                                  <div>
                                    • Lời chào:{" "}
                                    {duplicate.newCustomer.greetingMessage
                                      ? "Có"
                                      : "Trống"}
                                  </div>
                                  <div>
                                    • Kích hoạt:{" "}
                                    {duplicate.existingCustomer.isActive === 1
                                      ? "Đang bật"
                                      : "Đang tắt"}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="text-xs text-blue-600 mt-2">
                            💡 Thông tin cũ sẽ được thay thế bằng thông tin mới
                            từ file Excel.
                          </div>
                        </div>
                      )}

                      {/* Navigation Controls */}
                      {customerValidationErrors.length > 1 && (
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={navigateToPrevError}
                              className="flex items-center gap-1"
                            >
                              <span>←</span>
                              Trước
                            </Button>
                            <span className="text-sm text-gray-600">
                              {currentErrorIndex + 1} /{" "}
                              {customerValidationErrors.length}
                            </span>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={navigateToNextError}
                              className="flex items-center gap-1"
                            >
                              Sau
                              <span>→</span>
                            </Button>
                          </div>
                          <div className="text-sm text-gray-600">
                            Lỗi hiện tại: Dòng{" "}
                            {customerValidationErrors[currentErrorIndex]
                              ?.index + 1}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2 max-h-60 overflow-y-auto">
                        {customerValidationErrors.map((error, index) => (
                          <div
                            key={index}
                            className={`p-3 rounded-lg border cursor-pointer transition-all ${
                              index === currentErrorIndex
                                ? "ring-2 ring-blue-500 bg-blue-50"
                                : getErrorTypeColor(error.type)
                            }`}
                            onClick={() => setCurrentErrorIndex(index)}
                          >
                            <div className="flex items-center gap-2">
                              {getErrorTypeIcon(error.type)}
                              <span className="font-medium text-sm">
                                Dòng {error.index + 1}: {error.field}
                              </span>
                              {index === currentErrorIndex && (
                                <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded">
                                  Hiện tại
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-gray-600 mt-1">
                              {error.message}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Action buttons with stunning effects */}
            <div className="flex justify-end gap-4 p-8 pt-0">
              {/* Close Button */}
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={uploading}
                className="group relative overflow-hidden flex items-center gap-2 px-6 py-3 text-base font-semibold border-2 border-gray-300 hover:border-gray-400 bg-white hover:bg-gray-50 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 ease-out min-w-[120px]"
              >
                <span className="flex items-center gap-2">
                  <X className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                  <span>Đóng</span>
                </span>
              </Button>

              {/* Import Button */}
              <Button
                type="button"
                onClick={handleImport}
                disabled={
                  !file ||
                  uploading ||
                  customerValidationErrors.filter(
                    (error) => error.type !== "duplicate"
                  ).length > 0
                }
                className="group relative overflow-hidden flex items-center gap-3 px-6 py-3 text-base font-bold bg-gradient-to-r from-blue-500 via-indigo-600 to-purple-600 hover:from-blue-600 hover:via-indigo-700 hover:to-purple-700 border-0 shadow-2xl hover:shadow-blue-500/50 transform hover:scale-110 hover:-translate-y-1 transition-all duration-500 ease-out rounded-xl text-white disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none min-w-[140px] justify-center"
              >
                {/* Shimmer effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000"></div>

                {uploading ? (
                  <span className="flex items-start justify-center">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span className="relative z-10">Đang import...</span>
                  </span>
                ) : (
                  <span className="flex items-start justify-center">
                    <span className="relative z-10">📊 Import</span>
                  </span>
                )}
              </Button>
            </div>

            {/* Loading overlay */}
            {uploading && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm rounded-3xl flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-500 rounded-full animate-spin"></div>
                    <div
                      className="absolute inset-2 w-12 h-12 border-4 border-indigo-200 border-t-indigo-500 rounded-full animate-spin"
                      style={{ animationDirection: "reverse" }}
                    ></div>
                  </div>
                  <p className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    Đang import khách hàng...
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Xác nhận import
              </DialogTitle>
              <DialogDescription>
                Có {customerValidationErrors.length} dòng có lỗi validation. Bạn
                có muốn bỏ qua các dòng lỗi và tiếp tục import{" "}
                {uploadedCustomers.length - customerValidationErrors.length}{" "}
                dòng còn lại không?
              </DialogDescription>
            </DialogHeader>

            <div className="flex justify-end gap-3 mt-4">
              <Button
                variant="outline"
                onClick={handleCancelImport}
                className="flex items-center gap-2"
              >
                <X className="h-4 w-4" />
                Hủy
              </Button>
              <Button
                onClick={handleConfirmImport}
                className="flex items-center gap-2 bg-orange-500 hover:bg-orange-600"
              >
                <Upload className="h-4 w-4" />
                Tiếp tục import
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
