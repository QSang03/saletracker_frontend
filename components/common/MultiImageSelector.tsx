import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus,
  Upload,
  Trash2,
  Eye,
  X,
  AlertCircle,
  CheckCircle2,
  Image,
  Plus,
} from "lucide-react";

interface ImageData {
  base64: string;
  filename?: string;
  size?: number;
  type?: string;
}

interface MultiImageSelectorProps {
  images: ImageData[];
  onImagesChange: (images: ImageData[]) => void;
  required?: boolean;
  onValidationChange?: (error: string | null) => void;
  maxImages?: number;
}

const MultiImageSelector = ({
  images,
  onImagesChange,
  required = false,
  onValidationChange,
  maxImages = 5,
}: MultiImageSelectorProps) => {
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
    const maxSizeMB = 10; // 10MB per image
    
    if (file.size > maxSizeMB * 1024 * 1024) {
      errors.push(`Tệp quá lớn. Tối đa ${maxSizeMB}MB`);
    }
    
    if (!file.type.startsWith('image/')) {
      errors.push('Chỉ chấp nhận file hình ảnh');
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
    const remainingSlots = maxImages - images.length;
    
    if (fileArray.length > remainingSlots) {
      setErrors([`Chỉ có thể thêm tối đa ${remainingSlots} ảnh nữa`]);
      return;
    }

    setErrors([]);

    try {
      const newImages: ImageData[] = [];
      
      for (const file of fileArray) {
        // Validate file
        const fileErrors = validateFile(file);
        if (fileErrors.length > 0) {
          setErrors(prev => [...prev, `${file.name}: ${fileErrors.join(', ')}`]);
          continue;
        }

        const base64 = await readFileWithProgress(file);
        newImages.push({
          base64,
          filename: file.name,
          size: file.size,
          type: file.type,
        });
      }

      if (newImages.length > 0) {
        onImagesChange([...images, ...newImages]);
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

  // Remove image
  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    onImagesChange(newImages);
  };

  // Handle drop zone click
  const handleDropZoneClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isProcessing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Open image in new tab
  const openImage = (base64: string) => {
    if (base64?.startsWith("data:image/")) {
      const arr = base64.split(",");
      if (arr.length === 2) {
        const mimeMatch = arr[0].match(/:(.*?);/);
        const mime = mimeMatch ? mimeMatch[1] : "image/png";
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10000);
      }
    }
  };

  // Validation effect
  useEffect(() => {
    if (onValidationChange) {
      if (required && images.length === 0) {
        onValidationChange("Bắt buộc chọn ít nhất 1 ảnh");
      } else if (images.length > maxImages) {
        onValidationChange(`Tối đa ${maxImages} ảnh`);
      } else {
        onValidationChange(null);
      }
    }
  }, [images, required, maxImages, onValidationChange]);

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
          <ImagePlus className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">
            Hình ảnh ({images.length}/{maxImages})
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
                  📷 Lỗi hình ảnh:
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

      {/* Required indicator when no images */}
      <AnimatePresence>
        {required && images.length === 0 && (
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
                <span className="font-medium">Bắt buộc chọn ít nhất 1 ảnh!</span>
                <span className="ml-2">Tối đa {maxImages} ảnh.</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Images grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Existing images */}
        {images.map((image, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="relative group"
          >
            <div className="aspect-square rounded-lg overflow-hidden border-2 border-green-200 bg-gray-50">
              <img
                src={image.base64}
                alt={`Image ${index + 1}`}
                className="w-full h-full object-cover"
              />
              
              {/* Overlay with actions */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => openImage(image.base64)}
                  className="p-2 bg-white/90 rounded text-gray-700 hover:bg-white transition-colors"
                >
                  <Eye className="h-4 w-4" />
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  type="button"
                  onClick={() => removeImage(index)}
                  className="p-2 bg-red-500/90 rounded text-white hover:bg-red-500 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </motion.button>
              </div>
            </div>
            
            {/* Image info */}
            <div className="mt-1 text-xs text-gray-600 truncate">
              {image.filename && (
                <div className="truncate" title={image.filename}>
                  {image.filename}
                </div>
              )}
              {image.size && (
                <div className="text-gray-500">
                  {formatFileSize(image.size)}
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Add more button */}
        {images.length < maxImages && (
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
            <div className="aspect-square flex flex-col items-center justify-center p-4">
              <motion.div
                animate={{
                  y: isDragging ? -5 : 0,
                  scale: isDragging ? 1.1 : 1,
                }}
                transition={{ duration: 0.2 }}
              >
                <Plus className="h-8 w-8 text-gray-400 mb-2" />
              </motion.div>
              <p className="text-xs text-gray-600 text-center">
                {isDragging ? "Thả ảnh vào đây!" : "Thêm ảnh"}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, GIF
              </p>
            </div>
          </motion.div>
        )}
      </div>

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
                Đang xử lý ảnh...
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
        accept="image/*"
        multiple
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
        className="hidden"
      />
    </motion.div>
  );
};

export default MultiImageSelector;
