import { Sparkles, AlertCircle, Zap, Plus } from "lucide-react";
import React, { useState, useRef, useMemo, useEffect } from "react";

interface ValidationResult {
  isValid: boolean;
  invalidMatches: string[];
  invalidChars: string[];
  missingMustHave: string[];
}

const validateBrackets = (
  text: string,
  validPatterns: string[],
  mustHavePatterns: string[] = []
): ValidationResult => {
  if (!text) {
    return {
      isValid: true,
      invalidMatches: [],
      invalidChars: [],
      missingMustHave: [],
    };
  }

  // Step 1: Tìm tất cả các valid patterns trong text
  const validOccurrences: { pattern: string; start: number; end: number }[] = [];

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
    /\{[^}]*\}/g,
    /\{[^\}]*\]/g,
    /\[[^\]]*\}/g,
    /\{[^\}]*\)/g,
    /\([^)]*\}/g,
    /['`]\{[^}]*\}['`]/g,
    /['`]\{[^}]*\}/g,
    /\{[^}]*\}['`]/g,
    /['`]\{[^}]*\}[']/g,
    /['`]\{[^}]*\}`/g,
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
  const forbiddenChars = ["{", "}", "'", "`"]; // Removed " from forbidden chars
  const invalidChars: string[] = [];
  const invalidPositions: number[] = [];
  
  text.split("").forEach((char, index) => {
    if (forbiddenChars.includes(char) && !isValidPosition[index]) {
      invalidChars.push(char);
      invalidPositions.push(index);
    } else if (char === '"' && !isValidPosition[index]) {
      // Allow " if it's used for measurements (inch notation)
      const before = text.slice(Math.max(0, index - 5), index);
      const after = text.slice(index + 1, Math.min(text.length, index + 3));
      const context = before + char + after;
      
      // Check if it's likely used for inch notation (number followed by ")
      const isInchNotation = /\d+\s*"/.test(context) || /\d+"\s*/.test(context);
      
      if (!isInchNotation) {
        invalidChars.push(char);
        invalidPositions.push(index);
      }
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

  // NEW: Missing must-have patterns
  const missingMustHave = mustHavePatterns.filter((p) => !text.includes(p));

  return {
    isValid:
      allInvalidMatches.length === 0 &&
      invalidChars.length === 0 &&
      missingMustHave.length === 0,
    invalidMatches: allInvalidMatches,
    invalidChars: [...new Set(invalidChars)],
    missingMustHave,
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
  mustHavePatterns?: string[]; // NEW
  autoPrefixEnabledDefault?: boolean; // NEW: default state for auto insertion
  autoPrefixPattern?: string; // NEW: pattern to auto insert (default [QC])
  showAutoPrefixToggle?: boolean; // NEW: show/hide toggle
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
  // Mặc định không bắt buộc cụm nào; nơi sử dụng sẽ truyền nếu cần
  mustHavePatterns: mustHavePatternsProp = [],
  // Mặc định không tự động chèn; nơi sử dụng có thể bật bằng prop
  autoPrefixEnabledDefault = false,
  autoPrefixPattern = "",
  showAutoPrefixToggle = true,
}) => {
  const [cursorPosition, setCursorPosition] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [autoPrefixEnabled, setAutoPrefixEnabled] = useState<boolean>(autoPrefixEnabledDefault);
  const autoInsertRef = useRef(false); // prevent double insertion loop

  // Valid patterns from provided buttons
  const validPatterns = useMemo(() => insertButtons.map((b) => b.text), [insertButtons]);
  const mustHavePatterns = useMemo(() => mustHavePatternsProp, [mustHavePatternsProp]);

  const validationResult = useMemo(() => {
    if (!enableValidation || !value) {
      return {
        isValid: true,
        invalidMatches: [],
        invalidChars: [],
        missingMustHave: [],
      };
    }
    return validateBrackets(value, validPatterns, mustHavePatterns);
  }, [value, enableValidation, validPatterns, mustHavePatterns]);

  const hasValidationErrors = !validationResult.isValid;

  const validationStateRef = useRef<{
    isValid: boolean;
    invalidCharsCount: number;
    invalidMatchesCount: number;
    missingMustHaveCount: number;
    lastErrorMessage: string | null;
  }>({
    isValid: true,
    invalidCharsCount: 0,
    invalidMatchesCount: 0,
    missingMustHaveCount: 0,
    lastErrorMessage: null,
  });

  useEffect(() => {
    if (!enableValidation || !onValidationChange) return;

    const isValid = validationResult.isValid;
    const invalidCharsCount = validationResult.invalidChars.length;
    const invalidMatchesCount = validationResult.invalidMatches.length;
    const missingMustHaveCount = validationResult.missingMustHave.length;

    const prev = validationStateRef.current;
    const changed =
      prev.isValid !== isValid ||
      prev.invalidCharsCount !== invalidCharsCount ||
      prev.invalidMatchesCount !== invalidMatchesCount ||
      prev.missingMustHaveCount !== missingMustHaveCount;
    if (!changed) return;

    validationStateRef.current = {
      isValid,
      invalidCharsCount,
      invalidMatchesCount,
      missingMustHaveCount,
      lastErrorMessage: null,
    };

    if (isValid) {
      onValidationChange(null);
      return;
    }

    let errorMessage = `${fieldName} chứa lỗi định dạng:`;
    if (invalidCharsCount > 0) {
      errorMessage += `\n• Ký tự bị cấm: ${validationResult.invalidChars.join(", ")}`;
    }
    if (invalidMatchesCount > 0) {
      errorMessage += `\n• Vị trí có lỗi: ${validationResult.invalidMatches.map((m) => `"${m}"`).join(", ")}`;
    }
    if (missingMustHaveCount > 0) {
      errorMessage += `\n• Thiếu cụm bắt buộc: ${validationResult.missingMustHave.join(", ")}`;
    }
    errorMessage += `\n• Được phép: ${validPatterns.map((p) => `"${p}"`).join(", ")}`;
    validationStateRef.current.lastErrorMessage = errorMessage;
    onValidationChange(errorMessage);
  }, [
    validationResult.isValid,
    validationResult.invalidChars.length,
    validationResult.invalidMatches.length,
    validationResult.missingMustHave.length,
    enableValidation,
    onValidationChange,
    fieldName,
    validPatterns,
    mustHavePatterns,
    validationResult.invalidChars,
    validationResult.invalidMatches,
    validationResult.missingMustHave,
  ]);

  const getButtonStyle = (color: string, hoverColor: string) => {
    if (color.startsWith("#")) {
      return { backgroundColor: color, "--hover-color": hoverColor } as React.CSSProperties;
    }
    return {};
  };
  const getButtonClasses = (color: string, hoverColor: string) =>
    color.startsWith("#") ? `hover:brightness-110 transition-all duration-200` : `bg-gradient-to-r ${color} ${hoverColor}`;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e);
    setCursorPosition(e.target.selectionStart);
  };
  const handleCursorChange = (
    e: React.MouseEvent<HTMLTextAreaElement> | React.KeyboardEvent<HTMLTextAreaElement>
  ) => setCursorPosition((e.target as HTMLTextAreaElement).selectionStart);

  const insertText = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const startPos = textarea.selectionStart;
    const endPos = textarea.selectionEnd;
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
    const newText = value.substring(0, startPos) + textToInsert + value.substring(endPos);
    const syntheticEvent = { target: { ...textarea, value: newText } } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);
    setCursorPosition(startPos + textToInsert.length);
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(startPos + textToInsert.length, startPos + textToInsert.length);
    }, 0);
  };

  const getBorderColor = () => (hasValidationErrors ? "border-red-300 focus-within:border-red-400" : "border-gray-200 focus-within:border-gray-200");
  const getGlowColor = () => (hasValidationErrors ? "from-red-500 to-red-400" : "from-blue-500 to-cyan-500");

  // Auto insert prefix effect
  useEffect(() => {
    // Run when value changes so we can detect manual deletion of the prefix
    if (!autoPrefixEnabled) return;
    if (typeof autoPrefixPattern !== 'string' || autoPrefixPattern.trim() === '') return;
    const trimmedPattern = autoPrefixPattern.trim();
    if (value.startsWith(trimmedPattern)) return;
    // Avoid re-entrant loops
    if (autoInsertRef.current) return;
    autoInsertRef.current = true;

    const newValue = value.trim().length === 0 ? `${trimmedPattern} ` : `${trimmedPattern} ${value}`;
    const textarea = textareaRef.current;
    const syntheticEvent = { target: { ...textarea, value: newValue } } as React.ChangeEvent<HTMLTextAreaElement>;
    onChange(syntheticEvent);

    // After parent updates value, restore caret position after prefix
    setTimeout(() => {
      autoInsertRef.current = false;
      if (textarea) {
        const caretPos = trimmedPattern.length + 1; // prefix + space
        textarea.focus();
        try {
          textarea.setSelectionRange(caretPos, caretPos);
        } catch (e) {
          // ignore if DOM not ready
        }
      }
    }, 0);
  }, [autoPrefixEnabled, autoPrefixPattern, value, onChange]);

  // (previous helper effect removed) the main effect above now watches `value` and re-inserts when needed

  return (
    <div className="relative group">
      <div
        className={`absolute inset-0 -m-1 bg-gradient-to-r ${getGlowColor()} rounded-lg opacity-0 blur transition-all duration-300 ${
          isAnimating ? "opacity-30 blur-sm" : "group-hover:opacity-20"
        }`}
      ></div>
      <div className={`relative bg-white rounded-lg border-2 ${getBorderColor()} transition-all duration-300 shadow-sm hover:shadow-md`}>
    {showInsertButtons && insertButtons.length > 0 && (
          <div className="p-3 pb-2 border-b border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-500 animate-pulse" />
              <span className="text-xs font-medium text-gray-600">Chèn nhanh:</span>
              {showAutoPrefixToggle && autoPrefixPattern.trim() !== '' && (
                <div className="ml-auto flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAutoPrefixEnabled(!autoPrefixEnabled)}
                    className={`relative inline-flex items-center h-6 rounded-full w-12 transition-all duration-300 ${
                      autoPrefixEnabled 
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600' 
                        : 'bg-gray-300'
                    }`}
                  >
                    <span className={`inline-flex items-center justify-center w-5 h-5 bg-white rounded-full shadow transform transition-all duration-300 ${
                      autoPrefixEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}>
                      {autoPrefixEnabled ? (
                        <Zap className="w-3 h-3 text-blue-600" />
                      ) : (
                        <Plus className="w-3 h-3 text-gray-400" />
                      )}
                    </span>
                  </button>

                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Auto </span>
                    <code className="text-xs bg-white px-1.5 py-0.5 rounded border text-blue-600 font-mono">
                      {autoPrefixPattern}
                    </code>
                  </div>

                  {!autoPrefixEnabled && (
                    <button
                      onClick={() => insertText(autoPrefixPattern + ' ')}
                      className="p-1.5 text-blue-600 hover:bg-blue-100 rounded-md transition"
                      title="Chèn ngay"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {insertButtons.map((button) => {
                const IconComponent = button.icon;
                const isHexColor = button.color.startsWith("#");
                return (
                  <button
                    key={button.id}
                    onClick={() => insertText(button.text)}
                    style={isHexColor ? getButtonStyle(button.color, button.hoverColor) : undefined}
                    className={`
                      relative group/btn px-3 py-1.5 rounded-full text-xs font-medium text-white
                      ${getButtonClasses(button.color, button.hoverColor)}
                      transform transition-all duration-200 hover:scale-105 hover:shadow-lg
                      active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-300
                      overflow-hidden ${isHexColor ? "hover:brightness-110" : ""}`}
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
            className={`w-full p-3 bg-transparent resize-none border-none outline-none transition-all duration-200 placeholder-gray-400 ${
              isAnimating ? "animate-pulse" : ""
            } ${hasValidationErrors ? "text-red-900" : ""} ${className}`}
            maxLength={maxLength}
          />
          <div className="absolute bottom-2 right-3 flex items-center gap-2">
            {enableValidation && (
              <div
                className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 flex items-center gap-1 ${
                  hasValidationErrors
                    ? "bg-red-100 text-red-600"
                    : value
                    ? "bg-green-100 text-green-600"
                    : "bg-gray-100 text-gray-500"
                }`}
              >
                {hasValidationErrors ? (
                  <span className="flex items-start justify-center">
                    <AlertCircle className="w-3 h-3" />
                    <span>Lỗi</span>
                  </span>
                ) : value ? (
                  <span className="flex items-start justify-center">
                    <span className="text-green-500">✓</span>
                    <span>Hợp lệ</span>
                  </span>
                ) : (
                  <span>Chưa kiểm tra</span>
                )}
              </div>
            )}
            <div
              className={`px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
                value.length > maxLength * 0.9
                  ? "bg-red-100 text-red-600"
                  : value.length > maxLength * 0.8
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              {value.length}/{maxLength}
            </div>
            <div className="relative w-6 h-6">
              <svg className="w-6 h-6 transform -rotate-90" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" className="text-gray-200" />
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
        <div className={`absolute inset-0 rounded-lg bg-gradient-to-r ${getGlowColor()} opacity-0 blur-xl transition-opacity duration-300 -z-10`}></div>
      </div>
      {hasValidationErrors && enableValidation && (
        <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-red-500" />
            <span className="text-sm font-medium text-red-800">{fieldName} chứa lỗi định dạng:</span>
          </div>
          {validationResult.invalidChars.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-red-600 mb-2">Ký tự bị cấm:</p>
              <div className="flex flex-wrap gap-1">
                {validationResult.invalidChars.map((char, i) => (
                  <span key={i} className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-mono">
                    {char}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="mb-3">
            <p className="text-xs text-red-600 mb-2">Vị trí có lỗi:</p>
            <div className="space-y-1">
              {validationResult.invalidMatches.map((match, i) => (
                <div key={i} className="text-sm text-red-700 bg-red-100 px-2 py-1 rounded font-mono">
                  "{match}"
                </div>
              ))}
            </div>
          </div>
          {validationResult.missingMustHave.length > 0 && (
            <div className="mb-3">
              <p className="text-xs text-red-600 mb-2">Thiếu cụm bắt buộc:</p>
              <div className="flex flex-wrap gap-1">
                {validationResult.missingMustHave.map((p, i) => (
                  <span key={i} className="px-2 py-1 bg-red-200 text-red-800 rounded text-sm font-mono">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
          <div className="border-t border-red-200 pt-2">
            <p className="text-xs text-red-600 mb-1">
              <strong>Quy tắc:</strong>
            </p>
            <ul className="text-xs text-red-600 space-y-1">
              <li>
                • <span className="text-green-600">✓ Được phép:</span> Patterns {validPatterns.map((p) => `"${p}"`).join(", ")}
              </li>
              <li>
                • <span className="text-green-600">✓ Được phép:</span> Ngoặc vuông [something] và ngoặc tròn (something)
              </li>
              <li>
                • <span className="text-green-600">✓ Được phép:</span> Dấu nháy kép " cho đo lường (ví dụ: 24", 27")
              </li>
              {mustHavePatterns.length > 0 && (
                <li>
                  • <span className="text-orange-600">⚠ Bắt buộc có:</span> {mustHavePatterns.map((p) => `"${p}"`).join(", ")}
                </li>
              )}
              <li>
                • <span className="text-red-600">✗ Bị cấm:</span> Malformed patterns như {`{something], {something), [something}`}
              </li>
              <li>
                • <span className="text-red-600">✗ Bị cấm:</span> Ký tự đơn lẻ {`{ } ' \``} và dấu " không phải đo lường
              </li>
            </ul>
          </div>
        </div>
      )}
      <div
        className={`absolute -top-2 left-4 transform transition-all duration-300 ${
          isAnimating ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0 pointer-events-none"
        }`}
      >
        <div className="bg-gray-900 text-white px-2 py-1 rounded text-xs font-medium">✨ Đã chèn thành công!</div>
        <div className="w-2 h-2 bg-gray-900 transform rotate-45 mx-auto -mt-1"></div>
      </div>
    </div>
  );
};

export default EnhancedTextarea;
