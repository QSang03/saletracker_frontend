import { motion, AnimatePresence } from "framer-motion";
import { Check, AlertCircle, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  labels: string[];
  errors?: Record<number, boolean>; // ✅ Thêm prop errors
  visitedSteps?: Set<number>; // ✅ Track các step đã từng truy cập
  showFutureErrors?: boolean; // ✅ Có hiển thị lỗi cho step tương lai không (default: false)
}

const StepIndicator = ({
  currentStep,
  totalSteps,
  labels,
  errors = {},
  visitedSteps = new Set(),
  showFutureErrors = false,
}: StepIndicatorProps) => {
  
  // ✅ Filter errors để chỉ hiển thị lỗi phù hợp
  const getFilteredErrors = () => {
    const filteredErrors: Record<number, boolean> = {};
    
    Object.entries(errors).forEach(([stepStr, hasError]) => {
      const stepNumber = parseInt(stepStr);
      
      // Luôn hiển thị lỗi cho step hiện tại
      const isCurrentStep = stepNumber === currentStep;
      
      // Hiển thị lỗi cho các step đã từng truy cập  
      const isVisitedStep = visitedSteps.has(stepNumber);
      
      // Hiển thị lỗi cho step tương lai nếu được bật
      const shouldShowFutureError = showFutureErrors && stepNumber > currentStep;
      
      if (isCurrentStep || isVisitedStep || shouldShowFutureError) {
        filteredErrors[stepNumber] = hasError;
      }
    });
    
    return filteredErrors;
  };
  
  const filteredErrors = getFilteredErrors();
  return (
    <motion.div
      className="relative mb-4"
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="absolute inset-0 flex items-center">
        <div className="w-full h-1 bg-gray-200 rounded-full">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors duration-300",
              // ✅ Sử dụng filteredErrors thay vì errors
              Object.values(filteredErrors).some(hasError => hasError)
                ? "bg-red-400"
                : "bg-blue-500"
            )}
            initial={{ width: 0 }}
            animate={{ width: `${(currentStep / totalSteps) * 100}%` }}
            transition={{ duration: 0.5, ease: "easeInOut" }}
          />
        </div>
      </div>

      <div className="relative flex justify-between">
        {labels.map((label, index) => {
          const stepNumber = index + 1;
          const isActive = index < currentStep;
          const isCurrent = index === currentStep - 1;
          const hasError = errors[stepNumber] || false; // ✅ Kiểm tra lỗi cho step này
          
          return (
            <motion.div
              key={index}
              className="flex flex-col items-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.1 }}
            >
              <motion.div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all duration-300 relative",
                  // ✅ Logic màu sắc dựa trên trạng thái và lỗi
                  hasError && isCurrent && "bg-red-500 text-white border-2 border-red-300",
                  hasError && isActive && !isCurrent && "bg-red-400 text-white",
                  hasError && !isActive && "bg-red-100 text-red-600 border-2 border-red-300",
                  !hasError && isActive && !isCurrent && "bg-blue-500 text-white",
                  !hasError && isCurrent && "bg-blue-600 text-white",
                  !hasError && !isActive && "bg-gray-200 text-gray-500"
                )}
                whileHover={{ scale: 1.1 }}
                animate={
                  isCurrent
                    ? hasError
                      ? {
                          // ✅ Animation khác cho trạng thái lỗi
                          boxShadow: [
                            "0 0 0 0 rgba(239, 68, 68, 0.7)",
                            "0 0 0 10px rgba(239, 68, 68, 0)",
                            "0 0 0 0 rgba(239, 68, 68, 0)",
                          ],
                          scale: [1, 1.05, 1],
                        }
                      : {
                          boxShadow: [
                            "0 0 0 0 rgba(59, 130, 246, 0.7)",
                            "0 0 0 10px rgba(59, 130, 246, 0)",
                            "0 0 0 0 rgba(59, 130, 246, 0)",
                          ],
                        }
                    : hasError
                      ? {
                          // ✅ Subtle shake animation cho steps có lỗi
                          x: [0, -1, 1, 0],
                          scale: [1, 1.02, 1],
                        }
                      : {}
                }
                transition={
                  isCurrent
                    ? {
                        duration: hasError ? 1.5 : 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }
                    : hasError
                      ? {
                          duration: 2,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }
                      : {}
                }
              >
                {/* ✅ Error indicator badge */}
                <AnimatePresence>
                  {hasError && (
                    <motion.div
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                      className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center z-10"
                    >
                      <AlertCircle className="w-2.5 h-2.5 text-white" />
                    </motion.div>
                  )}
                </AnimatePresence>

                <AnimatePresence mode="wait">
                  {isActive && !isCurrent && !hasError ? (
                    <motion.div
                      key="check"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                    >
                      <Check className="w-4 h-4" />
                    </motion.div>
                  ) : hasError && (isActive || isCurrent) ? (
                    // ✅ Hiển thị X cho steps có lỗi
                    <motion.div
                      key="error"
                      initial={{ scale: 0, rotate: -90 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0, rotate: 90 }}
                    >
                      <X className="w-4 h-4" />
                    </motion.div>
                  ) : (
                    <motion.span
                      key="number"
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                    >
                      {stepNumber}
                    </motion.span>
                  )}
                </AnimatePresence>
              </motion.div>
              
              <motion.span
                className={cn(
                  "text-xs mt-1 text-center font-medium transition-colors duration-200",
                  // ✅ Màu text dựa trên trạng thái và lỗi
                  hasError && (isActive || isCurrent) && "text-red-600",
                  hasError && !isActive && !isCurrent && "text-red-500",
                  !hasError && isActive && "text-gray-900",
                  !hasError && !isActive && "text-gray-500"
                )}
                animate={{
                  color: hasError 
                    ? (isActive || isCurrent) 
                      ? "#dc2626" 
                      : "#ef4444"
                    : isActive 
                      ? "#111827" 
                      : "#6b7280",
                  fontWeight: isCurrent ? 600 : 500,
                }}
              >
                {label}
                {/* ✅ Error indicator text */}
                {hasError && (
                  <motion.span
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="block text-xs text-red-500 mt-0.5"
                  >
                    Có lỗi
                  </motion.span>
                )}
              </motion.span>
            </motion.div>
          );
        })}
      </div>

      {/* ✅ Error summary - chỉ hiển thị lỗi được filter */}
      <AnimatePresence>
        {Object.values(filteredErrors).some(hasError => hasError) && (
          <motion.div
            initial={{ opacity: 0, y: 10, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -10, height: 0 }}
            className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg overflow-hidden"
          >
            <div className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: [0, -5, 5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
              </motion.div>
              <div className="text-xs text-red-700">
                <span className="font-medium">Cần hoàn thành: </span>
                <span>
                  {Object.entries(filteredErrors)
                    .filter(([_, hasError]) => hasError)
                    .map(([step, _]) => labels[parseInt(step) - 1])
                    .join(", ")}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default StepIndicator;