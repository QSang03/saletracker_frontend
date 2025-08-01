import { Sparkles, AlertCircle } from "lucide-react";
import React, { useState, useRef, useMemo, useEffect } from "react";

interface ValidationResult {
  isValid: boolean;
  invalidMatches: string[];
  invalidChars: string[];
}
const validateBrackets = (
  text: string,
  validPatterns: string[]
): ValidationResult => {
  // ✨ Luôn trả về đầy đủ 3 properties, kể cả khi empty
  if (!text) {
    return {
      isValid: true,
      invalidMatches: [],
      invalidChars: [], // ← Thêm dòng này
    };
  }

  // Step 1: Tìm tất cả các valid patterns trong text
  const validOccurrences: { pattern: string; start: number; end: number }[] =
    [];

  validPatterns.forEach((pattern) => {
    let index = 0;
    while ((index = text.indexOf(pattern, index)) !== -1) {
      validOccurrences.push({
        pattern,
        start: index,
        end: index + pattern.length,
      });
      index += pattern.length;
    }
  });

  // Step 2: Tạo mask để đánh dấu vùng hợp lệ
  const isValidPosition = new Array(text.length).fill(false);

  validOccurrences.forEach(({ start, end }) => {
    for (let i = start; i < end; i++) {
      isValidPosition[i] = true;
    }
  });

  // Step 3: Tìm các patterns có vấn đề
  const invalidPatterns: string[] = [];

  const problematicPatterns = [
    /\{[^}]*\}/g, // {anything} - kiểm tra xem có phải valid pattern không
    /\{[^\}]*\]/g, // {anything] - MALFORMED ❌
    /\[[^\]]*\}/g, // [anything} - MALFORMED ❌
    /\{[^\}]*\)/g, // {anything) - MALFORMED ❌
    /\([^)]*\}/g, // (anything} - MALFORMED ❌
    /["'`]\{[^}]*\}["'`]/g, // quoted patterns - vẫn cảnh báo
    /["'`]\{[^}]*\}/g,
    /\{[^}]*\}["'`]/g,
    /["'`]\{[^}]*\}['"]/g,
    /["'`]\{[^}]*\}`/g,
  ];

  problematicPatterns.forEach((pattern) => {
    const matches = text.match(pattern) || [];
    matches.forEach((match) => {
      const matchIndex = text.indexOf(match);
      let isInValidRegion = true;

      for (let i = matchIndex; i < matchIndex + match.length; i++) {
        if (!isValidPosition[i]) {
          isInValidRegion = false;
          break;
        }
      }

      if (!isInValidRegion) {
        invalidPatterns.push(match);
      }
    });
  });

  // Step 4: Tìm các ký tự đặc biệt bị cấm
  const forbiddenChars = ["{", "}", '"', "'", "`"];
  const invalidChars: string[] = [];
  const invalidPositions: number[] = [];

  text.split("").forEach((char, index) => {
    if (forbiddenChars.includes(char) && !isValidPosition[index]) {
      invalidChars.push(char);
      invalidPositions.push(index);
    }
  });

  // Step 5: Combine invalid matches
  const allInvalidMatches = [...new Set([...invalidPatterns])];

  if (invalidPositions.length > 0) {
    const groups: number[][] = [];
    let currentGroup: number[] = [invalidPositions[0]];

    for (let i = 1; i < invalidPositions.length; i++) {
      if (invalidPositions[i] - invalidPositions[i - 1] <= 5) {
        currentGroup.push(invalidPositions[i]);
      } else {
        groups.push([...currentGroup]);
        currentGroup = [invalidPositions[i]];
      }
    }
    groups.push(currentGroup);

    groups.forEach((group) => {
      const start = Math.max(0, group[0] - 3);
      const end = Math.min(text.length, group[group.length - 1] + 4);
      const snippet = text.substring(start, end);
      allInvalidMatches.push(snippet);
    });
  }

  // ✨ Luôn trả về đầy đủ ValidationResult interface
  return {
    isValid: allInvalidMatches.length === 0 && invalidChars.length === 0,
    invalidMatches: allInvalidMatches,
    invalidChars: [...new Set(invalidChars)],
  };
};

interface InsertButton {
  text: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: string;
  hoverColor: string;
  label: string;
  id: string;
}

interface EnhancedTextareaProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  insertButtons?: InsertButton[];
  placeholder?: string;
  rows?: number;
  className?: string;
  maxLength?: number;
  showInsertButtons?: boolean;
  enableValidation?: boolean;
  fieldName?: string;
  onValidationChange?: (error: string | null) => void;
}

