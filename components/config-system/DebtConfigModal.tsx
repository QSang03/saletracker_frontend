import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAccessToken } from "@/lib/auth";
import { AlertTriangle, Plus } from "lucide-react";

export default function DebtConfigModal({ open, onClose, allConfigs = [], onSaved }: { open: boolean; onClose: () => void; allConfigs?: any[]; onSaved?: (result: { success: boolean; message: string }) => void }) {
  const [runTime, setRunTime] = useState("");
  const [remind1, setRemind1] = useState("");
  const [remind1Delay, setRemind1Delay] = useState("");
  const [remind2, setRemind2] = useState("");
  const [remind2Delay, setRemind2Delay] = useState("");
  const [reminderForSale, setReminderForSale] = useState("");

  // Validation function for checking invalid brackets
  const validateBrackets = (text: string) => {
    const validPatterns = ["{you}", "{customer_code}", "{amount}"];
    
    // Find various bracket and quote patterns
    const patterns = [
      /\{[^}]*\}/g,        // {anything}
      /\[[^\]]*\]/g,       // [anything] 
      /\{[^\}]*\]/g,       // {anything]
      /\[[^\]]*\}/g,       // [anything}
      /["'`]\{[^}]*\}["'`]/g,  // "{anything}", '{anything}', `{anything}`
      /["'`]\{[^}]*\}/g,   // "{anything}, '{anything}, `{anything}
      /\{[^}]*\}["'`]/g,   // {anything}", {anything}', {anything}`
      /["'`]\{[^}]*\}['"]/g,   // Mixed quotes like "{anything}' or '{anything}"
      /["'`]\{[^}]*\}`/g,      // Mixed quotes like "{anything}` or `{anything}"
    ];
    
    const allMatches: string[] = [];
    patterns.forEach(pattern => {
      const matches = text.match(pattern) || [];
      allMatches.push(...matches);
    });
    
    // Remove duplicates
    const uniqueMatches = [...new Set(allMatches)];
    const invalidMatches = uniqueMatches.filter(match => !validPatterns.includes(match));
    
    return {
      isValid: invalidMatches.length === 0,
      invalidMatches: invalidMatches
    };
  };

  // Check for validation errors
  const validationErrors = useMemo(() => {
    const errors: { field: string; invalidPatterns: string[] }[] = [];
    
    const remind1Validation = validateBrackets(remind1);
    if (remind1 && !remind1Validation.isValid) {
      errors.push({ 
        field: "Câu nhắc nợ lần 1", 
        invalidPatterns: remind1Validation.invalidMatches 
      });
    }
    
    const remind2Validation = validateBrackets(remind2);
    if (remind2 && !remind2Validation.isValid) {
      errors.push({ 
        field: "Câu nhắc nợ lần 2", 
        invalidPatterns: remind2Validation.invalidMatches 
      });
    }
    
    const reminderForSaleValidation = validateBrackets(reminderForSale);
    if (reminderForSale && !reminderForSaleValidation.isValid) {
      errors.push({ 
        field: "Câu nhắc cho sale", 
        invalidPatterns: reminderForSaleValidation.invalidMatches 
      });
    }
    
    return errors;
  }, [remind1, remind2, reminderForSale]);

  const hasValidationErrors = validationErrors.length > 0;

  // Helper functions to insert placeholders
  const insertPlaceholder = (currentValue: string, placeholder: string, setter: (value: string) => void) => {
    const newValue = currentValue + placeholder;
    setter(newValue);
  };

  // Prefill fields from allConfigs when modal opens or allConfigs changes
  useEffect(() => {
    if (!open) return;
    const getValue = (name: string) => allConfigs.find((c: any) => c.section === "debt" && c.name === name)?.value || "";
    setRunTime(getValue("debt_runTime"));
    setRemind1(getValue("debt_firstReminderSentence"));
    setRemind1Delay(getValue("debt_firstReminderDelayTime"));
    setRemind2(getValue("debt_secondReminderSentence"));
    setRemind2Delay(getValue("debt_secondReminderDelayTime"));
    setReminderForSale(getValue("debt_reminderForSale"));
  }, [open, allConfigs]);

  const handleSave = async () => {
    if (hasValidationErrors) return;
    
    const token = getAccessToken ? getAccessToken() : localStorage.getItem("access_token");
    const fields = [
      { name: "debt_runTime", value: runTime },
      { name: "debt_firstReminderSentence", value: remind1 },
      { name: "debt_secondReminderSentence", value: remind2 },
      { name: "debt_firstReminderDelayTime", value: remind1Delay },
      { name: "debt_secondReminderDelayTime", value: remind2Delay },
      { name: "debt_reminderForSale", value: reminderForSale },
    ];
    let success = true;
    for (const field of fields) {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || ""}/system-config/by-section/debt/${field.name}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token || ""}`,
          },
          body: JSON.stringify({ value: field.value }),
        }
      );
      if (!res.ok) success = false;
    }
    if (success) {
      if (onSaved) onSaved({ success: true, message: "Lưu cấu hình công nợ thành công!" });
      onClose();
    } else {
      if (onSaved) onSaved({ success: false, message: "Lưu cấu hình thất bại!" });
      else alert("Lưu cấu hình thất bại!");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="!w-[75vw] !min-w-[75vw] !h-[85vh] max-w-none max-h-none overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Cấu hình công nợ</DialogTitle>
        </DialogHeader>
        
        {/* Validation Errors */}
        {hasValidationErrors && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle size={16} />
              <span className="font-medium">Lỗi validation:</span>
            </div>
            <div className="mt-2 space-y-2">
              {validationErrors.map((error, index) => (
                <div key={index} className="text-sm">
                  <div className="text-red-600 font-medium">• {error.field} chứa ký tự không hợp lệ:</div>
                  <div className="ml-4 text-red-500">
                    {error.invalidPatterns.map((pattern, i) => (
                      <span key={i} className="inline-block bg-red-100 px-2 py-1 rounded mr-2 mb-1 font-mono text-xs">
                        {pattern}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-red-500 bg-red-100 p-2 rounded">
              <strong>Chỉ các placeholder sau được phép:</strong> {"{you}"}, {"{customer_code}"}, {"{amount}"}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column - Basic Settings (4/12 = 1/3) */}
          <div className="col-span-1 lg:col-span-4 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Cài đặt cơ bản</h3>
            
            <div>
              <label className="block mb-2 font-medium text-sm" htmlFor="debt-run-time">
                Thời gian chạy công nợ
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-gray-400 pointer-events-none">
                  <svg width="18" height="18" fill="none" viewBox="0 0 24 24"><path stroke="currentColor" strokeWidth="1.5" d="M12 7v5l3 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                </span>
                <Input
                  id="debt-run-time"
                  type="time"
                  step="60"
                  placeholder="hh:mm"
                  value={runTime}
                  onChange={e => setRunTime(e.target.value)}
                  className="pl-10 w-full border border-gray-300 focus:border-blue-400 rounded-md shadow-sm transition-colors duration-150"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm">Thời gian giữa lần nhắn đầu đến câu nhắc 1 (phút)</label>
              <Input
                placeholder="Nhập số phút"
                value={remind1Delay}
                onChange={e => setRemind1Delay(e.target.value)}
                type="number"
                min="0"
                className="w-full"
              />
            </div>

            <div>
              <label className="block mb-2 font-medium text-sm">Thời gian giữa lần 1 và lần 2 (phút)</label>
              <Input
                placeholder="Nhập số phút"
                value={remind2Delay}
                onChange={e => setRemind2Delay(e.target.value)}
                type="number"
                min="0"
                className="w-full"
              />
            </div>
          </div>

          {/* Right Column - Reminder Messages (8/12 = 2/3) */}
          <div className="col-span-1 lg:col-span-8 space-y-4">
            <h3 className="font-semibold text-lg border-b pb-2">Tin nhắn nhắc nợ</h3>
            
            <div>
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm">Câu nhắc nợ lần 1</label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => insertPlaceholder(remind1, "{you}", setRemind1)}
                    className="flex items-center gap-1 h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-colors duration-200"
                  >
                    <Plus size={12} className="inline-block" />
                    <span className="font-medium">{'{you}'}</span>
                  </Button>
                </div>
              </div>
              <Textarea
                placeholder="Nhập câu nhắc nợ lần 1..."
                value={remind1}
                onChange={e => setRemind1(e.target.value)}
                className={`min-h-[80px] ${remind1 && !validateBrackets(remind1).isValid ? 'border-red-300 focus:border-red-500' : ''}`}
              />
            </div>

            <div>
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm">Câu nhắc nợ lần 2</label>
                    <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => insertPlaceholder(remind2, "{you}", setRemind2)}
                    className="flex items-center gap-1 h-6 px-2 text-xs bg-blue-50 hover:bg-blue-100 border-blue-200 hover:border-blue-300 text-blue-700 hover:text-blue-800 transition-colors duration-200"
                    >
                    <Plus size={12} className="inline-block" />
                    <span className="font-medium">{'{you}'}</span>
                    </Button>
                </div>
              </div>
              <Textarea
                placeholder="Nhập câu nhắc nợ lần 2..."
                value={remind2}
                onChange={e => setRemind2(e.target.value)}
                className={`min-h-[80px] ${remind2 && !validateBrackets(remind2).isValid ? 'border-red-300 focus:border-red-500' : ''}`}
              />
            </div>

            <div>
              <div className="mb-2">
                <div className="flex items-center justify-between">
                  <label className="font-medium text-sm">Câu nhắc cho sale</label>
                  <div className="flex gap-1">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => insertPlaceholder(reminderForSale, "{customer_code}", setReminderForSale)}
                      className="flex items-center gap-1 h-6 px-2 text-xs bg-green-50 hover:bg-green-100 border-green-200 hover:border-green-300 text-green-700 hover:text-green-800 transition-colors duration-200"
                    >
                      <Plus size={12} className="inline-block" />
                      <span className="font-medium">{'{customer_code}'}</span>
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => insertPlaceholder(reminderForSale, "{amount}", setReminderForSale)}
                      className="flex items-center gap-1 h-6 px-2 text-xs bg-purple-50 hover:bg-purple-100 border-purple-200 hover:border-purple-300 text-purple-700 hover:text-purple-800 transition-colors duration-200"
                    >
                      <Plus size={12} className="inline-block" />
                      <span className="font-medium">{'{amount}'}</span>
                    </Button>
                  </div>
                </div>
              </div>
              <Textarea
                placeholder="Nhập câu nhắc cho sale..."
                value={reminderForSale}
                onChange={e => setReminderForSale(e.target.value)}
                className={`min-h-[80px] ${reminderForSale && !validateBrackets(reminderForSale).isValid ? 'border-red-300 focus:border-red-500' : ''}`}
              />
            </div>
          </div>
        </div>

        <div className="flex items-end justify-end gap-3 mt-6 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Hủy
          </Button>
          <Button 
            variant="gradient" 
            onClick={handleSave}
            disabled={hasValidationErrors}
            className={hasValidationErrors ? 'opacity-50 cursor-not-allowed' : ''}
          >
            Lưu cấu hình
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}