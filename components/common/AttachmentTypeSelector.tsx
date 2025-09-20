import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus,
  LinkIcon,
  Paperclip,
  X,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

interface AttachmentTypeSelectorProps {
  type: "image" | "link" | "file" | null;
  onTypeChange: (type: "image" | "link" | "file" | null) => void;
  required?: boolean;
}

const AttachmentTypeSelector = ({
  type,
  onTypeChange,
  required = false,
}: AttachmentTypeSelectorProps) => {
  const attachmentTypes = [
    {
      type: "image" as const,
      icon: ImagePlus,
      label: "Hình ảnh",
      description: "JPG, PNG, GIF",
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
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
    },
  ];

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
              onClick={() => onTypeChange(null)}
              className="p-1 rounded text-red-600 hover:bg-red-50 transition-colors"
            >
              <X className="h-4 w-4" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

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

          return (
            <motion.button
              key={item.type}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              type="button"
              onClick={() => onTypeChange(item.type)}
              className={`p-3 rounded-lg border-2 transition-all duration-200 text-center relative ${
                isSelected
                  ? `${item.borderColor} ${item.bgColor}`
                  : required && !type
                    ? "border-orange-200 bg-orange-50 hover:border-orange-300"
                    : "border-gray-200 hover:border-gray-300 bg-white"
              }`}
            >
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
                  rotate: isSelected ? 360 : 0,
                }}
                transition={{ 
                  duration: 0.3,
                }}
              >
                <Icon
                  className={`h-5 w-5 mx-auto mb-2 ${
                    isSelected 
                      ? item.color 
                      : required && !type
                        ? "text-orange-400"
                        : "text-gray-400"
                  }`}
                />
              </motion.div>
              <div
                className={`text-xs font-medium ${
                  isSelected 
                    ? item.color 
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
                {isSelected && (
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
    </motion.div>
  );
};

export default AttachmentTypeSelector;
