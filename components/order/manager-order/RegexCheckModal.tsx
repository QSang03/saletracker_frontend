import React, { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface RegexCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const RegexCheckModal: React.FC<RegexCheckModalProps> = ({ isOpen, onClose }) => {
  const [input, setInput] = useState<string>("");
  const [results, setResults] = useState<Array<any>>([]);
  const [copyStatus, setCopyStatus] = useState<Record<number, string>>({});

  // Robust clipboard copy: try navigator.clipboard, otherwise fallback to textarea+execCommand
  const copyToClipboard = async (text: string) => {
    if (!text) return false;
    // Try modern API first
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch (e) {
      // ignore and try fallback
    }

    // Fallback method
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      // Avoid scrolling to bottom
      ta.style.position = "fixed";
      ta.style.top = "0";
      ta.style.left = "0";
      ta.style.width = "1px";
      ta.style.height = "1px";
      ta.style.padding = "0";
      ta.style.border = "none";
      ta.style.outline = "none";
      ta.style.boxShadow = "none";
      ta.style.background = "transparent";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(ta);
      return ok;
    } catch (e) {
      return false;
    }
  };

  // Build JS regex equivalent based on the Python pattern described by the user
  const pattern = useMemo(() => {
    const sep = `[ \t]*[;；؛﹔︔][ \t]*`;

    const parts = [
      `^\\s*[-–•*]?\\s*(?<code>[A-Z0-9][A-Z0-9_\\-\\.+]+?)\\s*`,
      sep,
      `(?<name>[^;；；﹔︔]+?)\\s*`,
      sep,
      `(?=[^;；；﹔︔]*?(?<price>(?:\\d{1,3}(?:,\\d{3})*(?:[.,]\\d+)?|\\d+(?:[.,]\\d+)?)(?:\\s*(?:k|tr|triệu|m|vnd|vnđ|đ))?))`,
      `[^;；؛﹔︔]*`,
      `(?:`,
      sep,
      `(?:(?:(?:sl|số\\s*l(?:ư|u)ợng|so\\s*luong|soluong|qty|x)\\s*[:：=]?\\s*)?(?<qty>\\d+(?:[.,]\\d+)?))?`,
      `(?:[ \\t]+[^\\n]*)?`,
      `)?`,
    ];

    return parts.join("");
  }, []);

  const regex = useMemo(() => {
    try {
      // flags: i - case insensitive, m - multiline, u - unicode
      return new RegExp(pattern, "imu");
    } catch (err) {
      return null;
    }
  }, [pattern]);

  const handleValidate = () => {
    const lines = input.split(/\r?\n/).map((l) => l.trim()).filter((l) => l !== "");
    const out: Array<any> = [];
    if (!regex) {
      setResults([{ error: "Invalid regex pattern" }]);
      return;
    }

    for (const line of lines) {
      const m = line.match(regex);
      if (m) {
        const groups = (m as any).groups || {};
        out.push({ line, ok: true, groups });
      } else {
        out.push({ line, ok: false });
      }
    }

    setResults(out);
  };

  const clear = () => {
    setInput("");
    setResults([]);
  };

  const closeAndClear = () => {
    clear();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) closeAndClear(); }}>
    <DialogContent className="!max-w-[60vw] w-full">
        <DialogHeader>
          <DialogTitle>Kiểm tra cú pháp tin nhắn</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">
              Nhập mỗi dòng một sản phẩm theo định dạng: Mã ; Tên ; Giá ; (SL optional). Hệ thống hỗ trợ các dạng dấu chấm phẩy unicode.
            </p>
          </div>

          <div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              rows={8}
              className="w-full p-3 border rounded-md text-sm font-mono"
              placeholder={`VD: ABC123; Sản phẩm mẫu; 1,200,000 đ; sl: 2`}
            />
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={clear}>Xóa</Button>
            <Button onClick={handleValidate}>Kiểm tra</Button>
          </div>

          <div>
            <h4 className="font-medium mb-2">Kết quả</h4>
            <div className="max-h-64 overflow-auto border rounded-lg p-2 bg-white/50">
              {results.length === 0 ? (
                <div className="text-sm text-gray-600">Không có kết quả</div>
              ) : (
                results.map((r, idx) => (
                  <div key={idx} className={`p-2 rounded mb-2 ${r.ok ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-mono break-words">{r.line}</div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm font-semibold">
                          {r.ok ? (
                            <span className="text-green-700">Đúng cú pháp</span>
                          ) : (
                            <span className="text-red-700">Sai cú pháp</span>
                          )}
                        </div>
                        {r.ok && (
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={async () => {
                                const ok = await copyToClipboard(String(r.line));
                                if (ok) {
                                  setCopyStatus((s) => ({ ...s, [idx]: "Đã sao chép cú pháp" }));
                                } else {
                                  setCopyStatus((s) => ({ ...s, [idx]: "Không thể sao chép" }));
                                }
                                setTimeout(() => setCopyStatus((s) => ({ ...s, [idx]: "" })), 1500);
                              }}
                            >
                              Sao chép cú pháp
                            </Button>
                            <div className="text-xs text-green-600">{copyStatus[idx] ?? ""}</div>
                          </div>
                        )}
                      </div>
                    </div>
                    {r.error && <div className="text-xs text-red-600 mt-1">{r.error}</div>}

                    {r.ok && (
                      <div className="mt-2 text-sm">
                        <div>
                          <div className="mt-0">
                            <div><strong>Mã:</strong> {r.groups?.code ?? r.groups?._code ?? "-"}</div>
                            <div><strong>Tên:</strong> {r.groups?.name ?? "-"}</div>
                            <div><strong>Giá:</strong> {r.groups?.price ?? "-"}</div>
                            <div><strong>SL:</strong> {r.groups?.qty ?? "-"}</div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RegexCheckModal;
