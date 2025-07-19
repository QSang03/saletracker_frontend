import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: React.ReactNode | string;
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
  // Block all pointer and keyboard events in the background when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const stopEvent = (e: Event) => {
      // Only allow events inside the modal
      const modal = document.getElementById('confirm-modal-root');
      if (modal && !modal.contains(e.target as Node)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };
    document.addEventListener('mousedown', stopEvent, true);
    document.addEventListener('mouseup', stopEvent, true);
    document.addEventListener('pointerdown', stopEvent, true);
    document.addEventListener('pointerup', stopEvent, true);
    document.addEventListener('click', stopEvent, true);
    document.addEventListener('keydown', stopEvent, true);
    document.addEventListener('focusin', stopEvent, true);
    return () => {
      document.removeEventListener('mousedown', stopEvent, true);
      document.removeEventListener('mouseup', stopEvent, true);
      document.removeEventListener('pointerdown', stopEvent, true);
      document.removeEventListener('pointerup', stopEvent, true);
      document.removeEventListener('click', stopEvent, true);
      document.removeEventListener('keydown', stopEvent, true);
      document.removeEventListener('focusin', stopEvent, true);
    };
  }, [isOpen]);
  const [show, setShow] = useState(isOpen);

  useEffect(() => {
    if (isOpen) setShow(true);
    else {
      const timeout = setTimeout(() => setShow(false), 250);
      return () => clearTimeout(timeout);
    }
  }, [isOpen]);

  if (!show) return null;

  // Trap focus inside modal and block all pointer/keyboard events in background
  // When modal is open, prevent tab navigation and pointer events for all background content
  return createPortal(
    <>
      {/* Focus trap before modal */}
      <div tabIndex={0} aria-hidden="true" style={{position:'fixed',width:1,height:1,opacity:0}} onFocus={e => {
        const modal = document.getElementById('confirm-modal-root');
        modal?.focus();
      }} />
      <div
        id="confirm-modal-root"
        className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-300 ${
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        }`}
        style={{ pointerEvents: isOpen ? "auto" : "none" }}
        aria-modal="true"
        role="dialog"
        tabIndex={0}
        onKeyDown={e => {
          // Trap tab and shift+tab inside modal
          if (e.key === "Tab") {
            e.preventDefault();
          }
          // Prevent all keyboard events from propagating to background
          e.stopPropagation();
        }}
      >
      {/* Single overlay to block all clicks outside modal */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px] transition-all duration-300"
        style={{ pointerEvents: "auto" }}
        onClick={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseUp={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerDown={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onPointerUp={e => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
      <div
        className={`relative bg-white rounded-xl p-7 w-full max-w-md shadow-2xl transform transition-all duration-300
          ${isOpen ? "scale-100 opacity-100 translate-y-0" : "scale-95 opacity-0 translate-y-4"}
        `}
        style={{
          boxShadow:
            "0 8px 32px 0 rgba(31, 38, 135, 0.37), 0 1.5px 4px 0 rgba(0,0,0,0.10)"
        }}
        onMouseDown={e => { e.stopPropagation(); }}
        onMouseUp={e => { e.stopPropagation(); }}
        onPointerDown={e => { e.stopPropagation(); }}
        onPointerUp={e => { e.stopPropagation(); }}
      >
        <h3 className="text-xl font-bold mb-2 text-gray-800">{title}</h3>
        <p className="mb-7 text-gray-600">{message}</p>
        <div className="flex justify-end gap-2" style={{ pointerEvents: "auto" }}>
          {!hideCancelButton && (
            <Button
              variant="delete"
              onClick={onCancel}
              tabIndex={-1}
            >
              {cancelText}
            </Button>
          )}
          <Button
            variant="add"
            onClick={onConfirm}
            tabIndex={-1}
          >
            {confirmText}
          </Button>
        </div>
      </div>
      </div>
      {/* Focus trap after modal */}
      <div tabIndex={0} aria-hidden="true" style={{position:'fixed',width:1,height:1,opacity:0}} onFocus={e => {
        const modal = document.getElementById('confirm-modal-root');
        modal?.focus();
      }} />
    </>,
    document.body
  );
}