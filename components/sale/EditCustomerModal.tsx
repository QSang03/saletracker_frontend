import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { toast } from "sonner";
import { campaignAPI } from "@/lib/campaign-api";

interface Customer {
  id: string;
  phone_number: string;
  full_name: string;
  salutation?: string;
}

interface EditCustomerModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: Customer | null;
  campaignId: string;
  onSuccess: () => void;
}

const PHONE_REGEX = /^(0[3|5|7|8|9])+([0-9]{8})$/;

export default function EditCustomerModal({
  isOpen,
  onClose,
  customer,
  campaignId,
  onSuccess,
}: EditCustomerModalProps) {
  const [formData, setFormData] = useState({
    phone_number: "",
    full_name: "",
    salutation: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    if (customer && isOpen) {
      setFormData({
        phone_number: customer.phone_number,
        full_name: customer.full_name,
        salutation: customer.salutation || "",
      });
      setErrors({});
    }
  }, [customer, isOpen]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Validate phone number
    const phoneNumber = formData.phone_number.trim();
    if (!phoneNumber) {
      newErrors.phone_number = "Số điện thoại không được để trống";
    } else if (!PHONE_REGEX.test(phoneNumber)) {
      newErrors.phone_number = "Số điện thoại không đúng định dạng (VD: 0987654321)";
    }

    // Validate full name
    const fullName = formData.full_name.trim();
    if (!fullName) {
      newErrors.full_name = "Họ tên không được để trống";
    } else if (fullName.length < 2) {
      newErrors.full_name = "Họ tên phải có ít nhất 2 ký tự";
    }

    // Validate salutation (optional but if provided, should not be just spaces)
    const salutation = formData.salutation.trim();
    if (formData.salutation && !salutation) {
      newErrors.salutation = "Xưng hô không được chỉ chứa khoảng trắng";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleConfirmSave = async () => {
    if (!customer) return;

    try {
      setLoading(true);
      
      await campaignAPI.updateCampaignCustomer(campaignId, customer.id, {
        phone_number: formData.phone_number.trim(),
        full_name: formData.full_name.trim(),
        salutation: formData.salutation.trim() || undefined,
      });

      toast.success("Cập nhật thông tin khách hàng thành công");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.error("Error updating customer:", error);
      const errorMessage = error?.response?.data?.message || "Có lỗi xảy ra khi cập nhật";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
      setShowConfirm(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      setShowConfirm(true);
    }
  };

  const handleCancel = () => {
    setShowConfirm(false);
  };

  if (!customer) return null;

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Chỉnh sửa thông tin khách hàng</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4">
            {/* Phone Number */}
            <div className="space-y-2">
              <Label htmlFor="phone_number">
                Số điện thoại <span className="text-red-500">*</span>
              </Label>
              <Input
                id="phone_number"
                type="tel"
                value={formData.phone_number}
                onChange={(e) => handleInputChange("phone_number", e.target.value)}
                placeholder="0987654321"
                className={errors.phone_number ? "border-red-500" : ""}
              />
              {errors.phone_number && (
                <p className="text-sm text-red-500">{errors.phone_number}</p>
              )}
            </div>

            {/* Full Name */}
            <div className="space-y-2">
              <Label htmlFor="full_name">
                Họ tên <span className="text-red-500">*</span>
              </Label>
              <Input
                id="full_name"
                type="text"
                value={formData.full_name}
                onChange={(e) => handleInputChange("full_name", e.target.value)}
                placeholder="Nguyễn Văn A"
                className={errors.full_name ? "border-red-500" : ""}
              />
              {errors.full_name && (
                <p className="text-sm text-red-500">{errors.full_name}</p>
              )}
            </div>

            {/* Salutation */}
            <div className="space-y-2">
              <Label htmlFor="salutation">Xưng hô</Label>
              <Input
                id="salutation"
                type="text"
                value={formData.salutation}
                onChange={(e) => handleInputChange("salutation", e.target.value)}
                placeholder="Anh, Chị, Em..."
                className={errors.salutation ? "border-red-500" : ""}
              />
              {errors.salutation && (
                <p className="text-sm text-red-500">{errors.salutation}</p>
              )}
            </div>

            <DialogFooter className="gap-2">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                disabled={loading}
              >
                Hủy
              </Button>
              <Button 
                type="submit" 
                variant="edit"
                disabled={loading}
              >
                {loading ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showConfirm}
        title="Xác nhận thay đổi"
        message={
          <div>
            <p className="mb-3">Bạn có chắc chắn muốn cập nhật thông tin khách hàng này không?</p>
            <div className="p-3 bg-gray-50 rounded-md text-sm space-y-1">
              <div><strong>Số điện thoại:</strong> {formData.phone_number}</div>
              <div><strong>Họ tên:</strong> {formData.full_name}</div>
              {formData.salutation && (
                <div><strong>Xưng hô:</strong> {formData.salutation}</div>
              )}
            </div>
          </div>
        }
        onConfirm={handleConfirmSave}
        onCancel={handleCancel}
        confirmText={loading ? "Đang lưu..." : "Xác nhận"}
        cancelText="Hủy"
      />
    </>
  );
}
