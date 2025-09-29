"use client";
import React, { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, ChevronLeft, ChevronRight, SkipForward, HelpCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useTutorial } from "@/contexts/TutorialContext";

interface ExtraCallout {
  target: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right' | 'center';
}

interface TutorialStep {
  id: string;
  title: string;
  description: string;
  target: string; // CSS selector for the element to highlight
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  image?: string;
  extraCallouts?: ExtraCallout[]; // <-- NEW
}

const tutorialSteps: TutorialStep[] = [
  {
    id: 'welcome',
    title: 'Chào mừng đến với hướng dẫn sử dụng!',
    description: 'Chúng tôi sẽ hướng dẫn bạn cách sử dụng các tính năng chính của hệ thống quản lý liên hệ. Hãy cùng khám phá từng bước một cách chi tiết.',
    target: '',
    position: 'center'
  },
  {
    id: 'search',
    title: 'Tìm kiếm liên hệ',
    description: 'Sử dụng ô "Tìm kiếm..." để tìm liên hệ theo tên. Gõ tên liên hệ và nhấn Enter để tìm kiếm.',
    target: '.filter-controls input[placeholder*="Tìm kiếm"]',
    position: 'bottom'
  },
  {
    id: 'pagination',
    title: 'Điều chỉnh số dòng hiển thị',
    description: 'Điều chỉnh "10 dòng/trang" để xem nhiều hoặc ít liên hệ hơn trên mỗi trang.',
    target: '.filter-controls select',
    position: 'bottom'
  },
  {
    id: 'clear-filter',
    title: 'Xóa bộ lọc',
    description: 'Nút "Xóa filter" để reset tất cả bộ lọc và trở về trạng thái ban đầu.',
    target: '.filter-controls button[type="button"]',
    position: 'bottom'
  },
  {
    id: 'products-tab',
    title: 'Tab Sản phẩm',
    description: 'Tab "Sản phẩm" để cấu hình sản phẩm cho từng liên hệ. Click vào tab này để mở modal quản lý sản phẩm.',
    target: '.auto-reply-header-controls .flex.gap-3 button:first-child',
    position: 'bottom'
  },
  {
    id: 'products-table-section',
    title: 'Bộ lọc và Tìm kiếm',
    description: 'Đây là vùng bộ lọc và tìm kiếm sản phẩm. Bạn có thể tìm kiếm theo tên, lọc theo danh mục, và điều chỉnh số dòng hiển thị.',
    target: '.tutorial-filter-section',
    position: 'bottom'
  },
  {
    id: 'products-modal-header',
    title: 'Header Modal Sản phẩm',
    description: 'Đây là header của modal quản lý sản phẩm. Bạn có thể thấy tiêu đề, số lượng sản phẩm và các nút điều khiển.',
    target: '.tutorial-products-modal-header',
    position: 'bottom'
  },
  {
    id: 'products-table-list',
    title: 'Bảng Danh sách Sản phẩm',
    description: 'Đây là bảng danh sách các sản phẩm đã được cấu hình. Bạn có thể xem, chỉnh sửa, hoặc xóa sản phẩm.',
    target: '.tutorial-products-table tbody tr:first-child',
    position: 'top'
  },
  {
    id: 'products-import-section',
    title: 'Nút Import Excel',
    description: 'Đây là nút "📊 Excel" để import sản phẩm từ file Excel. Click vào đây để chọn file Excel từ máy tính.',
    target: '.tutorial-excel-button',
    position: 'bottom'
  },
  {
    id: 'products-template-section',
    title: 'Nút Tải Mẫu',
    description: 'Đây là nút "📥 Mẫu" để tải file mẫu Excel. Click vào đây để tải file template có sẵn để bạn điền dữ liệu.',
    target: '.tutorial-template-button',
    position: 'bottom'
  },
  {
    id: 'products-list-section',
    title: 'Phần Áp dụng cho',
    description: 'Đây là phần cấu hình áp dụng sản phẩm cho liên hệ. Bạn có thể chọn áp dụng cho tất cả liên hệ hoặc chỉ những liên hệ đã chọn.',
    target: '.tutorial-apply-section',
    position: 'left'
  },
  {
    id: 'keywords-tab',
    title: 'Tab Keywords',
    description: 'Tab "Keywords" để quản lý từ khóa tự động trả lời. Modal sẽ tự động mở để bạn có thể xem các tính năng bên trong.',
    target: '[data-radix-dialog-content] .tutorial-keywords-create-tab',
    position: 'bottom'
  },
  {
    id: 'keywords-modal-header',
    title: 'Header Modal Keywords',
    description: 'Đây là header của modal quản lý keywords. Bạn có thể thấy tiêu đề và nút đóng modal.',
    target: '[data-radix-dialog-content] [data-radix-dialog-header]',
    position: 'center'
  },
  {
    id: 'keywords-form-section',
    title: 'Form Thêm Keywords',
    description: 'Đây là form để thêm keywords mới. Bạn có thể nhập từ khóa, câu trả lời, và cấu hình các tùy chọn.',
    target: '[data-radix-dialog-content] .tutorial-keywords-form-section',
    position: 'bottom'
  },
  {
    id: 'keywords-input-field',
    title: 'Ô Nhập Từ Khóa',
    description: 'Nhập từ khóa mà bạn muốn tự động trả lời khi khách hàng nhắn tin.',
    target: '[data-radix-dialog-content] .tutorial-keywords-input-field',
    position: 'top'
  },
  {
    id: 'keywords-apply-all',
    title: 'Toggle Áp Dụng',
    description: 'Toggle để chọn áp dụng keywords cho tất cả khách hàng hoặc chỉ khách hàng đã chọn.',
    target: '[data-radix-dialog-content] .tutorial-keywords-apply-all',
    position: 'top'
  },
  {
    id: 'keywords-contacts-tab',
    title: 'Tab Chọn khách hàng',
    description: 'Click vào tab "Chọn khách hàng" để chọn những khách hàng cụ thể áp dụng keyword.',
    target: '[data-radix-dialog-content] .tutorial-keywords-contacts-tab',
    position: 'bottom',
    extraCallouts: [
      {
        target: '[data-radix-dialog-content] .tutorial-keywords-apply-all',
        title: '⚠️ CẢNH BÁO: Tắt "Áp dụng cho tất cả" trước!',
        description: 'Muốn chọn theo từng khách hàng, hãy tắt toggle "Áp dụng cho tất cả" trước.',
        position: 'top'
      }
    ]
  },
  {
    id: 'keywords-contacts-table',
    title: 'Bảng khách hàng',
    description: 'Bảng hiển thị danh sách khách hàng có thể chọn để áp dụng keyword.',
    target: '[data-radix-dialog-content] .tutorial-keywords-contacts-table-container',
    position: 'top'
  },
  {
    id: 'keywords-select-all',
    title: 'Nút Chọn tất cả',
    description: 'Click để chọn hoặc bỏ chọn tất cả khách hàng trong danh sách.',
    target: '[data-radix-dialog-content] .tutorial-keywords-select-all-button',
    position: 'top'
  },

  {
    id: 'keywords-list-section',
    title: 'Nút Quản lý Keywords',
    description: 'Đây là nút "Quản lý Keywords" để xem danh sách các keywords đã được tạo. Bạn có thể xem, chỉnh sửa, hoặc xóa keywords.',
    target: '[data-radix-dialog-content] .tutorial-keywords-manage-button',
    position: 'bottom'
  },
  {
    id: 'personas-tab',
    title: 'Tab Personas',
    description: 'Tab "Personas" để quản lý AI persona cho từng liên hệ. Modal sẽ tự động mở để bạn có thể xem các tính năng bên trong.',
    target: '.tutorial-personas-modal-header',
    position: 'center'
  },
  {
    id: 'personas-templates-tab',
    title: 'Tab Templates Chi tiết',
    description: 'Tab "Templates Chi tiết" để xem các template personas có sẵn.',
    target: '.tutorial-personas-templates-tab',
    position: 'bottom'
  },
  {
    id: 'personas-template-section',
    title: 'Phần Template Personas',
    description: 'Đây là phần chọn template personas có sẵn. Bạn có thể chọn từ các template được tạo sẵn hoặc tạo mới.',
    target: '.tutorial-personas-templates-container',
    position: 'bottom'
  },
  {
    id: 'personas-first-template',
    title: 'Các mẫu Template hiện có',
    description: 'Bạn có thể ấn vào để áp dụng và tùy chỉnh nội dung của template.',
    target: '.tutorial-personas-first-template',
    position: 'bottom'
  },
  {
    id: 'personas-form-tab',
    title: 'Tab Tạo Persona',
    description: 'Tab "Tạo Persona" để tạo hoặc chỉnh sửa persona mới.',
    target: '.tutorial-personas-form-tab',
    position: 'bottom'
  },
  {
    id: 'personas-name-input',
    title: 'Ô nhập tên Persona',
    description: 'Nhập tên cho persona mới. Tên nên mô tả rõ phong cách hoặc đặc điểm của persona.',
    target: '.tutorial-personas-name-input',
    position: 'bottom'
  },
  {
    id: 'personas-role-textarea',
    title: 'Ô vai trò AI',
    description: 'Nhập vai trò của AI trong giao tiếp với khách hàng.',
    target: '.tutorial-personas-role-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-style-textarea',
    title: 'Ô phong cách giao tiếp',
    description: 'Nhập phong cách giao tiếp của AI.',
    target: '.tutorial-personas-style-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-tool-first-textarea',
    title: 'Ô ưu tiên sử dụng tool',
    description: 'Nhập cách AI ưu tiên sử dụng các công cụ.',
    target: '.tutorial-personas-tool-first-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-discovery-textarea',
    title: 'Ô câu hỏi khám phá',
    description: 'Nhập câu hỏi để khám phá nhu cầu khách hàng.',
    target: '.tutorial-personas-discovery-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-offering-textarea',
    title: 'Ô cách đề xuất sản phẩm',
    description: 'Nhập cách AI đề xuất sản phẩm cho khách hàng.',
    target: '.tutorial-personas-offering-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-extras-textarea',
    title: 'Ô đề xuất combo/bổ sung',
    description: 'Nhập cách AI đề xuất combo hoặc sản phẩm bổ sung.',
    target: '.tutorial-personas-extras-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-cta-textarea',
    title: 'Ô call to action',
    description: 'Nhập câu kêu gọi hành động để chốt đơn hàng.',
    target: '.tutorial-personas-cta-textarea',
    position: 'bottom'
  },
  {
    id: 'personas-save-button',
    title: 'Nút Lưu Persona',
    description: 'Click nút "Lưu" để lưu persona mới hoặc cập nhật persona hiện tại.',
    target: '.tutorial-personas-save-button',
    position: 'left'
  },
  {
    id: 'personas-cancel-button',
    title: 'Nút Hủy',
    description: 'Click nút "Hủy" để bỏ qua việc tạo hoặc chỉnh sửa persona.',
    target: '.tutorial-personas-cancel-button',
    position: 'right'
  },
  {
    id: 'personas-library-tab',
    title: 'Tab Thư viện Personas',
    description: 'Tab "Thư viện Personas" để xem danh sách các personas đã tạo.',
    target: '.tutorial-personas-library-tab',
    position: 'bottom'
  },
  {
    id: 'personas-first-item',
    title: 'Persona đầu tiên',
    description: 'Click vào persona đầu tiên để xem chi tiết và chỉnh sửa.',
    target: '.tutorial-personas-item:first-child',
    position: 'top'
  },
  {
    id: 'personas-search-input',
    title: 'Ô tìm kiếm Personas',
    description: 'Sử dụng ô tìm kiếm để tìm persona theo tên hoặc nội dung mô tả.',
    target: '.tutorial-personas-search-input',
    position: 'bottom'
  },
  {
    id: 'personas-create-button',
    title: 'Nút Tạo mới',
    description: 'Click nút "Tạo mới" để tạo persona mới.',
    target: '.tutorial-personas-create-button',
    position: 'left'
  },
  {
    id: 'personas-list-section',
    title: 'Danh sách Personas',
    description: 'Đây là danh sách các personas đã được tạo. Bạn có thể xem, chỉnh sửa, hoặc xóa personas.',
    target: '.tutorial-personas-list-section',
    position: 'top'
  },
  {
    id: 'auto-reply-toggle',
    title: 'Toggle Bật tự động nhắn tin',
    description: 'Toggle "Bật tự động nhắn tin" để bật/tắt auto-reply cho toàn bộ hệ thống.',
    target: '.auto-reply-header-controls .flex.items-center.gap-3',
    position: 'bottom'
  },
  {
    id: 'contact-table',
    title: 'Bảng danh sách liên hệ',
    description: 'Bảng hiển thị thông tin chi tiết của từng liên hệ: tên, vai trò, persona, auto-reply, thời gian và tin nhắn cuối.',
    target: '.contact-table',
    position: 'top'
  },
  {
    id: 'select-contacts',
    title: 'Chọn liên hệ',
    description: 'Sử dụng checkbox để chọn một hoặc nhiều liên hệ cần thao tác.',
    target: '.contact-table tbody tr:first-child input[type="checkbox"]',
    position: 'top'
  },
  {
    id: 'bulk-actions',
    title: 'Thao tác hàng loạt',
    description: 'Thanh thao tác hàng loạt xuất hiện khi chọn liên hệ: "Chọn tất cả hợp lệ", "Bật/Tắt auto-reply", "Xuất dữ liệu", "Bỏ chọn".',
    target: '.bulk-actions',
    position: 'top'
  }
];

