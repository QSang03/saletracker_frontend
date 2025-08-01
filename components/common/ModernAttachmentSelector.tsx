import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus,
  LinkIcon,
  Paperclip,
  Upload,
  ExternalLink,
  FileText,
  Trash2,
  Eye,
  Copy,
  Check,
  X,
  AlertCircle,
  CheckCircle2,
  Image,
  Video,
  Music,
  FileSpreadsheet,
  Archive,
  Code,
} from "lucide-react";

// ✅ 1. Cập nhật interface để hỗ trợ filename
interface AttachmentData {
  base64?: string;
  url?: string;
  filename?: string;
  size?: number;
  type?: string;
}

interface ModernAttachmentSelectorProps {
  type: "image" | "link" | "file" | null;
  onTypeChange: (type: "image" | "link" | "file" | null) => void;
  data: string;
  onDataChange: (data: string) => void;
  required?: boolean;
  onValidationChange?: (error: string | null) => void;
  // ✅ 2. Thêm callback để trả về metadata
  onAttachmentDataChange?: (attachmentData: AttachmentData | null) => void;
}

const ModernAttachmentSelector = ({
  type,
  onTypeChange,
  data,
  onDataChange,
  required = false,
  onValidationChange,
  onAttachmentDataChange,
}: ModernAttachmentSelectorProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const [urlErrors, setUrlErrors] = useState<string[]>([]);
  const [isValidatingUrl, setIsValidatingUrl] = useState(false);
  
  // ✅ 3. State để lưu thông tin file
  const [currentFile, setCurrentFile] = useState<{
    name: string;
    size: number;
    type: string;
  } | null>(null);

  const attachmentTypes = [
    {
      type: "image" as const,
      icon: ImagePlus,
      label: "Hình ảnh",
      description: "JPG, PNG, GIF",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      accept: "image/*",
      maxSize: 10,
    },
    {
      type: "link" as const,
      icon: LinkIcon,
      label: "Liên kết",
      description: "URL, Website",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
    },
    {
      type: "file" as const,
      icon: Paperclip,
      label: "Tệp tin",
      description: "PDF, DOC, ZIP",
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      accept: "*",
      maxSize: 20,
    },
  ];

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Validate file
  const validateFile = (file: File, maxSizeMB: number) => {
    const errors = [];
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`Tệp quá lớn. Tối đa ${maxSizeMB}MB`);
    }
    return errors;
  };

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

  // ✅ 4. Cập nhật handleUrlChange để gọi callback
  const handleUrlChange = (url: string) => {
    onDataChange(url);

    // Gọi callback với thông tin URL
    if (onAttachmentDataChange) {
      onAttachmentDataChange(url ? { url } : null);
    }

    if (url) {
      const validation = validateURL(url);
      if (!validation.isValid && validation.error) {
        setUrlErrors([validation.error]);
      } else {
        setUrlErrors([]);
      }
    } else {
      setUrlErrors([]);
    }
  };

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

  // Read file with progress tracking
  const readFileWithProgress = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onloadstart = () => {
        setIsProcessing(true);
        setProcessingProgress(0);
      };

      reader.onprogress = (event) => {
        if (event.lengthComputable) {
          const progress = (event.loaded / event.total) * 100;
          setProcessingProgress(progress);
        }
      };

      reader.onload = (event) => {
        setProcessingProgress(100);
        setTimeout(() => {
          setIsProcessing(false);
          setProcessingProgress(0);
          resolve(event.target?.result as string);
        }, 100);
      };

      reader.onerror = () => {
        setIsProcessing(false);
        setProcessingProgress(0);
        reject(new Error("Không thể đọc file"));
      };

      reader.readAsDataURL(file);
    });
  };

  // ✅ 5. Cập nhật handleFiles để lưu thông tin file và gọi callback
  const handleFiles = async (files: FileList) => {
    const file = files[0];
    const currentType = attachmentTypes.find((t) => t.type === type);

    if (!currentType || !file) return;

    // Validate file
    if (currentType.maxSize) {
      const fileErrors = validateFile(file, currentType.maxSize);
      if (fileErrors.length > 0) {
        setErrors(fileErrors);
        return;
      }
    }

    setErrors([]);

    try {
      const base64 = await readFileWithProgress(file);
      
      // ✅ Lưu thông tin file
      const fileInfo = {
        name: file.name,
        size: file.size,
        type: file.type,
      };
      setCurrentFile(fileInfo);
      
      // Cập nhật data (base64)
      onDataChange(base64);

      // ✅ Gọi callback với thông tin đầy đủ
      if (onAttachmentDataChange) {
        onAttachmentDataChange({
          base64,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      }
    } catch (error) {
      setErrors(["Không thể xử lý file"]);
      setCurrentFile(null);
      if (onAttachmentDataChange) {
        onAttachmentDataChange(null);
      }
    }
  };

  // Handle drag events
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
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

  // ✅ 6. Cập nhật handleTypeChange để reset file info
  const handleTypeChange = (newType: "image" | "link" | "file" | null) => {
    if (newType !== type) {
      onDataChange("");
      setErrors([]);
      setUrlErrors([]);
      setCurrentFile(null); // ✅ Reset file info
      if (fileInputRef.current) fileInputRef.current.value = "";
      
      // ✅ Reset callback
      if (onAttachmentDataChange) {
        onAttachmentDataChange(null);
      }
    }
    onTypeChange(newType === type ? null : newType);
    if (newType === "link") {
      setTimeout(() => {
        linkInputRef.current?.focus();
      }, 0);
    }
  };

  // Handle drop zone click
  const handleDropZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // ✅ 7. Hàm để lấy icon file dựa trên extension
  const getFileIcon = (filename: string) => {
    const extension = filename.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return FileText;
      case 'doc':
      case 'docx':
        return FileText;
      case 'xls':
      case 'xlsx':
        return FileSpreadsheet;
      case 'zip':
      case 'rar':
      case '7z':
        return Archive;
      case 'js':
      case 'ts':
      case 'html':
      case 'css':
        return Code;
      case 'mp4':
      case 'avi':
      case 'mov':
        return Video;
      case 'mp3':
      case 'wav':
      case 'flac':
        return Music;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return Image;
      default:
        return FileText;
    }
  };

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
          <Upload className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Đính kèm nội dung
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>

        {/* Clear button */}
        <AnimatePresence>
          {type && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                onTypeChange(null);
                onDataChange("");
                setErrors([]);
                setUrlErrors([]);
                setCurrentFile(null); // ✅ Reset file info
                if (fileInputRef.current) fileInputRef.current.value = "";
                
                // ✅ Reset callback
                if (onAttachmentDataChange) {
                  onAttachmentDataChange(null);
                }
              }}
              className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Enhanced Error messages */}
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
                  {type === "link" ? "🔗 Lỗi liên kết:" : "📎 Lỗi đính kèm:"}
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
                
                {/* Helpful tips for common errors */}
                {type === "link" && urlErrors.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                    className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md"
                  >
                    <h5 className="text-blue-800 font-medium text-xs mb-2">💡 Gợi ý khắc phục:</h5>
                    <ul className="text-blue-700 text-xs space-y-1">
                      <li>• Đảm bảo URL bắt đầu bằng https:// (ví dụ: https://google.com)</li>
                      <li>• Kiểm tra chính tả domain (ví dụ: google.com chứ không phải gogle.com)</li>
                      <li>• Thử truy cập URL trên trình duyệt để đảm bảo hoạt động</li>
                      <li>• Không sử dụng URL nội bộ như localhost hoặc IP private</li>
                    </ul>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Required indicator when no type selected */}
      <AnimatePresence>
        {required && !type && (
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
                <span className="font-medium">Bắt buộc chọn đính kèm!</span>
                <span className="ml-2">Vui lòng chọn một trong ba loại bên dưới.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Type selector */}
      <div className="grid grid-cols-3 gap-3">
        {attachmentTypes.map((item, index) => {
          const Icon = item.icon;
          const isSelected = type === item.type;
          const hasError = type === item.type && (errors.length > 0 || urlErrors.length > 0);

          return (
            <motion.button
              key={item.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => {
                if (item.type === "image" || item.type === "file") {
                  handleTypeChange(item.type);
                  setTimeout(() => {
                    if (fileInputRef.current) fileInputRef.current.click();
                  }, 0);
                } else {
                  handleTypeChange(item.type);
                }
              }}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center relative ${
                isSelected
                  ? hasError
                    ? "border-red-300 bg-red-50"
                    : `${item.borderColor} ${item.bgColor}`
                  : required && !type
                    ? "border-orange-200 bg-orange-50 hover:border-orange-300"
                    : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
              {/* Error indicator */}
              <AnimatePresence>
                {hasError && (
                  <motion.div
                    initial={{ scale: 0, rotate: -90 }}
                    animate={{ scale: 1, rotate: 0 }}
                    exit={{ scale: 0, rotate: 90 }}
                    className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                  >
                    <AlertCircle className="h-3 w-3 text-white" />
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Required indicator */}
              <AnimatePresence>
                {required && !type && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ 
                      scale: [1, 1.2, 1],
                      opacity: [0.7, 1, 0.7]
                    }}
                    transition={{
                      duration: 1.5,
                      repeat: Infinity,
                      ease: "easeInOut"
                    }}
                    className="absolute -top-1 -right-1 w-4 h-4 bg-orange-500 rounded-full flex items-center justify-center"
                  >
                    <span className="text-white text-xs font-bold">!</span>
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div
                animate={{ 
                  rotate: isSelected && !hasError ? 360 : 0,
                  scale: hasError ? [1, 1.1, 1] : 1
                }}
                transition={{ 
                  duration: hasError ? 0.5 : 0.3,
                  repeat: hasError ? Infinity : 0
                }}
              >
                <Icon
                  className={`h-5 w-5 mx-auto mb-2 ${
                    isSelected 
                      ? hasError 
                        ? "text-red-500" 
                        : item.color 
                      : required && !type
                        ? "text-orange-400"
                        : "text-gray-400"
                  }`}
                />
              </motion.div>
              <div
                className={`text-xs font-medium ${
                  isSelected 
                    ? hasError 
                      ? "text-red-600" 
                      : item.color 
                    : required && !type
                      ? "text-orange-600"
                      : "text-gray-600"
                }`}
              >
                {item.label}
              </div>
              <div className={`text-xs mt-1 ${
                required && !type ? "text-orange-500" : "text-gray-500"
              }`}>
                {item.description}
              </div>
              <AnimatePresence>
                {isSelected && !hasError && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                  >
                    <CheckCircle2
                      className={`h-4 w-4 mx-auto mt-2 ${item.color}`}
                    />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          );
        })}
      </div>

      {/* Content area */}
      <AnimatePresence>
        {type && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-3 overflow-hidden"
          >
            {type === "link" ? (
              <motion.div
                initial={{ x: -20 }}
                animate={{ x: 0 }}
                className="space-y-2"
              >
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <ExternalLink className={`h-4 w-4 ${urlErrors.length > 0 ? 'text-red-400' : 'text-gray-400'}`} />
                  </div>
                  <input
                    ref={linkInputRef}
                    value={data}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    onBlur={() => data && validateUrlExists(data)}
                    placeholder="https://example.com"
                    className={`w-full h-12 pl-10 pr-20 border-2 rounded-lg transition-all duration-200 ${
                      urlErrors.length > 0
                        ? "border-red-300 focus:ring-2 focus:ring-red-500 focus:border-red-500 bg-red-50"
                        : data && urlErrors.length === 0
                          ? "border-green-300 focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-green-50"
                          : "border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    }`}
                  />
                  
                  {/* Enhanced validation indicator */}
                  <div className="absolute inset-y-0 right-10 flex items-center">
                    <AnimatePresence mode="wait">
                      {isValidatingUrl ? (
                        <motion.div
                          key="loading"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1, rotate: 360 }}
                          exit={{ scale: 0 }}
                          transition={{
                            rotate: { duration: 1, repeat: Infinity, ease: "linear" }
                          }}
                          className="w-4 h-4 border-2 border-blue-200 border-t-blue-500 rounded-full"
                        />
                      ) : data && urlErrors.length === 0 && validateURL(data).isValid ? (
                        <motion.div
                          key="success"
                          initial={{ scale: 0, rotate: -90 }}
                          animate={{ scale: 1, rotate: 0 }}
                          exit={{ scale: 0, rotate: 90 }}
                        >
                          <CheckCircle2 className="h-4 w-4 text-green-500" />
                        </motion.div>
                      ) : urlErrors.length > 0 ? (
                        <motion.div
                          key="error"
                          initial={{ scale: 0 }}
                          animate={{ 
                            scale: 1,
                            rotate: [0, -10, 10, 0]
                          }}
                          exit={{ scale: 0 }}
                          transition={{
                            rotate: { duration: 0.5, repeat: Infinity }
                          }}
                        >
                          <AlertCircle className="h-4 w-4 text-red-500" />
                        </motion.div>
                      ) : null}
                    </AnimatePresence>
                  </div>

                  {/* Copy button */}
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => data && copyToClipboard(data)}
                    disabled={!data || urlErrors.length > 0}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center disabled:opacity-50"
                  >
                    <AnimatePresence mode="wait">
                      {copiedText === data ? (
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
                          <Copy className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </div>

                {/* URL preview when valid */}
                <AnimatePresence>
                  {data && urlErrors.length === 0 && validateURL(data).isValid && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="bg-blue-50 border border-blue-200 rounded-lg p-3"
                    >
                      <div className="flex items-center gap-2 text-blue-700">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium">URL hợp lệ:</p>
                          <p className="text-xs truncate">{data}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              // File upload area with enhanced file info display
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 cursor-pointer ${
                  isDragging
                    ? "border-blue-400 bg-blue-50 scale-102"
                    : errors.length > 0
                      ? "border-red-300 bg-red-50"
                      : "border-gray-300 hover:border-gray-400 bg-gray-50"
                }`}
                onDragEnter={handleDragEnter}
                onDragOver={(e) => e.preventDefault()}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div
                  className="absolute inset-0 cursor-pointer"
                  onClick={handleDropZoneClick}
                  style={{
                    pointerEvents: isProcessing || data ? "none" : "auto",
                  }}
                />

                <input
                  ref={fileInputRef}
                  type="file"
                  accept={attachmentTypes.find((t) => t.type === type)?.accept}
                  onChange={(e) =>
                    e.target.files && handleFiles(e.target.files)
                  }
                  className="hidden"
                />

                {/* Processing progress */}
                <AnimatePresence>
                  {isProcessing && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-white/90 rounded-lg flex items-center justify-center z-10"
                    >
                      <div className="text-center">
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-3"
                        />
                        <p className="text-sm font-medium text-gray-700">
                          Đang xử lý...
                        </p>
                        <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${processingProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {Math.round(processingProgress)}%
                        </p>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Content display */}
                <AnimatePresence>
                  {data ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="space-y-3"
                    >
                      {type === "image" && (
                        <div
                          className="relative group cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          <motion.img
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={data}
                            alt="Preview"
                            className="w-full max-h-48 object-cover rounded-lg border-2 border-green-200"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (data?.startsWith("data:image/")) {
                                const arr = data.split(",");
                                if (arr.length === 2) {
                                  const mimeMatch = arr[0].match(/:(.*?);/);
                                  const mime = mimeMatch
                                    ? mimeMatch[1]
                                    : "image/png";
                                  const bstr = atob(arr[1]);
                                  let n = bstr.length;
                                  const u8arr = new Uint8Array(n);
                                  while (n--) {
                                    u8arr[n] = bstr.charCodeAt(n);
                                  }
                                  const blob = new Blob([u8arr], {
                                    type: mime,
                                  });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, "_blank");
                                  setTimeout(
                                    () => URL.revokeObjectURL(url),
                                    10000
                                  );
                                }
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded text-gray-700 hover:bg-white transition-colors z-10"
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                          <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg z-0" />
                          
                          {/* ✅ 8. Hiển thị thông tin file cho image */}
                          {currentFile && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className="absolute bottom-2 left-2 right-2 bg-black/70 text-white text-xs p-2 rounded backdrop-blur-sm"
                            >
                              <p className="font-medium truncate">{currentFile.name}</p>
                              <p className="text-gray-300">{formatFileSize(currentFile.size)}</p>
                            </motion.div>
                          )}
                        </div>
                      )}

                      {type === "file" && (
                        <motion.div
                          initial={{ x: -20 }}
                          animate={{ x: 0 }}
                          className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-purple-200 cursor-pointer"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {/* ✅ 9. Sử dụng icon phù hợp với loại file */}
                          <div className="p-3 bg-purple-100 rounded-lg">
                            {currentFile ? (
                              (() => {
                                const FileIcon = getFileIcon(currentFile.name);
                                return <FileIcon className="h-6 w-6 text-purple-600" />;
                              })()
                            ) : (
                              <FileText className="h-6 w-6 text-purple-600" />
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            {/* ✅ 10. Hiển thị tên file thật */}
                            {currentFile ? (
                              <>
                                <p className="font-medium text-sm text-gray-800 truncate">
                                  {currentFile.name}
                                </p>
                                <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                  <span>{formatFileSize(currentFile.size)}</span>
                                  <span>•</span>
                                  <span>{currentFile.type || 'Unknown type'}</span>
                                </div>
                              </>
                            ) : (
                              <>
                                <p className="font-medium text-sm text-gray-800">
                                  Tệp đã tải lên
                                </p>
                                <p className="text-xs text-gray-500">
                                  Nhấn để thay thế
                                </p>
                              </>
                            )}
                          </div>
                          
                          <div className="flex-shrink-0">
                            <CheckCircle2 className="h-5 w-5 text-green-500" />
                          </div>
                        </motion.div>
                      )}

                      {/* Action buttons */}
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex gap-2 pt-2"
                      >
                        <motion.button
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            fileInputRef.current?.click();
                          }}
                          className="flex-1 py-2 px-3 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors flex items-center justify-center gap-2"
                        >
                          <Upload className="h-4 w-4" />
                          Thay thế
                        </motion.button>

                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDataChange("");
                            setCurrentFile(null); // ✅ Reset file info
                            if (fileInputRef.current)
                              fileInputRef.current.value = "";
                            
                            // ✅ Reset callback
                            if (onAttachmentDataChange) {
                              onAttachmentDataChange(null);
                            }
                          }}
                          className="py-2 px-3 bg-red-500 text-white rounded text-sm font-medium hover:bg-red-600 transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </motion.button>
                      </motion.div>
                    </motion.div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center"
                    >
                      <motion.div
                        animate={{
                          y: isDragging ? -5 : errors.length > 0 ? [0, -2, 0] : 0,
                          scale: isDragging ? 1.1 : 1,
                        }}
                        transition={{ 
                          duration: errors.length > 0 ? 0.5 : 0.2,
                          repeat: errors.length > 0 ? Infinity : 0
                        }}
                      >
                        <Upload className={`h-10 w-10 mx-auto mb-3 ${
                          errors.length > 0 ? 'text-red-400' : 'text-gray-400'
                        }`} />
                      </motion.div>
                      <h4 className={`text-sm font-medium mb-1 ${
                        errors.length > 0 ? 'text-red-700' : 'text-gray-800'
                      }`}>
                        {isDragging
                          ? "Thả tệp vào đây!"
                          : errors.length > 0
                            ? "Có lỗi xảy ra, vui lòng thử lại"
                            : "Kéo thả hoặc nhấn để tải lên"}
                      </h4>
                      <p className={`text-xs ${
                        errors.length > 0 ? 'text-red-500' : 'text-gray-500'
                      }`}>
                        {type === "image"
                          ? "PNG, JPG, GIF tối đa 10MB"
                          : "Mọi loại tệp tối đa 20MB"}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default ModernAttachmentSelector;