"use client";

import { cn } from "@/lib/utils";
import { RefreshCw, Hash, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// Function to parse and colorize log messages
const formatLogMessage = (message: string) => {
  // Extract timestamp, service name, and content
  const timestampRegex = /^\[([^\]]+)\]/;
  const serviceRegex = /\[([^\]]+)\]/g;
  
  let parts = [];
  let lastIndex = 0;
  
  // Find timestamp
  const timestampMatch = message.match(timestampRegex);
  if (timestampMatch) {
    parts.push({
      type: 'timestamp',
      text: timestampMatch[0],
      start: timestampMatch.index!,
      end: timestampMatch.index! + timestampMatch[0].length
    });
    lastIndex = timestampMatch.index! + timestampMatch[0].length;
  }
  
  // Find service names (excluding timestamp)
  const serviceMatches = [...message.slice(lastIndex).matchAll(serviceRegex)];
  serviceMatches.forEach(match => {
    if (match.index !== undefined) {
      parts.push({
        type: 'service',
        text: match[0],
        start: lastIndex + match.index,
        end: lastIndex + match.index + match[0].length
      });
    }
  });
  
  // Sort parts by position
  parts.sort((a, b) => a.start - b.start);
  
  // Build colored message
  const result = [];
  let currentIndex = 0;
  
  parts.forEach((part, index) => {
    // Add text before this part
    if (part.start > currentIndex) {
      const text = message.slice(currentIndex, part.start);
      result.push(<span key={`text-${index}`} className="text-slate-300">{text}</span>);
    }
    
    // Add colored part
    let className = "";
    switch (part.type) {
      case 'timestamp':
        className = "text-blue-400";
        break;
      case 'service':
        // Fixed colors for each service type
        const serviceText = part.text.toLowerCase();
        if (serviceText.includes('debt_service]')) {
          className = "text-green-400 font-medium";
        } else if (serviceText.includes('debt_notice_service]')) {
          className = "text-yellow-400 font-medium";
        } else if (serviceText.includes('debt_reminder_service]')) {
          className = "text-purple-400 font-medium";
        } else if (serviceText.includes('paylaterservice]')) {
          className = "text-pink-400 font-medium";
        } else if (serviceText.includes('debtservice]')) {
          className = "text-cyan-400 font-medium";
        } else {
          className = "text-orange-400 font-medium";
        }
        break;
    }
    
    result.push(
      <span key={`part-${index}`} className={className}>
        {part.text}
      </span>
    );
    
    currentIndex = part.end;
  });
  
  // Add remaining text
  if (currentIndex < message.length) {
    const remainingText = message.slice(currentIndex);
    
    // Highlight specific keywords in remaining text
    const highlightKeywords = (text: string) => {
      const keywords = [
        { pattern: /Thread \d+:/g, className: "text-cyan-300 font-medium" },
        { pattern: /Employee \d+:/g, className: "text-indigo-300 font-medium" },
        { pattern: /\d+\/\d+/g, className: "text-emerald-300 font-medium" },
        { pattern: /sleeping for \d+ seconds/g, className: "text-gray-400 italic" },
        { pattern: /completed one iteration/g, className: "text-emerald-400" },
        { pattern: /Bỏ qua:/g, className: "text-yellow-300 font-medium" },
        { pattern: /Chưa đến lúc/g, className: "text-yellow-300" },
        { pattern: /thành công/g, className: "text-green-300 font-medium" },
        { pattern: /Không có/g, className: "text-gray-400" },
        { pattern: /Tìm thấy \d+/g, className: "text-blue-300" },
        { pattern: /Bắt đầu xử lý/g, className: "text-green-300" },
        { pattern: /Hoàn thành/g, className: "text-emerald-300 font-medium" },
        { pattern: /ERROR|Error|error/g, className: "text-red-400 font-bold" },
        { pattern: /WARNING|Warning|warning/g, className: "text-yellow-400 font-medium" },
        { pattern: /INFO|Info|info/g, className: "text-blue-300" },
        { pattern: /DEBUG|Debug|debug/g, className: "text-purple-300" },
      ];
      
      let parts = [{ text, className: "text-slate-300" }];
      
      keywords.forEach(({ pattern, className }) => {
        const newParts: { text: string; className: string }[] = [];
        parts.forEach(part => {
          if (typeof part.text === 'string') {
            const matches = [...part.text.matchAll(pattern)];
            if (matches.length > 0) {
              let lastIndex = 0;
              matches.forEach(match => {
                if (match.index !== undefined) {
                  // Add text before match
                  if (match.index > lastIndex) {
                    newParts.push({
                      text: part.text.slice(lastIndex, match.index),
                      className: part.className
                    });
                  }
                  // Add highlighted match
                  newParts.push({
                    text: match[0],
                    className: className
                  });
                  lastIndex = match.index + match[0].length;
                }
              });
              // Add remaining text
              if (lastIndex < part.text.length) {
                newParts.push({
                  text: part.text.slice(lastIndex),
                  className: part.className
                });
              }
            } else {
              newParts.push(part);
            }
          } else {
            newParts.push(part);
          }
        });
        parts = newParts;
      });
      
      return parts.map((part, index) => (
        <span key={index} className={part.className}>
          {part.text}
        </span>
      ));
    };
    
    result.push(...highlightKeywords(remainingText));
  }
  
  return result;
};

