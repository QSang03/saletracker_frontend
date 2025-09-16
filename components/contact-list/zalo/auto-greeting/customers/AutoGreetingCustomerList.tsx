"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import CustomerHistoryModal from "../CustomerHistoryModal";
import { Upload, Users, Clock, AlertCircle, CheckCircle, History, FileSpreadsheet } from "lucide-react";

interface Customer {
  id: string;
  userId: number;
  zaloDisplayName: string;
  salutation?: string;
  greetingMessage?: string;
  lastMessageDate?: Date;
  daysSinceLastMessage: number;
  status: 'ready' | 'urgent' | 'stable';
}

export default function AutoGreetingCustomerList() {
  const [openCustomerId, setOpenCustomerId] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadCustomers();
  }, []);

  const loadCustomers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/auto-greeting/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      } else {
        toast.error('Lỗi tải danh sách khách hàng');
      }
    } catch (error) {
      console.error('Error loading customers:', error);
      toast.error('Lỗi tải danh sách khách hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;

    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Chỉ hỗ trợ file Excel (.xlsx, .xls)');
      return;
    }

    try {
      setUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/auto-greeting/import-customers', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(result.message);
        loadCustomers(); // Reload customers after import
      } else {
        const error = await response.json();
        toast.error(error.message || 'Lỗi import khách hàng');
      }
    } catch (error) {
      console.error('Error importing customers:', error);
      toast.error('Lỗi import khách hàng');
    } finally {
      setUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };


  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'urgent':
        return {
          className: 'bg-red-100 text-red-800 border-red-200',
          text: 'Khẩn cấp',
          icon: AlertCircle
        };
      case 'ready':
        return {
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          text: 'Sẵn sàng',
          icon: Clock
        };
      case 'stable':
        return {
          className: 'bg-green-100 text-green-800 border-green-200',
          text: 'Ổn định',
          icon: CheckCircle
        };
      default:
        return {
          className: 'bg-gray-100 text-gray-800 border-gray-200',
          text: 'Không xác định',
          icon: Clock
        };
    }
  };

  const getStatusText = (customer: Customer) => {
    if (customer.daysSinceLastMessage === 999) {
      return 'Chưa có tin nhắn';
    }
    if (customer.daysSinceLastMessage === 0) {
      return 'Hôm nay';
    }
    if (customer.daysSinceLastMessage === 1) {
      return '1 ngày trước';
    }
    return `${customer.daysSinceLastMessage} ngày trước`;
  };

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="h-5 w-5 text-blue-600" />
          <h3 className="font-semibold text-gray-800">Upload danh sách khách hàng</h3>
        </div>
        <Button
          onClick={() => fileInputRef.current?.click()}
          className="bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-300"
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? 'Đang upload...' : 'Upload Excel'}
        </Button>
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileInputChange}
        className="hidden"
      />

      {/* Customer List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-green-600" />
            <h3 className="font-semibold text-gray-800">Danh sách khách hàng</h3>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {customers.length}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
            <span className="ml-2 text-gray-600">Đang tải danh sách khách hàng...</span>
          </div>
        ) : customers.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">Chưa có khách hàng nào</h3>
            <p className="text-gray-500">Hãy upload file Excel để thêm khách hàng</p>
          </div>
        ) : (
          <div className="space-y-3">
            {customers.map((customer) => {
              const statusBadge = getStatusBadge(customer.status);
              const StatusIcon = statusBadge.icon;
              
              return (
                <div
                  key={customer.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow duration-200"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {customer.zaloDisplayName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-800">
                            {customer.zaloDisplayName}{customer.salutation ? `(${customer.salutation})` : ''}
                          </h4>
                          <p className="text-sm text-gray-500">
                            {getStatusText(customer)}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenCustomerId(customer.id)}
                        className="border-gray-300 text-gray-600 hover:bg-gray-50"
                      >
                        <History className="h-4 w-4 mr-1" />
                        Lịch sử
                      </Button>
                      
                      <div className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${statusBadge.className}`}>
                        <StatusIcon className="h-3 w-3" />
                        {statusBadge.text}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Customer History Modal */}
      <CustomerHistoryModal
        customerId={openCustomerId}
        open={!!openCustomerId}
        onClose={() => setOpenCustomerId(null)}
      />
    </div>
  );
}