export default function ContactTableTutorial() {
  const { setIsTutorialActive } = useTutorial();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [highlightElement, setHighlightElement] = useState<HTMLElement | null>(null);
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [extraCallouts, setExtraCallouts] = useState<
    Array<{ el: HTMLElement; rect: DOMRect; cfg: ExtraCallout }>
  >([]);
  const [applyAllGuardMsg, setApplyAllGuardMsg] = useState<string | null>(null);
  const [shakeApplyAll, setShakeApplyAll] = useState(false);
  const overlayRef = useRef<HTMLDivElement>(null);
  const tutorialBoxRef = useRef<HTMLDivElement>(null);
  const isBackNavigatingRef = useRef(false);

  // Tutorial will only open when user clicks the help button
  // No auto-open on page load

  // Chặn sự kiện pointerdown/focusin để ngăn Radix Dialog đóng modal
  useEffect(() => {
    if (!isOpen) return;

    const swallow = (e: Event) => {
      if (overlayRef.current?.contains(e.target as Node)) {
        e.preventDefault?.();
        e.stopPropagation?.();
      }
    };

    // capture phase để chạy TRƯỚC handler của Radix
    document.addEventListener('pointerdown', swallow, true);
    document.addEventListener('focusin', swallow, true);
    return () => {
      document.removeEventListener('pointerdown', swallow, true);
      document.removeEventListener('focusin', swallow, true);
    };
  }, [isOpen]);

  // Listen for tutorial auto-advance events from KeywordsModal
  useEffect(() => {
    const handleTutorialAutoAdvance = (event: CustomEvent) => {
      const { fromStep, toStep } = event.detail;
      if (currentStep === fromStep - 1) { // Convert to 0-based index
        console.log(`Auto-advancing from step ${fromStep} to step ${toStep}`);
        setCurrentStep(toStep - 1); // Convert to 0-based index
      }
    };

    window.addEventListener('tutorial-auto-advance', handleTutorialAutoAdvance as EventListener);
    return () => {
      window.removeEventListener('tutorial-auto-advance', handleTutorialAutoAdvance as EventListener);
    };
  }, [currentStep]);

  // Helper: Get the topmost open dialog
  const getTopmostOpenDialog = (): HTMLElement | null => {
    // Tìm dialog đang mở (topmost)
    const portalDialog = document.querySelector('[data-radix-portal] [role="dialog"][data-state="open"]') as HTMLElement | null;
    if (portalDialog) return portalDialog;

    const directDialog = document.querySelector('[role="dialog"][data-state="open"]') as HTMLElement | null;
    if (directDialog) return directDialog;

    return null;
  };

  // Helper: Check if "Áp dụng cho tất cả" toggle is ON
  const isApplyAllOn = (): boolean => {
    const dlg = getTopmostOpenDialog();
    if (!dlg) return false;
    const container = dlg.querySelector('.tutorial-keywords-apply-all') as HTMLElement | null;
    if (!container) return false;

    // Check for Switch component (Radix UI)
    const switchEl = container.querySelector('[role="switch"]') as HTMLElement | null;
    if (switchEl) {
      const ariaChecked = switchEl.getAttribute('aria-checked');
      if (ariaChecked != null) return ariaChecked === 'true';
      const dataState = switchEl.getAttribute('data-state');
      if (dataState) return dataState === 'checked';
    }

    // Check for checkbox input
    const checkbox = container.querySelector('input[type="checkbox"]') as HTMLInputElement | null;
    if (checkbox) return checkbox.checked;

    // Fallback: check data attributes
    const dataChecked = container.getAttribute('data-checked');
    if (dataChecked != null) return dataChecked === 'true';

    return false;
  };

  // Update highlight when step changes
  useEffect(() => {
    if (isOpen) {
      const currentStepData = tutorialSteps[currentStep];

      // Clear extra callouts mỗi lần đổi step
      setExtraCallouts([]);

      const queryInDialog = (selector: string): HTMLElement | null => {
        const dialog = getTopmostOpenDialog();
        const sel = (selector || '').trim();
        if (!dialog) {
          try { return document.querySelector(sel) as HTMLElement | null; } catch { return null; }
        }

        // Nếu chỉ muốn chính content của dialog
        if (sel === '[data-radix-dialog-content]' || sel === ':dialog') {
          return (dialog.querySelector('[data-radix-dialog-content]') as HTMLElement) ?? dialog;
        }

        // Chỉ bỏ prefix khi phía sau còn selector con
        const m = sel.match(/^\[data-radix-dialog-content\]\s+(.+)$/);
        const normalized = m ? m[1] : sel;

        try {
          return dialog.querySelector(normalized) as HTMLElement | null;
        } catch {
          return null;
        }
      };
      
      // Skip highlight for welcome step
      if (currentStepData.id === 'welcome') {
        setHighlightElement(null);
        setHighlightRect(null);
        return;
      }
      
      // Special handling for bulk actions step
      if (currentStepData.id === 'bulk-actions') {
        // Auto-select first contact to show bulk actions bar
        const firstCheckbox = document.querySelector('.contact-table tbody tr:first-child input[type="checkbox"]') as HTMLInputElement;
        if (firstCheckbox && !firstCheckbox.checked) {
          firstCheckbox.click();
        }
        
        // Wait a bit for the bulk actions bar to appear
        setTimeout(() => {
          const element = queryInDialog(currentStepData.target) as HTMLElement;
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' as ScrollBehavior });
            setHighlightElement(element);
            const rect = element.getBoundingClientRect();
            setHighlightRect(rect);
          }
        }, 100);
      } else if (currentStepData.id === 'products-tab') {
        // Bước 5: Chỉ highlight tab, không mở modal
        const element = document.querySelector(currentStepData.target) as HTMLElement;
        if (element) {
          setHighlightElement(element);
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
        }
      } else if (currentStepData.id === 'products-table-section') {
        console.log('Processing products-table-section step, clearing old highlight...');
        // Clear any existing highlight first
        setHighlightElement(null);
        setHighlightRect(null);
        setExtraCallouts([]);

        // Auto-click products button to open modal
        const productsButton = document.querySelector('.tutorial-products-button') as HTMLButtonElement;
        if (productsButton) {
          productsButton.click();
        }

        // Helper: poll until element exists then highlight
        const highlightWhenReady = (selector: string, fallbackSelector?: string, attemptsLeft = 30) => {
          const tryHighlight = () => {
            console.log(`Trying to find: ${selector}, attempts left: ${attemptsLeft}`);
            let el = queryInDialog(selector) as HTMLElement | null;
            if (!el && fallbackSelector) {
              console.log(`Fallback to: ${fallbackSelector}`);
              el = queryInDialog(fallbackSelector) as HTMLElement | null;
            }
            if (el) {
              console.log('Found element, highlighting:', el);
              el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
              setHighlightElement(el);
              setHighlightRect(el.getBoundingClientRect());
            } else if (attemptsLeft > 0) {
              console.log(`Element not found, retrying in 200ms...`);
              setTimeout(() => highlightWhenReady(selector, fallbackSelector, attemptsLeft - 1), 200);
            } else {
              console.log('Max attempts reached, element not found');
            }
          };
          tryHighlight();
        };

        // Wait for modal and filters to render - try multiple selectors (bỏ prefix vì queryInDialog đã scope)
        setTimeout(() => {
          highlightWhenReady(
            '.tutorial-filter-section',
            '.tutorial-filter-controls'
          );
        }, 1000);
      } else if (currentStepData.id === 'keywords-tab') {
        console.log('Processing keywords-tab step, clearing old highlight...');
        // Clear old highlight immediately
        setHighlightElement(null);
        setHighlightRect(null);
        setExtraCallouts([]);

        // Đóng dialog đang mở (thường là modal Sản phẩm) rồi mới mở Keywords
        const dialog =
          (document.querySelector('[data-radix-portal] [role="dialog"][data-state="open"]') as HTMLElement | null) ||
          (document.querySelector('[role="dialog"][data-state="open"]') as HTMLElement | null);

        const closeOpenDialog = () => {
          if (!dialog) return false;
          const closeBtn =
            (dialog.querySelector('[data-radix-dialog-close]') as HTMLButtonElement | null) ||
            (dialog.querySelector('button[aria-label="Close"], button[aria-label="Đóng"]') as HTMLButtonElement | null);
          if (closeBtn) {
            closeBtn.click();
          } else {
            // fallback: gửi phím Escape cho Radix
            dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          }
          return true;
        };

        const hadDialog = closeOpenDialog();

        const openKeywords = () => {
          const keywordsButton = document.querySelector(
            '.tutorial-keywords-button'
          ) as HTMLButtonElement | null;
          keywordsButton?.click();

          // highlight vùng trong modal Keywords
          setTimeout(() => {
            ensureKeywordsTabActive();
            const element =
              queryInDialog(currentStepData.target) ||
              (document.querySelector(currentStepData.target) as HTMLElement | null);
            if (element) {
              setHighlightElement(element);
              setHighlightRect(element.getBoundingClientRect());
            }
          }, 300);
        };

        // chờ animation đóng (~300ms) rồi mới mở Keywords
        if (hadDialog) {
          setTimeout(openKeywords, 300);
        } else {
          openKeywords();
        }
        } else if (currentStepData.id.startsWith('keywords-')) {
          console.log('Processing keywords step:', currentStepData.id, 'target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // đảm bảo đúng tab Keywords rồi mới đo tọa độ
          setTimeout(() => {
          ensureKeywordsTabActive();

          // Special handling for keywords steps
          if (currentStepData.id === 'keywords-list-section') {
            // Just highlight the manage button, don't auto-click it
            const element = queryInDialog(currentStepData.target);
            if (element) {
              element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
              setHighlightElement(element);
              setHighlightRect(element.getBoundingClientRect());
            }
            return;
          } else if (currentStepData.id === 'keywords-contacts-tab') {
            // For contacts tab step, don't switch tabs (we want to highlight the tab itself)
          } else if (currentStepData.id === 'keywords-apply-all') {
            // For apply-all step, ensure create tab is active
            ensureKeywordsTabActive();
            
            // Wait for tab to be active then highlight the toggle
            setTimeout(() => {
              const element = queryInDialog(currentStepData.target);
              if (element) {
                element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
                setHighlightElement(element);
                setHighlightRect(element.getBoundingClientRect());
                computeExtraCallouts();
              }
            }, 200);
            return;
          } else if (currentStepData.id === 'keywords-contacts-table' ||
                     currentStepData.id === 'keywords-select-all' ||
                     currentStepData.id === 'keywords-contact-checkbox') {
            // Ensure contacts tab is active for these steps
            const contactsTab = document.querySelector('[data-radix-dialog-content] .tutorial-keywords-contacts-tab') as HTMLElement;
            if (contactsTab && contactsTab.getAttribute('aria-selected') !== 'true') {
              (contactsTab as HTMLButtonElement).click();
            }
          }

          const element = queryInDialog(currentStepData.target);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
          }

          // Compute extra callouts
          const computeExtraCallouts = () => {
            const list: Array<{ el: HTMLElement; rect: DOMRect; cfg: ExtraCallout }> = [];
            const extras = currentStepData.extraCallouts ?? [];
            extras.forEach((cfg) => {
              const el = queryInDialog(cfg.target) as HTMLElement | null
                ?? (document.querySelector(cfg.target) as HTMLElement | null);
              if (el) {
                const rect = el.getBoundingClientRect();
                list.push({ el, rect, cfg });
              }
            });
            setExtraCallouts(list);
          };
          computeExtraCallouts();
        }, 300);
        } else if (currentStepData.id === 'personas-tab') {
          console.log('Processing personas-tab step, clearing old highlight...');
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Close Keywords modal first, then open Personas modal
          const keywordsModal = getTopmostOpenDialog();
          if (keywordsModal) {
            console.log('Found Keywords modal, closing it...');
            const closeButton = keywordsModal.querySelector('button[aria-label="Close"], button[aria-label="Đóng"], [data-radix-dialog-close]') as HTMLButtonElement;
            if (closeButton) {
              console.log('Clicking close button...');
              closeButton.click();
            } else {
              // Fallback: send Escape key
              console.log('No close button found, sending Escape key...');
              keywordsModal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
            }
          }

          // Wait for Keywords modal to close, then open Personas modal
          setTimeout(() => {
            console.log('Opening Personas modal...');
            const personasButton = document.querySelector('.tutorial-personas-button') as HTMLButtonElement;
            if (personasButton) {
              personasButton.click();
            }

            // Wait for Personas modal to open then highlight immediately
            setTimeout(() => {
              // Dispatch event to activate library tab for personas-tab step
              const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
                detail: { tab: 'library' }
              });
              window.dispatchEvent(tabChangeEvent);

              const element = document.querySelector(currentStepData.target) as HTMLElement;
              console.log('Found target element for personas-tab:', element, 'target:', currentStepData.target);
              if (element) {
                setHighlightElement(element);
                const rect = element.getBoundingClientRect();
                setHighlightRect(rect);
                console.log('Highlighted personas-tab element:', element, 'rect:', rect);
              } else {
                console.log('Target element not found for personas-tab');
                // Try to find any element with tutorial class
                const tutorialElements = document.querySelectorAll('[class*="tutorial-personas"]');
                console.log('Available tutorial elements:', tutorialElements.length);
                tutorialElements.forEach((el, i) => {
                  console.log(`Element ${i}:`, el.className, el);
                });
              }

              // Compute extra callouts
              const computeExtraCallouts = () => {
                const list: Array<{ el: HTMLElement; rect: DOMRect; cfg: ExtraCallout }> = [];
                const extras = currentStepData.extraCallouts ?? [];
                extras.forEach((cfg) => {
                  const el = document.querySelector(cfg.target) as HTMLElement | null;
                  if (el) list.push({ el, rect: el.getBoundingClientRect(), cfg });
                });
                setExtraCallouts(list);
              };
              computeExtraCallouts();
            }, 300); // Reduced wait time
          }, 300); // Reduced wait time
        } else if (currentStepData.id === 'personas-library-tab') {
          console.log('Processing personas library tab step:', currentStepData.id, 'target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Dispatch custom event to switch to library tab
          const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
            detail: { tab: 'library' }
          });
          window.dispatchEvent(tabChangeEvent);

          // Find and highlight the target element
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          console.log('Found target element:', element);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
            console.log('Highlighted element:', element);
          } else {
            console.log('Target element not found for selector:', currentStepData.target);
          }
        } else if (currentStepData.id === 'personas-first-item' ||
                   currentStepData.id === 'personas-search-input' ||
                   currentStepData.id === 'personas-create-button' ||
                   currentStepData.id === 'personas-list-section') {
          console.log('Processing personas library step:', currentStepData.id, 'target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Find and highlight the target element
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          console.log('Found target element:', element);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
            console.log('Highlighted element:', element);
          } else {
            console.log('Target element not found for selector:', currentStepData.target);
          }
        } else if (currentStepData.id === 'personas-form-tab') {
          console.log('Processing personas form tab step:', currentStepData.id, 'target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Dispatch custom event to switch to form tab
          window.dispatchEvent(new CustomEvent('tutorial-tab-change', { 
            detail: { tab: 'create' } 
          }));

          // Find and highlight the form tab immediately
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          console.log('Found target element:', element);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
            console.log('Highlighted element:', element);
          } else {
            console.log('Target element not found for selector:', currentStepData.target);
          }
        } else if (currentStepData.id === 'personas-name-input' ||
                   currentStepData.id === 'personas-role-textarea' ||
                   currentStepData.id === 'personas-style-textarea' ||
                   currentStepData.id === 'personas-tool-first-textarea' ||
                   currentStepData.id === 'personas-discovery-textarea' ||
                   currentStepData.id === 'personas-offering-textarea' ||
                   currentStepData.id === 'personas-extras-textarea' ||
                   currentStepData.id === 'personas-cta-textarea' ||
                   currentStepData.id === 'personas-save-button' ||
                   currentStepData.id === 'personas-cancel-button' ||
                   currentStepData.id === 'personas-form-section') {
          console.log('Processing personas form step:', currentStepData.id, 'target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Dispatch custom event to switch to form tab
          window.dispatchEvent(new CustomEvent('tutorial-tab-change', { 
            detail: { tab: 'create' } 
          }));

          // Find and highlight the target element immediately
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          console.log('Found target element:', element);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
            console.log('Highlighted element:', element);
          } else {
            console.log('Target element not found for selector:', currentStepData.target);
          }
        } else if (currentStepData.id === 'personas-templates-tab') {
          console.log('Processing personas-templates-tab step, target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Dispatch event to activate templates tab for personas-templates-tab step
          const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
            detail: { tab: 'templates' }
          });
          window.dispatchEvent(tabChangeEvent);

          // Highlight the tab itself
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            setHighlightElement(element);
            setHighlightRect(element.getBoundingClientRect());
            console.log('Highlighted templates tab:', element);
          }
        } else if (currentStepData.id === 'personas-template-section') {
          console.log('Processing personas-template-section step, target:', currentStepData.target);
          // Clear old highlight immediately
          setHighlightElement(null);
          setHighlightRect(null);
          setExtraCallouts([]);

          // Dispatch event to ensure templates tab is active for personas-template-section step
          const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
            detail: { tab: 'templates' }
          });
          window.dispatchEvent(tabChangeEvent);

          // Highlight the templates section with viewport-constrained size
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          console.log('Found target element:', element);
          if (element) {
            element.scrollIntoView({ block: 'center', inline: 'center', behavior: 'auto' });
            
            // Get element rect and constrain to viewport
            const rect = element.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;
            
            // Constrain highlight to viewport size
            const constrainedRect = {
              left: Math.max(0, rect.left),
              top: Math.max(0, rect.top),
              width: Math.min(rect.width, viewportWidth - Math.max(0, rect.left)),
              height: Math.min(rect.height, viewportHeight - Math.max(0, rect.top)),
              right: Math.min(rect.right, viewportWidth),
              bottom: Math.min(rect.bottom, viewportHeight),
              x: Math.max(0, rect.left),
              y: Math.max(0, rect.top),
              toJSON: () => ({})
            } as DOMRect;
            
            setHighlightElement(element);
            setHighlightRect(constrainedRect);
            console.log('Highlighted element with constrained rect:', element, constrainedRect);
          } else {
            console.log('Target element not found for selector:', currentStepData.target);
          }
      } else if (currentStepData.id.includes('modal-header') || 
                 currentStepData.id.includes('import-section') || 
                 currentStepData.id.includes('form-section') || 
                 currentStepData.id.includes('list-section') ||
                 currentStepData.id.includes('template-section') ||
                 currentStepData.id.includes('table-section') ||
                 currentStepData.id === 'products-table-list') {
        // For modal content steps, wait a bit for modal to be fully rendered
        setTimeout(() => {
          const element = document.querySelector(currentStepData.target) as HTMLElement;
          if (element) {
            setHighlightElement(element);
            const rect = element.getBoundingClientRect();
            setHighlightRect(rect);
          }

          // Compute extra callouts
          const computeExtraCallouts = () => {
            const list: Array<{ el: HTMLElement; rect: DOMRect; cfg: ExtraCallout }> = [];
            const extras = currentStepData.extraCallouts ?? [];
            extras.forEach((cfg) => {
              const el = document.querySelector(cfg.target) as HTMLElement | null;
              if (el) list.push({ el, rect: el.getBoundingClientRect(), cfg });
            });
            setExtraCallouts(list);
          };
          computeExtraCallouts();
        }, 200);
      } else {
        const element = document.querySelector(currentStepData.target) as HTMLElement;
        if (element) {
          setHighlightElement(element);
          const rect = element.getBoundingClientRect();
          setHighlightRect(rect);
        }

        // Compute extra callouts
        const computeExtraCallouts = () => {
          const list: Array<{ el: HTMLElement; rect: DOMRect; cfg: ExtraCallout }> = [];
          const extras = currentStepData.extraCallouts ?? [];
          extras.forEach((cfg) => {
            const el = document.querySelector(cfg.target) as HTMLElement | null;
            if (el) list.push({ el, rect: el.getBoundingClientRect(), cfg });
          });
          setExtraCallouts(list);
        };
        computeExtraCallouts();
      }
    }
  }, [currentStep, isOpen]);

  // Cập nhật bounding khi viewport thay đổi (tránh lệch khi dialog còn animation)
  useEffect(() => {
    if (!highlightElement) return;
    const update = () => setHighlightRect(highlightElement.getBoundingClientRect());
    const id = requestAnimationFrame(update);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      cancelAnimationFrame(id);
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [highlightElement]);

  // Cập nhật rect cho extra callouts khi resize/scroll
  useEffect(() => {
    if (!extraCallouts.length) return;
    const update = () => {
      setExtraCallouts(prev =>
        prev.map(it => ({ ...it, rect: it.el.getBoundingClientRect() }))
      );
    };
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [extraCallouts.length]);

  // Clear guard message when user turns off toggle at step 17
  useEffect(() => {
    const step = tutorialSteps[currentStep];
    if (!isOpen || step?.id !== 'keywords-contacts-tab') return;
    
    const dlg = getTopmostOpenDialog();
    const container = dlg?.querySelector('.tutorial-keywords-apply-all') as HTMLElement | null;
    if (!container) return;
    
    let isProcessing = false; // Prevent duplicate processing
    
    const onChange = () => {
      // Skip if already processing or in back navigation mode
      if (isProcessing || (window as any).__tutorialBackNavigation) {
        console.log('Skipping onChange - processing:', isProcessing, 'backNav:', (window as any).__tutorialBackNavigation);
        return;
      }
      
      isProcessing = true;
      console.log('Toggle changed, isApplyAllOn:', isApplyAllOn(), 'currentStep:', currentStep);
      
      if (!isApplyAllOn()) {
        setApplyAllGuardMsg(null);
        
        console.log('User turned OFF toggle - will change tab and advance step');
        
        // Method 1: Send event to change tab
        const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
          detail: { tab: 'contacts' }
        });
        console.log('Dispatching tutorial-tab-change event with tab: contacts');
        window.dispatchEvent(tabChangeEvent);
        
        // Method 2: Directly click the contacts tab (more reliable)
        setTimeout(() => {
          const contactsTab = document.querySelector('[data-radix-dialog-content] .tutorial-keywords-contacts-tab') as HTMLButtonElement;
          console.log('Looking for contacts tab:', contactsTab);
          if (contactsTab) {
            const isSelected = contactsTab.getAttribute('aria-selected') === 'true' || contactsTab.getAttribute('data-state') === 'active';
            console.log('Contacts tab selected state:', isSelected);
            if (!isSelected) {
              console.log('Clicking contacts tab directly');
              contactsTab.click();
            } else {
              console.log('Contacts tab already selected');
            }
          } else {
            console.log('Contacts tab not found');
          }
        }, 100);
        
        // Step 2: Auto-advance after tab change with longer delay for DOM update
        setTimeout(() => {
          if (currentStep === 16) { // We're at step 17 (index 16)
            console.log('Auto-advancing from step 17 to step 18');
            setCurrentStep(17); // Jump to step 18 (index 17)
          }
          isProcessing = false;
        }, 1000); // Give more time for tab to change and DOM to update
      } else {
        isProcessing = false;
      }
    };
    
    // Use capture phase to catch events early
    container.addEventListener('click', onChange, true);
    
    return () => {
      container.removeEventListener('click', onChange, true);
    };
  }, [currentStep, isOpen]);

  // Helper functions for modal management
  const getModalGroup = (id: string): 'products' | 'keywords' | 'personas' | null => {
    return (id.match(/^(products|keywords|personas)/)?.[1] as any) ?? null;
  };
  
  const isModalContentStep = (id: string) =>
    /(modal-header|import-section|form-section|list-section|template-section|table-section|table-list|products-table-section|keywords-)/.test(id);

  // Helper: Ensure Keywords tab is active before highlighting
  const ensureKeywordsTabActive = () => {
    const dlg = getTopmostOpenDialog();
    if (!dlg) return;

    // Tìm tab "Tạo Keywords" bằng CSS class
    let btn = dlg.querySelector('.tutorial-keywords-create-tab') as HTMLElement | null;

    // Fallback theo selector tab
    if (!btn) {
      btn = dlg.querySelector('[role="tab"]:first-child') as HTMLElement | null;
    }

    if (btn && btn.getAttribute('aria-selected') !== 'true') (btn as HTMLButtonElement).click();
  };

  const handleNext = () => {
    const currentStepData = tutorialSteps[currentStep];
    const nextStepData = tutorialSteps[currentStep + 1];
    
    // Guard for step 17: Check if "Áp dụng cho tất cả" toggle is OFF
    if (currentStepData.id === 'keywords-contacts-tab') {
      if (isApplyAllOn()) {
        setApplyAllGuardMsg('Vui lòng tắt "Áp dụng cho tất cả" để qua bước tiếp theo.');
        // Scroll toggle into view
        const el = getTopmostOpenDialog()?.querySelector('.tutorial-keywords-apply-all') as HTMLElement | null;
        el?.scrollIntoView({ block: 'center', inline: 'center', behavior: 'smooth' });
        // Trigger shake animation
        setShakeApplyAll(true);
        setTimeout(() => setShakeApplyAll(false), 650);
        return; // BLOCK step transition
      } else {
        setApplyAllGuardMsg(null);
        // Auto-switch to contacts tab when toggle is OFF
        console.log('handleNext - toggle is OFF, switching to contacts tab');
        const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
          detail: { tab: 'contacts' }
        });
        window.dispatchEvent(tabChangeEvent);
        
        // Also directly click the contacts tab for reliability
        setTimeout(() => {
          const contactsTab = document.querySelector('[data-radix-dialog-content] .tutorial-keywords-contacts-tab') as HTMLButtonElement;
          if (contactsTab) {
            const isSelected = contactsTab.getAttribute('aria-selected') === 'true' || contactsTab.getAttribute('data-state') === 'active';
            if (!isSelected) {
              console.log('handleNext - Clicking contacts tab directly');
              contactsTab.click();
            }
          }
        }, 100);
      }
    }

    // Auto-switch to "Tạo Persona" tab when going from step 24 to 25
    if (currentStepData.id === 'personas-first-template' && nextStepData?.id === 'personas-form-tab') {
      console.log('handleNext - switching to create tab for personas form');
      const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
        detail: { tab: 'create' }
      });
      window.dispatchEvent(tabChangeEvent);
    }

    // Auto-switch to "Thư viện" tab when going from step 35 to 36
    if (currentStepData.id === 'personas-cancel-button' && nextStepData?.id === 'personas-library-tab') {
      console.log('handleNext - switching to library tab for personas library');
      const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
        detail: { tab: 'library' }
      });
      window.dispatchEvent(tabChangeEvent);
    }

    // Auto-close Personas modal when going from step 40 to 41
    if (currentStepData.id === 'personas-list-section' && nextStepData?.id === 'auto-reply-toggle') {
      console.log('handleNext - closing Personas modal when going to auto-reply-toggle');
      
      // Close Personas modal first
      const personasModal = getTopmostOpenDialog();
      if (personasModal) {
        console.log('Found Personas modal, closing it...');
        const closeButton = personasModal.querySelector('button[aria-label="Close"], button[aria-label="Đóng"], [data-radix-dialog-close]') as HTMLButtonElement;
        if (closeButton) {
          console.log('Clicking close button...');
          closeButton.click();
        } else {
          // Fallback: send Escape key
          console.log('No close button found, sending Escape key...');
          personasModal.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        }
      }

      // Wait for Personas modal to close, then proceed to next step
      setTimeout(() => {
        console.log('Personas modal closed, proceeding to next step...');
        if (currentStep < tutorialSteps.length - 1) {
          setCurrentStep(currentStep + 1);
        } else {
          handleComplete();
        }
      }, 600); // 600ms delay to allow modal close animation
      return; // Exit early to prevent immediate step change
    }
    
    // Improved modal management with grouping
    const isCurrentModal = isModalContentStep(currentStepData.id);
    const isNextModal = !!nextStepData && isModalContentStep(nextStepData.id);
    const currentGroup = getModalGroup(currentStepData.id);
    const nextGroup = nextStepData ? getModalGroup(nextStepData.id) : null;
    
    // Close modal when leaving modal -> non-modal, or switching between different modal groups
    if (isCurrentModal && (!isNextModal || (currentGroup && nextGroup && currentGroup !== nextGroup))) {
      // Also close KeywordsAccordionDialog if it's open
      const keywordsAccordionDialog = document.querySelector('.tutorial-keywords-accordion-dialog');
      if (keywordsAccordionDialog) {
        const closeButton = keywordsAccordionDialog.querySelector('button[aria-label="Close"], button[aria-label="Đóng"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      }

      // Also switch back to "Tạo Keywords" tab if coming from "Chọn khách hàng" tab
      if (currentStepData.id.startsWith('keywords-') && currentStepData.id !== 'keywords-tab') {
        const createTab = document.querySelector('[data-radix-dialog-content] .tutorial-keywords-create-tab') as HTMLElement;
        if (createTab && createTab.getAttribute('aria-selected') !== 'true') {
          (createTab as HTMLButtonElement).click();
        }
      }

      // Handle modal closing for different modal groups
      const openModal = getTopmostOpenDialog();
      if (openModal) {
        const closeButton = openModal.querySelector('button[aria-label="Close"], button[aria-label="Đóng"], [data-radix-dialog-close]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
          // Wait for modal to close before proceeding
          setTimeout(() => {
            if (currentStep < tutorialSteps.length - 1) {
              setCurrentStep(currentStep + 1);
            } else {
              handleComplete();
            }
          }, 300); // 300ms delay to allow modal close animation
          return; // Exit early to prevent immediate step change
        }
      }
    }
    
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    const currentStepData = tutorialSteps[currentStep];
    const prevStepData = tutorialSteps[currentStep - 1];
    
    console.log('handleBack - currentStep:', currentStep, 'currentStepData.id:', currentStepData.id, 'prevStepData.id:', prevStepData?.id);
    
    // Set back navigation flag to prevent conflicts
    isBackNavigatingRef.current = true;
    (window as any).__tutorialBackNavigation = true;
    
    // Special handling for going back to keywords steps
    if (currentStep >= 17 && prevStepData && prevStepData.id.startsWith('keywords-')) {
      console.log('Going back to keywords step - ensuring proper state');

      // Always ensure we're on "create" tab when going back to keywords
      const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
        detail: { tab: 'create' }
      });
      window.dispatchEvent(tabChangeEvent);

      // Wait for tab change, then ensure toggle is ON
      setTimeout(() => {
        const dlg = getTopmostOpenDialog();
        if (dlg) {
          const toggleContainer = dlg.querySelector('.tutorial-keywords-apply-all') as HTMLElement;
          if (toggleContainer) {
            const switchEl = toggleContainer.querySelector('[role="switch"]') as HTMLElement;
            const isCurrentlyOn = switchEl ? switchEl.getAttribute('aria-checked') === 'true' : false;

            console.log('Back navigation - toggle state:', isCurrentlyOn);
            if (!isCurrentlyOn) {
              console.log('Turning toggle ON for back navigation');
              toggleContainer.click();
            }
          }
        }

        // Clear flags after operations complete
        setTimeout(() => {
          isBackNavigatingRef.current = false;
          (window as any).__tutorialBackNavigation = false;
        }, 300);
      }, 200);
    }

    // Special handling for going back from step 25 to 24 (personas form to first template)
    if (currentStepData.id === 'personas-form-tab' && prevStepData?.id === 'personas-first-template') {
      console.log('Going back from personas form to first template - switching to templates tab');
      
      // Switch to templates tab
      const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
        detail: { tab: 'templates' }
      });
      window.dispatchEvent(tabChangeEvent);

      // Clear flags after tab switch
      setTimeout(() => {
        isBackNavigatingRef.current = false;
        (window as any).__tutorialBackNavigation = false;
      }, 100);
    }

    // Special handling for going back from step 36 to 35 (personas library to cancel button)
    if (currentStepData.id === 'personas-library-tab' && prevStepData?.id === 'personas-cancel-button') {
      console.log('Going back from personas library to cancel button - switching to form tab');
      
      // Switch to form tab
      const tabChangeEvent = new CustomEvent('tutorial-tab-change', {
        detail: { tab: 'create' }
      });
      window.dispatchEvent(tabChangeEvent);

      // Clear flags after tab switch
      setTimeout(() => {
        isBackNavigatingRef.current = false;
        (window as any).__tutorialBackNavigation = false;
      }, 100);
    }
    // Special handling for going back to personas steps
    else if (prevStepData && prevStepData.id.startsWith('personas-')) {
      console.log('Going back to personas step - ensuring proper state');
      // Clear flags immediately for personas steps
      isBackNavigatingRef.current = false;
      (window as any).__tutorialBackNavigation = false;
    }
    
    // Clear guard messages
    setApplyAllGuardMsg(null);
    setShakeApplyAll(false);    // Only close modal if moving from modal content to non-modal content
    const isCurrentModal = isModalContentStep(currentStepData.id);
    const isPrevModal = !!prevStepData && isModalContentStep(prevStepData.id);
    
    // Close modal only if moving away from modal content
    if (isCurrentModal && !isPrevModal) {
      // Also close KeywordsAccordionDialog if it's open
      const keywordsAccordionDialog = document.querySelector('.tutorial-keywords-accordion-dialog');
      if (keywordsAccordionDialog) {
        const closeButton = keywordsAccordionDialog.querySelector('button[aria-label="Close"], button[aria-label="Đóng"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      }

      const openModal = document.querySelector('[data-radix-dialog-content]');
      if (openModal) {
        const closeButton = document.querySelector('[data-radix-dialog-content] button[aria-label="Close"], [data-radix-dialog-content] button[aria-label="Đóng"]') as HTMLButtonElement;
        if (closeButton) {
          closeButton.click();
        }
      }
    } else if (isCurrentModal && isPrevModal) {
      // For modal-to-modal navigation, the main logic above handles everything
      console.log('Modal-to-modal navigation - main logic handles tab/toggle state');

      // Special handling for personas modal steps
      if (currentStepData.id.startsWith('personas-') && prevStepData.id.startsWith('personas-')) {
        // Both steps are in personas modal, no need to change tabs
        console.log('Both steps in personas modal - no tab change needed');
      }
    }
    
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    // Close any open modals when skipping
    const openModal = document.querySelector('[data-radix-dialog-content]');
    if (openModal) {
      const closeButton = document.querySelector('[data-radix-dialog-content] button[aria-label="Close"], [data-radix-dialog-content] button[aria-label="Đóng"]') as HTMLButtonElement;
      if (closeButton) {
        closeButton.click();
      }
    }
    
    // Reset to first step for next time
    setCurrentStep(0);
    setIsOpen(false);
    setIsCompleted(true);
    setIsTutorialActive(false); // Disable tutorial mode
    localStorage.setItem('contact-table-tutorial-seen', 'true');
  };

  const handleComplete = () => {
    // Clear any selected contacts when tutorial completes
    const checkboxes = document.querySelectorAll('.contact-table tbody input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      if (checkbox.checked) {
        checkbox.click();
      }
    });
    
    // Reset to first step for next time
    setCurrentStep(0);
    setIsOpen(false);
    setIsCompleted(true);
    setIsTutorialActive(false); // Disable tutorial mode
    localStorage.setItem('contact-table-tutorial-seen', 'true');
  };

  const handleRestart = () => {
    setCurrentStep(0);
    setIsOpen(true);
    setIsCompleted(false);
    setIsTutorialActive(true); // Enable tutorial mode
  };

  // Always show help button when tutorial is not open
  if (!isOpen) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
          <Button
            onClick={() => {
              setIsOpen(true);
              setIsTutorialActive(true); // Enable tutorial mode
            }}
            variant="outline"
            size="sm"
            className="bg-white/90 backdrop-blur-sm border-blue-200 text-blue-600 hover:bg-blue-50"
          ><div className="flex items-center">
            <HelpCircle className="w-4 h-4 mr-2" />
            Hướng dẫn
           </div>
          </Button>
        
      </div>
    );
  }

  const currentStepData = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  return (
        <AnimatePresence>
          {isOpen && (
            <div ref={overlayRef} data-tutorial-active="true">
          {/* Backdrop with holes for highlight and extraCallouts */}
          {highlightRect && currentStepData.id !== 'welcome' ? (
            <>
              {/* SVG mask approach for clean holes */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[2147483645]"
                onClick={handleSkip}
              >
                <svg className="w-full h-full">
                  <defs>
                    <mask id="highlight-mask">
                      {/* White means visible, black means transparent */}
                      <rect width="100%" height="100%" fill="white" />
                      {/* Create holes for main highlight */}
                      <rect 
                        x={highlightRect.left - 8}
                        y={highlightRect.top - 8}
                        width={highlightRect.width + 16}
                        height={highlightRect.height + 16}
                        fill="black"
                      />
                      {/* Create holes for extraCallouts */}
                      {extraCallouts.map((callout, idx) => (
                        <rect 
                          key={idx}
                          x={callout.rect.left - 8}
                          y={callout.rect.top - 8}
                          width={callout.rect.width + 16}
                          height={callout.rect.height + 16}
                          fill="black"
                        />
                      ))}
                    </mask>
                  </defs>
                  <rect 
                    width="100%" 
                    height="100%" 
                    fill="rgba(0, 0, 0, 0.3)" 
                    mask="url(#highlight-mask)"
                  />
                </svg>
              </motion.div>
              
              {/* Highlight border */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="fixed border-4 border-blue-500 rounded-lg shadow-2xl z-[2147483646]"
                style={{
                  left: highlightRect.left - 8,
                  top: highlightRect.top - 8,
                  width: highlightRect.width + 16,
                  height: highlightRect.height + 16
                }}
              >
                <div className="absolute inset-0 border-2 border-blue-300 rounded-lg" />
              </motion.div>

              {/* Extra highlight borders */}
              {extraCallouts.map(({ rect, cfg }, idx) => {
                const isApplyAllCallout = cfg.target.includes('.tutorial-keywords-apply-all');
                return (
                  <motion.div
                    key={`extra-ring-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={
                      isApplyAllCallout && shakeApplyAll 
                        ? { x: [0, -8, 8, -6, 6, -3, 3, 0], opacity: 1, scale: 1 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={{ duration: 0.6 }}
                    className={`fixed border-4 rounded-lg shadow-2xl z-[2147483649] ${
                      isApplyAllCallout ? 'border-red-500' : 'border-amber-500'
                    }`}
                    style={{
                      left: rect.left - 8,
                      top: rect.top - 8,
                      width: rect.width + 16,
                      height: rect.height + 16
                    }}
                  >
                    <div className={`absolute inset-0 border-2 rounded-lg ${
                      isApplyAllCallout ? 'border-red-300' : 'border-amber-300'
                    }`} />
                    {/* Làm sáng nội dung bên trong khung highlight cho bước 17 */}
                    {isApplyAllCallout && (
                      <div className="absolute inset-0 bg-white/30 mix-blend-screen rounded-lg" />
                    )}
                  </motion.div>
                );
              })}

              {/* Extra callout boxes */}
              {extraCallouts.map(({ rect, cfg }, idx) => {
                const viewportWidth = window.innerWidth;
                const viewportHeight = window.innerHeight;
                const isApplyAllCallout = cfg.target.includes('.tutorial-keywords-apply-all');
                const descText = isApplyAllCallout && applyAllGuardMsg ? applyAllGuardMsg : cfg.description;
                
                  // Calculate main tutorial modal position to avoid it
                let mainModalTop = 0;
                let mainModalLeft = 0;
                
                if (highlightRect) {
                  if (currentStepData.id === 'welcome') {
                    mainModalTop = viewportHeight / 2;
                    mainModalLeft = viewportWidth / 2;
                  } else {
                    mainModalTop = currentStepData.position === 'center'
                      ? highlightRect.top + highlightRect.height / 2
                      : currentStepData.position === 'bottom'
                      ? highlightRect.bottom + 20
                      : highlightRect.top - 20;
                    mainModalLeft = highlightRect.left + highlightRect.width / 2;
                  }
                }
                
                // Position extra callouts close to each other and main modal
                let top, left, transform;
                
                if (idx === 0) {
                  // First callout: position at top-right corner for step 17
                  if (currentStepData.id === 'keywords-contacts-tab') {
                    top = 280;
                    left = viewportWidth - 800;
                    transform = 'none';
                  } else {
                    // Default: bottom-left corner
                    top = viewportHeight - 200;
                    left = 20;
                    transform = 'none';
                  }
                } else if (idx === 1) {
                  // Second callout: position at bottom-right corner
                  top = viewportHeight - 200;
                  left = viewportWidth - 300;
                  transform = 'none';
                } else {
                  // Additional callouts: stack on the left
                  top = viewportHeight - 200 - (idx * 120);
                  left = 20;
                  transform = 'none';
                }
                
                  // Ensure callouts don't go off screen
                if (left < 20) left = 20;
                if (left > viewportWidth - 300) left = viewportWidth - 300;
                if (top < 20) top = 20;
                if (top > viewportHeight - 150) top = viewportHeight - 150;
                
                return (
                  <motion.div
                    key={`extra-box-${idx}`}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={
                      isApplyAllCallout && shakeApplyAll 
                        ? { x: [0, -8, 8, -6, 6, -3, 3, 0], opacity: 1, scale: 1 }
                        : { opacity: 1, scale: 1 }
                    }
                    transition={{ duration: 0.6 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className={`fixed z-[2147483650] rounded-lg shadow-2xl max-w-xs p-3 ${
                      (cfg.title.includes('CẢNH BÁO') || (isApplyAllCallout && applyAllGuardMsg))
                        ? 'bg-red-100 border-3 border-red-500 shadow-red-200' 
                        : 'bg-amber-50 border-2 border-amber-400 shadow-amber-200'
                    }`}
                    style={{ top, left, transform, pointerEvents: 'auto' }}
                  >
                    <div className={`text-sm font-bold ${
                      (cfg.title.includes('CẢNH BÁO') || (isApplyAllCallout && applyAllGuardMsg))
                        ? 'text-red-800' 
                        : 'text-amber-800'
                    }`}>
                      {cfg.title.includes('CẢNH BÁO') ? cfg.title : (isApplyAllCallout && applyAllGuardMsg) ? '⚠️ CẢNH BÁO' : cfg.title}
                    </div>
                    <div className={`text-xs mt-1 ${
                      (cfg.title.includes('CẢNH BÁO') || (isApplyAllCallout && applyAllGuardMsg))
                        ? 'text-red-700' 
                        : 'text-amber-700'
                    }`}>{descText}</div>
                  </motion.div>
                );
              })}
            </>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/30 z-[2147483645]"
              onClick={handleSkip}
            />
          )}
          
          {/* Tutorial Overlay */}
          <motion.div
            ref={tutorialBoxRef}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            className="fixed z-[2147483647] bg-white rounded-xl shadow-2xl border border-gray-200 max-w-md mx-4"
            style={{ 
              pointerEvents: 'auto',
              // Position modal right next to highlighted area
              ...(currentStepData.id === 'welcome' ? {
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                maxWidth: '500px'
              } : highlightRect ? {
                top: (currentStepData.id === 'contact-table' || currentStepData.id === 'select-contacts' || currentStepData.id === 'bulk-actions')
                  ? `${highlightRect.top - 250}px`  // Even higher up for table and actions
                  : currentStepData.id === 'keywords-contacts-tab'
                    ? `${highlightRect.top - 40}px`  // Move higher up to avoid overlapping extraCallouts
                    : currentStepData.id === 'personas-template-section'
                    ? `${highlightRect.top - 100}px`  // Move higher up for personas template section
                    : currentStepData.id === 'personas-first-template'
                    ? `${highlightRect.top - 80}px`  // Move higher up for first template
                    : currentStepData.position === 'center'
                    ? `${highlightRect.top + highlightRect.height / 2}px`
                    : currentStepData.position === 'bottom'
                    ? `${highlightRect.bottom + 20}px`
                    : `${highlightRect.top - 20}px`,
                left: currentStepData.id === 'auto-reply-toggle' 
                  ? `${highlightRect.left - 200}px`  // Move further to the left for toggle
                  : currentStepData.id === 'keywords-contacts-tab'
                    ? `${highlightRect.left - 450}px`  // Move even further to the left to avoid overlapping extraCallouts
                    : highlightRect.left + highlightRect.width / 2,
                transform: currentStepData.id === 'auto-reply-toggle'
                  ? 'translateX(-100%)'  // Align to the left for toggle
                  : currentStepData.id === 'keywords-contacts-tab'
                    ? 'translateX(-100%)'  // Align to the left for keywords-contacts-tab
                    : currentStepData.position === 'center'
                    ? 'translate(-50%, -50%)'  // Center the modal on the highlight area
                    : 'translateX(-50%)',
                maxWidth: '400px'
              } : {
                top: currentStepData.position === 'bottom' ? '20%' : '60%',
                left: '50%',
                transform: 'translateX(-50%)'
              })
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-600 font-semibold text-sm">
                    {currentStep + 1}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{currentStepData.title}</h3>
                  <p className="text-sm text-gray-600">{currentStepData.description}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSkip}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>

            {/* Progress Bar */}
            <div className="px-4 py-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-500 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Bước {currentStep + 1} / {tutorialSteps.length}</span>
                <span>{Math.round(progress)}%</span>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex justify-center gap-2 px-4 py-3">
              {tutorialSteps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    index === currentStep ? 'bg-blue-500' : 
                    index < currentStep ? 'bg-blue-300' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-gray-200">
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-gray-500 hover:text-gray-700"
              >
                Bỏ qua
              </Button>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBack}
                  disabled={currentStep === 0}
                  className="flex items-center gap-1"
                >
                  <div className="flex items-center">
                  <ChevronLeft className="w-4 h-4" />
                  Quay lại
                  </div>
                </Button>
                
                <Button
                  onClick={handleNext}
                  size="sm"
                  className="bg-blue-500 hover:bg-blue-600 text-white flex items-center gap-1 relative z-[2147483648]"
                  style={{ pointerEvents: 'auto' }}
                >
                  <div className="flex items-center">
                  {currentStep === tutorialSteps.length - 1 ? 'Hoàn thành' : 'Tiếp theo'}
                  <ChevronRight className="w-4 h-4" />
                  </div>
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
