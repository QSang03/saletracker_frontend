import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ImagePlus, LinkIcon, Paperclip, Upload, ExternalLink, FileText, 
  Trash2, Eye, Copy, Check, X, AlertCircle, CheckCircle2,
  Image, Video, Music, FileSpreadsheet, Archive, Code
} from 'lucide-react';

interface ModernAttachmentSelectorProps {
  type: "image" | "link" | "file" | null;
  onTypeChange: (type: "image" | "link" | "file" | null) => void;
  data: string;
  onDataChange: (data: string) => void;
}

const ModernAttachmentSelector = ({
  type,
  onTypeChange,
  data,
  onDataChange
}: ModernAttachmentSelectorProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      maxSize: 10
    },
    { 
      type: "link" as const, 
      icon: LinkIcon, 
      label: "Liên kết",
      description: "URL, Website",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200"
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
      maxSize: 20
    }
  ];

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Validate file
  const validateFile = (file: File, maxSizeMB: number) => {
    const errors = [];
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`Tệp quá lớn. Tối đa ${maxSizeMB}MB`);
    }
    return errors;
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
        reject(new Error('Không thể đọc file'));
      };
      
      reader.readAsDataURL(file);
    });
  };

  // Handle file upload
  const handleFiles = async (files: FileList) => {
    const file = files[0];
    const currentType = attachmentTypes.find(t => t.type === type);
    
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
      onDataChange(base64);
    } catch (error) {
      setErrors(['Không thể xử lý file']);
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
      console.error('Failed to copy:', err);
    }
  };

  // Handle type change
  const handleTypeChange = (newType: "image" | "link" | "file" | null) => {
    if (newType !== type) {
      onDataChange("");
      setErrors([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
    onTypeChange(newType === type ? null : newType);
  };

  // Handle drop zone click
  const handleDropZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
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
          <span className="text-sm font-medium text-gray-700">Đính kèm nội dung</span>
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
                if (fileInputRef.current) fileInputRef.current.value = "";
              }}
              className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Error messages */}
      <AnimatePresence>
        {errors.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-red-50 border-l-4 border-red-400 p-3 rounded overflow-hidden"
          >
            <div className="flex">
              <AlertCircle className="h-4 w-4 text-red-400 mr-2 mt-0.5" />
              <div>
                <h4 className="text-red-800 font-medium text-sm">Có lỗi xảy ra:</h4>
                <ul className="text-red-700 text-sm mt-1">
                  {errors.map((error, index) => (
                    <li key={index}>• {error}</li>
                  ))}
                </ul>
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
          
          return (
            <motion.button
              key={item.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => handleTypeChange(item.type)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center ${
                isSelected 
                  ? `${item.borderColor} ${item.bgColor}` 
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <motion.div
                animate={{ rotate: isSelected ? 360 : 0 }}
                transition={{ duration: 0.3 }}
              >
                <Icon className={`h-5 w-5 mx-auto mb-2 ${isSelected ? item.color : 'text-gray-400'}`} />
              </motion.div>
              <div className={`text-xs font-medium ${isSelected ? item.color : 'text-gray-600'}`}>
                {item.label}
              </div>
              <div className="text-xs text-gray-500 mt-1">{item.description}</div>
              <AnimatePresence>
                {isSelected && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0 }}
                  >
                    <CheckCircle2 className={`h-4 w-4 mx-auto mt-2 ${item.color}`} />
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
            animate={{ opacity: 1, height: 'auto' }}
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
                    <ExternalLink className="h-4 w-4 text-gray-400" />
                  </div>
                  <input
                    value={data}
                    onChange={(e) => onDataChange(e.target.value)}
                    placeholder="https://example.com"
                    className="w-full h-10 pl-10 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                  />
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    type="button"
                    onClick={() => data && copyToClipboard(data)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
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
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.95 }}
                animate={{ scale: 1 }}
                className={`relative border-2 border-dashed rounded-lg p-6 transition-all duration-300 cursor-pointer ${
                  isDragging 
                    ? "border-blue-400 bg-blue-50" 
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
                  style={{ pointerEvents: (isProcessing || data) ? 'none' : 'auto' }}
                />
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={attachmentTypes.find(t => t.type === type)?.accept}
                  onChange={(e) => e.target.files && handleFiles(e.target.files)}
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
                          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 border-4 border-blue-200 border-t-blue-500 rounded-full mx-auto mb-3"
                        />
                        <p className="text-sm font-medium text-gray-700">Đang xử lý...</p>
                        <div className="w-32 h-1.5 bg-gray-200 rounded-full mt-2 overflow-hidden">
                          <motion.div
                            className="h-full bg-blue-500 rounded-full"
                            initial={{ width: 0 }}
                            animate={{ width: `${processingProgress}%` }}
                            transition={{ duration: 0.1 }}
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">{Math.round(processingProgress)}%</p>
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
                        <div className="relative">
                          <motion.img
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            src={data}
                            alt="Preview"
                            className="w-full max-h-48 object-cover rounded-lg"
                          />
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (data?.startsWith('data:image/')) {
                                const arr = data.split(',');
                                if (arr.length === 2) {
                                  const mimeMatch = arr[0].match(/:(.*?);/);
                                  const mime = mimeMatch ? mimeMatch[1] : 'image/png';
                                  const bstr = atob(arr[1]);
                                  let n = bstr.length;
                                  const u8arr = new Uint8Array(n);
                                  while (n--) {
                                    u8arr[n] = bstr.charCodeAt(n);
                                  }
                                  const blob = new Blob([u8arr], { type: mime });
                                  const url = URL.createObjectURL(blob);
                                  window.open(url, '_blank');
                                  setTimeout(() => URL.revokeObjectURL(url), 10000);
                                }
                              }
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded text-gray-700 hover:bg-white transition-colors"
                          >
                            <Eye className="h-4 w-4" />
                          </motion.button>
                        </div>
                      )}
                      
                      {type === "file" && (
                        <motion.div 
                          initial={{ x: -20 }}
                          animate={{ x: 0 }}
                          className="flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-200"
                        >
                          <div className="p-2 bg-gray-100 rounded">
                            <FileText className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-sm text-gray-800">Tệp đã tải lên</p>
                            <p className="text-xs text-gray-500">Nhấn để thay thế</p>
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
                          className="flex-1 py-2 px-3 bg-blue-500 text-white rounded text-sm font-medium hover:bg-blue-600 transition-colors"
                        >
                          <Upload className="h-4 w-4 mr-1 inline" />
                          Thay thế
                        </motion.button>
                        
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDataChange("");
                            if (fileInputRef.current) fileInputRef.current.value = "";
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
                          y: isDragging ? -5 : 0,
                          scale: isDragging ? 1.1 : 1 
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      </motion.div>
                      <h4 className="text-sm font-medium text-gray-800 mb-1">
                        {isDragging ? 'Thả tệp vào đây!' : 'Kéo thả hoặc nhấn để tải lên'}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {type === "image" ? "PNG, JPG, GIF tối đa 10MB" : "Mọi loại tệp tối đa 20MB"}
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
