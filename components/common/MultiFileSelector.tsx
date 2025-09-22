import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Paperclip,
  Upload,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  FileText,
  Video,
  Music,
  FileSpreadsheet,
  Archive,
  Code,
  Image,
  Download,
} from "lucide-react";

interface FileData {
  base64: string;
  filename: string;
  size?: number;
  type?: string;
}

interface MultiFileSelectorProps {
  files: FileData[];
  onFilesChange: (files: FileData[]) => void;
  required?: boolean;
  onValidationChange?: (error: string | null) => void;
  maxFiles?: number;
}

const MultiFileSelector = ({
  files,
  onFilesChange,
  required = false,
  onValidationChange,
  maxFiles = 5,
}: MultiFileSelectorProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [errors, setErrors] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Validate file
  const validateFile = (file: File) => {
    const errors = [];
    const maxSizeMB = 20; // 20MB per file
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`Tệp quá lớn. Tối đa ${maxSizeMB}MB`);
    }
    
    // ✅ Giới hạn chỉ cho Word, Excel, PDF
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
      'application/msword', // .doc
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel', // .xls
    ];
    
    const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      errors.push('Chỉ chấp nhận file Word (.doc, .docx), Excel (.xls, .xlsx), PDF (.pdf)');
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
        reject(new Error("Không thể đọc file"));
      };

      reader.readAsDataURL(file);
    });
  };

  // Handle files
  const handleFiles = async (fileList: FileList) => {
    const fileArray = Array.from(fileList);
    const remainingSlots = maxFiles - files.length;
    
    if (fileArray.length > remainingSlots) {
      setErrors([`Chỉ có thể thêm tối đa ${remainingSlots} tệp nữa`]);
      return;
    }

    setErrors([]);

    try {
      const newFiles: FileData[] = [];
      
      for (const file of fileArray) {
        // Validate file
        const fileErrors = validateFile(file);
        if (fileErrors.length > 0) {
          setErrors(prev => [...prev, `${file.name}: ${fileErrors.join(', ')}`]);
          continue;
        }

        const base64 = await readFileWithProgress(file);
        newFiles.push({
          base64,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      }

      if (newFiles.length > 0) {
        onFilesChange([...files, ...newFiles]);
        // Reset file input to prevent duplicate selections
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error) {
      setErrors(["Không thể xử lý file"]);
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

  // Remove file
  const removeFile = (index: number) => {
    const newFiles = files.filter((_, i) => i !== index);
    onFilesChange(newFiles);
  };

  // Handle drop zone click
  const handleDropZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Download file
  const downloadFile = (file: FileData) => {
    if (file.base64?.startsWith("data:")) {
      const arr = file.base64.split(",");
      if (arr.length === 2) {
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "application/octet-stream";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = file.filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    }
  };

  // Get file icon based on extension
  const getFileIcon = (filename: string) => {
    if (!filename) return FileText;
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

  // Validation effect
  useEffect(() => {
    if (onValidationChange) {
      if (required && files.length === 0) {
        onValidationChange("Bắt buộc chọn ít nhất 1 tệp");
      } else if (files.length > maxFiles) {
        onValidationChange(`Tối đa ${maxFiles} tệp`);
      } else {
        onValidationChange(null);
      }
    }
  }, [files, required, maxFiles, onValidationChange]);

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
          <Paperclip className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Tệp tin ({files.length}/{maxFiles})
            {required && <span className="text-red-500 ml-1">*</span>}
          </span>
        </div>
      </div>

      {/* Error messages */}
      <AnimatePresence>
        {errors.length > 0 && (
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
                  📎 Lỗi tệp tin:
                </h4>
                <div className="space-y-1">
                  {errors.map((error, index) => (
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

      {/* Required indicator when no files */}
      <AnimatePresence>
        {required && files.length === 0 && (
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
                <span className="font-medium">Bắt buộc chọn ít nhất 1 tệp!</span>
                <span className="ml-2">Tối đa {maxFiles} tệp.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Files list */}
      <div className="space-y-2">
        {files.map((file, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="flex items-center gap-3 p-3 bg-white rounded-lg border-2 border-purple-200 hover:border-purple-300 transition-colors"
          >
            {/* File icon */}
            <div className="p-2 bg-purple-100 rounded-lg">
              {(() => {
                const FileIcon = getFileIcon(file.filename);
                return <FileIcon className="h-5 w-5 text-purple-600" />;
              })()}
            </div>
            
            {/* File info */}
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm text-gray-800 truncate">
                {file.filename}
              </p>
              <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                {file.size && <span>{formatFileSize(file.size)}</span>}
                {file.type && (
                  <>
                    <span>•</span>
                    <span>{file.type}</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => downloadFile(file)}
                className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                title="Tải xuống"
              >
                <Download className="h-4 w-4" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                type="button"
                onClick={() => removeFile(index)}
                className="p-1.5 text-red-400 hover:text-red-600 transition-colors"
                title="Xóa"
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add more button */}
      {files.length < maxFiles && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className={`relative border-2 border-dashed rounded-lg transition-all duration-300 cursor-pointer ${
            isDragging
              ? "border-blue-400 bg-blue-50 scale-105"
              : "border-gray-300 hover:border-gray-400 bg-gray-50"
          }`}
          onDragEnter={handleDragEnter}
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleDropZoneClick}
        >
          <div className="p-6 flex flex-col items-center justify-center">
            <motion.div
              animate={{
                y: isDragging ? -5 : 0,
                scale: isDragging ? 1.1 : 1,
              }}
              transition={{ duration: 0.2 }}
            >
              <Upload className="h-8 w-8 text-gray-400 mb-2" />
            </motion.div>
            <p className="text-sm text-gray-600 text-center">
              {isDragging ? "Thả tệp vào đây!" : "Thêm tệp"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Mọi loại tệp tối đa 20MB
            </p>
          </div>
        </motion.div>
      )}

      {/* Processing overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          >
            <div className="bg-white rounded-lg p-6 text-center">
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
                Đang xử lý tệp...
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

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </motion.div>
  );
};

export default MultiFileSelector;
