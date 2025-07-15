import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
  confirmText?: string;
  cancelText?: string;
  hideCancelButton?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = "Xác nhận",
  cancelText = "Hủy",
  hideCancelButton = false,
}: ConfirmDialogProps) {
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShow(true);
    else {
      const timeout = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!show) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 pointer-events-auto ${
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300 pointer-events-auto ${
          isOpen ? "opacity-100" : "opacity-0"
        }`}
      />
      <div
        className={`relative bg-white rounded-xl p-7 w-full max-w-md shadow-2xl transform transition-all duration-300
          ${isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
        style={{
          boxShadow:
            "0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 1.5px 4px 0 rgba(0,0,0,0.10)",
        }}
      >
        <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="mb-7 text-gray-600">{message}</p>
        <div className="flex justify-end gap-2">
          {!hideCancelButton && (
            <Button variant="delete" onClick={onCancel}>
              {cancelText}
            </Button>
          )}
          <Button variant="add" onClick={onConfirm}>
            {confirmText}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}