import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LinkIcon,
  Plus,
  Trash2,
  ExternalLink,
  X,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
} from "lucide-react";

interface LinkData {
  url: string;
  title?: string;
}

interface MultiLinkSelectorProps {
  links: LinkData[];
  onLinksChange: (links: LinkData[]) => void;
  required?: boolean;
  onValidationChange?: (error: string | null) => void;
  maxLinks?: number;
}

const MultiLinkSelector = ({
  links,
  onLinksChange,
  required = false,
  onValidationChange,
  maxLinks = 5,
}: MultiLinkSelectorProps) => {
  const [newLink, setNewLink] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [urlErrors, setUrlErrors] = useState<string[]>([]);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);

  // Validate URL
  const validateURL = (url: string): { isValid: boolean; error?: string } => {
    if (!url.trim()) return { isValid: true };

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return {
        isValid: false,
        error: "URL phải bắt đầu bằng http:// hoặc https://",
      };
    }

    try {
      const urlObj = new URL(url);
      if (!urlObj.hostname || urlObj.hostname.length < 3) {
        return { isValid: false, error: "Domain không hợp lệ" };
      }
      return { isValid: true };
    } catch {
      return { isValid: false, error: "URL không đúng định dạng" };
    }
  };

  // Validate URL exists
  const validateUrlExists = async (url: string) => {
    if (!validateURL(url).isValid) return;

    setIsValidatingUrl(true);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      await fetch(url, {
        method: "HEAD",
        mode: "no-cors",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setUrlErrors([]);
    } catch (error) {
      if ((error as any)?.name !== "AbortError") {
        setUrlErrors(["⚠️ Không thể truy cập URL này. Vui lòng kiểm tra lại địa chỉ."]);
      }
    } finally {
      setIsValidatingUrl(false);
    }
  };

  // Add link
  const addLink = async () => {
    if (!newLink.trim()) {
      setErrors(["Vui lòng nhập URL"]);
      return;
    }

    if (links.length >= maxLinks) {
      setErrors([`Tối đa ${maxLinks} liên kết`]);
      return;
    }

    const validation = validateURL(newLink);
    if (!validation.isValid) {
      setErrors([validation.error || "URL không hợp lệ"]);
      return;
    }

    // Check for duplicate URLs
    if (links.some(link => link.url === newLink.trim())) {
      setErrors(["URL này đã tồn tại"]);
      return;
    }

    setErrors([]);
    setUrlErrors([]);

    // Validate URL exists
    await validateUrlExists(newLink);

    if (urlErrors.length === 0) {
      const newLinkData: LinkData = {
        url: newLink.trim(),
        title: newTitle.trim() || undefined,
      };

      onLinksChange([...links, newLinkData]);
      setNewLink("");
      setNewTitle("");
    }
  };

  // Remove link
  const removeLink = (index: number) => {
    const newLinks = links.filter((_, i) => i !== index);
    onLinksChange(newLinks);
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Handle Enter key
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addLink();
    }
  };

  // Validation effect
  useEffect(() => {
    if (onValidationChange) {
      if (required && links.length === 0) {
        onValidationChange("Bắt buộc chọn ít nhất 1 liên kết");
      } else if (links.length > maxLinks) {
        onValidationChange(`Tối đa ${maxLinks} liên kết`);
      } else {
        onValidationChange(null);
      }
    }
  }, [links, required, maxLinks, onValidationChange]);

  return (
    <motion.div
      className="space-y-4"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LinkIcon className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Liên kết ({links.length}/{maxLinks})
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>
      </div>

      {/* Error messages */}
      <AnimatePresence>
        {(errors.length > 0 || urlErrors.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0, scale: 0.95 }}
            animate={{ opacity: 1, height: "auto", scale: 1 }}
            exit={{ opacity: 0, height: 0, scale: 0.95 }}
            className="bg-red-50 border-l-4 border-red-400 p-4 rounded-r-lg overflow-hidden"
          >
            <div className="flex">
              <motion.div
                animate={{ 
                  rotate: [0, -10, 10, 0],
                  scale: [1, 1.1, 1]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex-shrink-0 mr-3 mt-0.5"
              >
                <AlertCircle className="h-5 w-5 text-red-400" />
              </motion.div>
              <div className="flex-1">
                <h4 className="text-red-800 font-medium text-sm mb-2">
                  🔗 Lỗi liên kết:
                </h4>
                <div className="space-y-1">
                  {[...errors, ...urlErrors].map((error, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="text-red-700 text-sm bg-red-100 px-3 py-2 rounded-md"
                    >
                      • {error}
                    </motion.div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Required indicator when no links */}
      <AnimatePresence>
        {required && links.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            className="bg-orange-50 border-l-4 border-orange-400 p-3 rounded-r-lg"
          >
            <div className="flex items-center">
              <motion.div
                animate={{ 
                  scale: [1, 1.2, 1],
                  rotate: [0, 5, -5, 0]
                }}
                transition={{ 
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut"
                }}
                className="flex-shrink-0 mr-2"
              >
                <AlertCircle className="h-4 w-4 text-orange-500" />
              </motion.div>
              <div className="text-orange-700 text-sm">
                <span className="font-medium">Bắt buộc chọn ít nhất 1 liên kết!</span>
                <span className="ml-2">Tối đa {maxLinks} liên kết.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add new link form */}
      {links.length < maxLinks && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3"
        >
          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-800">
              URL liên kết
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <ExternalLink className="h-4 w-4 text-gray-400" />
              </div>
              <input
                ref={linkInputRef}
                value={newLink}
                onChange={(e) => setNewLink(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="https://example.com"
                className="w-full h-10 pl-10 pr-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-blue-800">
              Tiêu đề (tùy chọn)
            </label>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Tiêu đề cho liên kết"
              className="w-full h-10 px-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={addLink}
            disabled={!newLink.trim() || isValidatingUrl}
            className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            Thêm liên kết
          </motion.button>
        </motion.div>
      )}

      {/* Links list */}
      <div className="space-y-2">
        {links.map((link, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-blue-200 hover:border-blue-300 transition-colors"
          >
            {/* Link icon */}
            <div className="p-2 bg-blue-100 rounded-lg">
              <ExternalLink className="h-5 w-5 text-blue-600" />
            </div>
            
            {/* Link info */}
            <div className="flex-1 min-w-0">
              {link.title && (
                <p className="font-medium text-sm text-gray-800 truncate">
                  {link.title}
                </p>
              )}
              <p className="text-xs text-gray-600 truncate">
                {link.url}
              </p>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => copyToClipboard(link.url)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Sao chép"
              >
                <AnimatePresence mode="wait">
                  {copiedText === link.url ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Check className="h-4 w-4 text-green-500" />
                    </motion.div>
                  ) : (
                    <motion.div
                      key="copy"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      <Copy className="h-4 w-4" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => window.open(link.url, '_blank')}
                className="p-1.5 text-blue-400 hover:text-blue-600 transition-colors"
                title="Mở liên kết"
              >
                <ExternalLink className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => removeLink(index)}
                className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default MultiLinkSelector;