interface LogViewerProps {
  logs: string[];
  title: string;
  maxHeight?: string;
  loading?: boolean;
  className?: string;
  isServiceRunning?: boolean;
  showLineNumbers?: boolean;
  onClearLogs?: () => void;
  showServiceLegend?: boolean;
}

export function LogViewer({ 
  logs, 
  title, 
  maxHeight = "max-h-64", 
  loading = false,
  className,
  isServiceRunning = false,
  showLineNumbers = false,
  onClearLogs,
  showServiceLegend = true
}: LogViewerProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [internalShowLineNumbers, setInternalShowLineNumbers] = useState(showLineNumbers);
  const [selectedServices, setSelectedServices] = useState<string[]>([]);

  // Auto scroll to bottom when new logs arrive
  useEffect(() => {
    if (scrollRef.current && logs.length > 0) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  // Filter logs based on selected services
  const filteredLogs = selectedServices.length === 0 
    ? logs 
    : logs.filter(log => {
        const lowerLog = log.toLowerCase();
        return selectedServices.some(service => lowerLog.includes(`[${service}]`));
      });

  const toggleServiceFilter = (service: string) => {
    setSelectedServices(prev => 
      prev.includes(service)
        ? prev.filter(s => s !== service)
        : [...prev, service]
    );
  };
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-medium text-muted-foreground">{title}</h4>
          {logs.length > 0 && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {selectedServices.length > 0 
                ? `${filteredLogs.length}/${logs.length} dòng`
                : `${logs.length} dòng`
              }
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {logs.length > 0 && (
            <>
              <button
                onClick={() => setInternalShowLineNumbers(!internalShowLineNumbers)}
                className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                title="Toggle line numbers"
              >
                <Hash className="size-3" />
              </button>
              {onClearLogs && (
                <button
                  onClick={onClearLogs}
                  className="p-1 hover:bg-muted rounded text-muted-foreground hover:text-destructive transition-colors"
                  title="Clear logs"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </>
          )}
          {loading && (
            <RefreshCw className="size-3 animate-spin text-muted-foreground" />
          )}
        </div>
      </div>

      {/* Service Legend */}
      {showServiceLegend && logs.length > 0 && (
        <div className="flex flex-wrap gap-2 text-xs">
          <div 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all",
              selectedServices.includes('debt_service') || selectedServices.length === 0
                ? "bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
            onClick={() => toggleServiceFilter('debt_service')}
          >
            <div className="w-2 h-2 rounded-full bg-green-400"></div>
            <span className="text-muted-foreground">debt_service</span>
          </div>
          <div 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all",
              selectedServices.includes('debt_notice_service') || selectedServices.length === 0
                ? "bg-yellow-100 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
            onClick={() => toggleServiceFilter('debt_notice_service')}
          >
            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
            <span className="text-muted-foreground">debt_notice_service</span>
          </div>
          <div 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all",
              selectedServices.includes('debt_reminder_service') || selectedServices.length === 0
                ? "bg-purple-100 dark:bg-purple-900/30 border border-purple-300 dark:border-purple-700"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
            onClick={() => toggleServiceFilter('debt_reminder_service')}
          >
            <div className="w-2 h-2 rounded-full bg-purple-400"></div>
            <span className="text-muted-foreground">debt_reminder_service</span>
          </div>
          <div 
            className={cn(
              "flex items-center gap-1 px-2 py-1 rounded cursor-pointer transition-all",
              selectedServices.includes('paylaterservice') || selectedServices.length === 0
                ? "bg-pink-100 dark:bg-pink-900/30 border border-pink-300 dark:border-pink-700"
                : "bg-muted hover:bg-muted/80 border border-transparent"
            )}
            onClick={() => toggleServiceFilter('paylaterservice')}
          >
            <div className="w-2 h-2 rounded-full bg-pink-400"></div>
            <span className="text-muted-foreground">PayLaterService</span>
          </div>
          {selectedServices.length > 0 && (
            <button
              onClick={() => setSelectedServices([])}
              className="px-2 py-1 text-xs bg-muted hover:bg-muted/80 rounded border border-transparent hover:border-border transition-all"
            >
              Clear filters
            </button>
          )}
        </div>
      )}
      <div 
        ref={scrollRef}
        className={cn(
          "relative border rounded-md bg-slate-950 dark:bg-slate-900",
          maxHeight,
          "overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800"
        )}
      >
        <div className="p-3">
          {filteredLogs.length > 0 ? (
            <div className="text-xs font-mono whitespace-pre-wrap break-words space-y-0.5">
              {filteredLogs.map((log, index) => {
                // Determine service type for row background
                const getRowBackground = (logText: string) => {
                  const lowerLog = logText.toLowerCase();
                  if (lowerLog.includes('[debt_service]')) return 'hover:bg-green-950/20';
                  if (lowerLog.includes('[debt_notice_service]')) return 'hover:bg-yellow-950/20';
                  if (lowerLog.includes('[debt_reminder_service]')) return 'hover:bg-purple-950/20';
                  if (lowerLog.includes('[paylaterservice]')) return 'hover:bg-pink-950/20';
                  return 'hover:bg-slate-800/30';
                };
                
                return (
                  <div 
                    key={index} 
                    className={cn(
                      "leading-relaxed flex py-0.5 px-1 rounded-sm transition-colors",
                      getRowBackground(log)
                    )}
                  >
                    {internalShowLineNumbers && (
                      <span className="text-slate-500 mr-3 select-none w-8 flex-shrink-0 text-right">
                        {index + 1}
                      </span>
                    )}
                    <div className="flex-1">
                      {formatLogMessage(log)}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-xs text-slate-400 italic">
              {logs.length > 0 && selectedServices.length > 0
                ? "Không có log nào khớp với filter đã chọn."
                : isServiceRunning 
                ? "Đang chờ log từ service..." 
                : "Service chưa chạy. Nhấn Start để bắt đầu và xem log."
              }
            </div>
          )}
        </div>
        {loading && (
          <div className="absolute inset-0 bg-slate-950/50 flex items-center justify-center">
            <div className="bg-slate-800 rounded-md px-3 py-2 flex items-center gap-2">
              <RefreshCw className="size-3 animate-spin text-slate-300" />
              <span className="text-xs text-slate-300">Đang tải...</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