const EnhancedTextarea: React.FC<EnhancedTextareaProps> = ({
  value,
  onChange,
  insertButtons = [],
  placeholder = "Nhập nội dung tin nhắn hấp dẫn của bạn...",
  rows = 4,
  className = "",
  maxLength = 500,
  showInsertButtons = true,
  enableValidation = false,
  fieldName = "Trường này",
  onValidationChange,
}) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Extract valid patterns from insertButtons - memoized properly
  const validPatterns = useMemo(() => {
    return insertButtons.map((button) => button.text);
  }, [insertButtons]);

  // Validation logic với proper memoization để tránh re-computation
  const validationResult = useMemo(() => {
    if (!enableValidation || !value) {
      return { isValid: true, invalidMatches: [], invalidChars: [] };
    }
    return validateBrackets(value, validPatterns);
  }, [value, enableValidation, validPatterns]);

  const hasValidationErrors = !validationResult.isValid;

  // Stable reference cho validation để tránh infinite re-render
  const validationStateRef = useRef<{
    isValid: boolean;
    invalidCharsCount: number;
    invalidMatchesCount: number;
    lastErrorMessage: string | null;
  }>({
    isValid: true,
    invalidCharsCount: 0,
    invalidMatchesCount: 0,
    lastErrorMessage: null,
  });

  useEffect(() => {
    if (!enableValidation || !onValidationChange) return;

    const isValid = validationResult.isValid;
    const invalidCharsCount = validationResult.invalidChars?.length || 0;
    const invalidMatchesCount = validationResult.invalidMatches?.length || 0;

    // Chỉ update khi validation state thực sự thay đổi
    const prevState = validationStateRef.current;
    const hasChanged = 
      prevState.isValid !== isValid ||
      prevState.invalidCharsCount !== invalidCharsCount ||
      prevState.invalidMatchesCount !== invalidMatchesCount;

    if (!hasChanged) return;

    // Update ref state
    validationStateRef.current = {
      isValid,
      invalidCharsCount,
      invalidMatchesCount,
      lastErrorMessage: null, // Will be set below
    };

    if (isValid) {
      validationStateRef.current.lastErrorMessage = null;
      onValidationChange(null);
    } else {
      let errorMessage = `${fieldName} chứa lỗi định dạng:`;

      if (validationResult.invalidChars?.length > 0) {
        errorMessage += `\n• Ký tự bị cấm: ${validationResult.invalidChars.join(", ")}`;
      }

      if (validationResult.invalidMatches?.length > 0) {
        errorMessage += `\n• Vị trí có lỗi: ${validationResult.invalidMatches
          .map((m) => `"${m}"`)
          .join(", ")}`;
      }

      // Use the memoized validPatterns instead of recomputing
      errorMessage += `\n• Được phép: ${validPatterns
        .map((p) => `"${p}"`)
        .join(", ")}`;

      validationStateRef.current.lastErrorMessage = errorMessage;
      onValidationChange(errorMessage);
    }
  }, [
    validationResult.isValid, // Only watch primitive boolean
    validationResult.invalidChars?.length, // Watch array length, not array reference
    validationResult.invalidMatches?.length, // Watch array length, not array reference  
    enableValidation,
    onValidationChange,
    fieldName,
    validPatterns, // Use memoized validPatterns instead of insertButtons
  ]);

  const getButtonStyle = (color: string, hoverColor: string) => {
    if (color.startsWith("#")) {
      return {
        backgroundColor: color,
        "--hover-color": hoverColor,
      } as React.CSSProperties;
    } else {
      return {};
    }
  };

  const getButtonClasses = (color: string, hoverColor: string) => {
    if (color.startsWith("#")) {
      return `hover:brightness-110 transition-all duration-200`;
    } else {
      return `bg-gradient-to-r ${color} ${hoverColor}`;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    setCursorPosition(e.target.selectionStart);
  };

  const handleCursorChange = (
    e:
      | React.MouseEvent<HTMLTextAreaElement>
      | React.KeyboardEvent<HTMLTextAreaElement>
  ) => {
    setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);
  };

  const insertText = (textToInsert: string): void => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;

    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);

    const newText =
      value.substring(0, startPos) +
      textToInsert +
      value.substring(endPos, value.length);

    const syntheticEvent = {
      target: { ...textarea, value: newText },
    } as React.ChangeEvent<HTMLTextAreaElement>;

    onChange(syntheticEvent);
    setCursorPosition(startPos + textToInsert.length);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        startPos + textToInsert.length,
        startPos + textToInsert.length
      );
    }, 0);
  };

  // Dynamic border color based on validation
  const getBorderColor = () => {
    if (hasValidationErrors) {
      return "border-red-300 focus-within:border-red-400";
    }
    return "border-gray-200 focus-within:border-gray-200";
  };

  // Dynamic glow effect color
  const getGlowColor = () => {
    if (hasValidationErrors) {
      return "from-red-500 to-red-400";
    }
    return "from-blue-500 to-cyan-500";
  };

  return (
    <div className="relative group">
      {/* Magic sparkles effect */}
      <div
        className={`absolute inset-0 -m-1 bg-gradient-to-r ${getGlowColor()} rounded-lg opacity-0 blur transition-all duration-300 ${
          isAnimating ? "opacity-30 blur-sm" : "group-hover:opacity-20"
        }`}
      ></div>

      <div
        className={`relative bg-white rounded-lg border-2 ${getBorderColor()} transition-all duration-300 shadow-sm hover:shadow-md`}
      >
        {showInsertButtons && insertButtons.length > 0 && (
          <div className="p-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">
                Chèn nhanh:
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {insertButtons.map((button) => {
                const IconComponent = button.icon;
                const isHexColor = button.color.startsWith("#");

                return (
                  <button
                    key={button.id}
                    onClick={() => insertText(button.text)}
                    style={
                      isHexColor
                        ? getButtonStyle(button.color, button.hoverColor)
                        : undefined
                    }
                    className={`
                      relative group/btn px-3 py-1.5 rounded-full text-xs font-medium text-white
                      ${getButtonClasses(button.color, button.hoverColor)}
                      transform transition-all duration-200 hover:scale-105 hover:shadow-lg
                      active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300
                      overflow-hidden
                      ${isHexColor ? "hover:brightness-110" : ""}
                    `}
                    title={button.label}
                  >
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 -translate-x-full group-hover/btn:translate-x-full transition-transform duration-700"></div>

                    <div className="relative flex items-center gap-1.5">
                      <IconComponent className="w-3 h-3" />
                      <span>{button.text}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="relative">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={handleChange}
            onClick={handleCursorChange}
            onKeyUp={handleCursorChange}
            placeholder={placeholder}
            rows={rows}
            className={`
              w-full p-3 bg-transparent resize-none border-none outline-none
              transition-all duration-200 placeholder-gray-400
              ${isAnimating ? "animate-pulse" : ""}
              ${hasValidationErrors ? "text-red-900" : ""}
              ${className}
            `}
            maxLength={maxLength}
          />

          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            {/* Validation status indicator */}
            {enableValidation && (
              <div
                className={`
                px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1
                ${
                  hasValidationErrors
                    ? "bg-red-100 text-red-600"
                    : value
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-500"
                }
              `}
              >
                {hasValidationErrors ? (
                  <>
                    <AlertCircle className="w-3 h-3" />
                    <span>Lỗi</span>
                  </>
                ) : value ? (
                  <>
                    <span className="text-green-500">✓</span>
                    <span>Hợp lệ</span>
                  </>
                ) : (
                  <span>Chưa kiểm tra</span>
                )}
              </div>
            )}

            <div
              className={`
                px-2 py-1 rounded-full text-xs font-medium transition-all duration-200
                ${
                  value.length > maxLength * 0.9
                    ? "bg-red-100 text-red-600"
                    : value.length > maxLength * 0.8
                    ? "bg-yellow-100 text-yellow-600"
                    : "bg-gray-100 text-gray-500"
                }
              `}
            >
              {value.length}/{maxLength}
            </div>

            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  className="text-gray-200"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="2"
                  fill="none"
                  strokeDasharray={`${(value.length / maxLength) * 63} 63`}
                  className={`transition-all duration-300 ${
                    value.length > maxLength * 0.9
                      ? "text-red-500"
                      : value.length > maxLength * 0.8
                      ? "text-yellow-500"
                      : hasValidationErrors
                      ? "text-red-500"
                      : "text-blue-500"
                  }`}
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Glow effect */}
        <div
          className={`absolute inset-0 rounded-lg bg-gradient-to-r ${getGlowColor()} opacity-0 blur-xl transition-opacity duration-300 -z-10`}
        ></div>
      </div>

      {/* Validation errors display - hiển thị pattern hợp lệ dựa trên insertButtons */}
      {/* Validation errors display */}
      {hasValidationErrors && enableValidation && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">
              {fieldName} chứa lỗi định dạng:
            </span>
          </div>

          {/* Hiển thị các ký tự bị cấm */}
          {validationResult.invalidChars &&
            validationResult.invalidChars.length > 0 && (
              <div className="mb-3">
                <p className="text-xs text-red-600 mb-2">Ký tự bị cấm:</p>
                <div className="flex flex-wrap gap-1">
                  {validationResult.invalidChars.map((char, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-mono"
                    >
                      {char}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Hiển thị các đoạn text có vấn đề */}
          <div className="mb-3">
            <p className="text-xs text-red-600 mb-2">Vị trí có lỗi:</p>
            <div className="space-y-1">
              {validationResult.invalidMatches.map((match, index) => (
                <div
                  key={index}
                  className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded font-mono"
                >
                  "{match}"
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-red-200 pt-2">
            <p className="text-xs text-red-600 mb-1">
              <strong>Quy tắc:</strong>
            </p>
            <ul className="text-xs text-red-600 space-y-1">
              <li>
                • <span className="text-green-600">✓ Được phép:</span> Patterns{" "}
                {validPatterns.map((p) => `"${p}"`).join(", ")}
              </li>
              <li>
                • <span className="text-green-600">✓ Được phép:</span> Ngoặc
                vuông [something] và ngoặc tròn (something)
              </li>
              <li>
                • <span className="text-red-600">✗ Bị cấm:</span> Malformed
                patterns như {`{something], {something), [something}`}
              </li>
              <li>
                • <span className="text-red-600">✗ Bị cấm:</span> Ký tự đơn lẻ{" "}
                {`{ } " ' \``}
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* Success animation */}
      <div
        className={`
          absolute -top-2 left-4 transform transition-all duration-300
          ${
            isAnimating
              ? "translate-y-0 opacity-100"
              : "translate-y-2 opacity-0 pointer-events-none"
          }
        `}
      >
        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium">
          ✨ Đã chèn thành công!
        </div>
        <div className="w-2 h-2 bg-gray-900 transform rotate-45 mx-auto -mt-1"></div>
      </div>
    </div>
  );
};

export default EnhancedTextarea;
