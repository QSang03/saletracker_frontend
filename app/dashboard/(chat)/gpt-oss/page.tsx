"use client";
import React, { useState, useRef, useEffect } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Zap,
  MessageCircle,
  Loader2,
  Copy,
  ThumbsUp,
  ThumbsDown,
  Eye,
  Brain,
  ChevronDown,
  ChevronUp,
  Circle,
} from "lucide-react";
import { MarkdownContent } from "@/components/common/MarkdownContent";

const ChatPage = () => {
  type Message = {
    id: number;
    role: string;
    content: string;
    timestamp: Date;
    isError?: boolean;
    isStreaming?: boolean;
    thinking?: string;
    isThinking?: boolean;
    showThinking?: boolean;
  };

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: `# Chào mừng đến với AI Assistant ✨

Tôi là **trợ lý AI cao cấp** của bạn với giao diện **tân cổ điển** sang trọng.

## 🌟 Khả năng đặc biệt:
- **Streaming real-time** với hiệu ứng mượt mà
- **Thinking process** như con người thật  
- **Markdown formatting** đẳng cấp hoàng gia
- **Animation** tinh tế và sang trọng

> **💎 Tip Cao Cấp**: Hãy trải nghiệm sự mượt mà trong từng tương tác!

---

🎭 **Sẵn sàng cho cuộc đối thoại đẳng cấp?**`,
      timestamp: new Date(),
    },
  ]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    setIsTyping(e.target.value.length > 0);
    
    const textarea = e.target;
    textarea.style.height = 'auto';
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + 'px';
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    setInput("");
    setIsTyping(false);
    setIsLoading(true);

    if (inputRef.current) {
      (inputRef.current as HTMLTextAreaElement).style.height = 'auto';
    }

    const streamingMessage = {
      id: Date.now() + 1,
      role: "assistant",
      content: "",
      timestamp: new Date(),
      isStreaming: true,
      thinking: "",
      isThinking: true,
      showThinking: false,
    };

    setMessages((prev) => [...prev, streamingMessage]);
    setStreamingMessageId(streamingMessage.id);
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(
        "https://duongg16-openai-gpt-oss-20b.hf.space/chat",
        {
          method: "POST",
          headers: {
            "X-Master-Key": process.env.NEXT_PUBLIC_MASTER_KEY || "",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages: [{ role: "user", content: currentInput }],
            max_tokens: 5000,
            temperature: 0.7,
            stream: true,
          }),
          signal: abortControllerRef.current.signal,
        }
      );

      if (!response.ok) {
        throw new Error("API Error");
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = "";
      let accumulatedThinking = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessage.id
                        ? { ...msg, isThinking: false }
                        : msg
                    )
                  );
                  break;
                }

                if (!jsonStr || jsonStr === "") continue;
                const data = JSON.parse(jsonStr);

                if (data.choices && data.choices[0]) {
                  const delta = data.choices[0].delta;

                  if (delta.reasoning_content) {
                    accumulatedThinking += delta.reasoning_content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessage.id
                          ? { ...msg, thinking: accumulatedThinking }
                          : msg
                      )
                    );
                  }

                  if (delta.content) {
                    accumulatedContent += delta.content;
                    setMessages((prev) =>
                      prev.map((msg) =>
                        msg.id === streamingMessage.id
                          ? { 
                              ...msg, 
                              content: accumulatedContent,
                              isThinking: false 
                            }
                          : msg
                      )
                    );
                  }
                } else if (data.response) {
                  accumulatedContent += data.response;
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessage.id
                        ? { 
                            ...msg, 
                            content: accumulatedContent,
                            isThinking: false 
                          }
                        : msg
                    )
                  );
                }
              } catch (e) {
                console.warn("Skipping malformed JSON in stream:", line.slice(0, 100) + "...");
                continue;
              }
            }
          }
        }
      } else {
        const data = await response.json();
        accumulatedContent =
          data.response ||
          data.choices?.[0]?.message?.content ||
          "Không có phản hồi từ AI";
      }

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === streamingMessage.id
            ? { 
                ...msg, 
                content: accumulatedContent, 
                isStreaming: false,
                isThinking: false 
              }
            : msg
        )
      );
    } catch (error) {
      if (
        typeof error === "object" &&
        error !== null &&
        "name" in error &&
        (error as any).name === "AbortError"
      ) {
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== streamingMessage.id)
        );
      } else {
        const errorMessage = {
          id: streamingMessage.id,
          role: "assistant",
          content: "Xin lỗi! Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.",
          timestamp: new Date(),
          isError: true,
          isStreaming: false,
          isThinking: false,
        };
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === streamingMessage.id ? errorMessage : msg
          )
        );
      }
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const stopGeneration = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const toggleThinking = (messageId: number) => {
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? { ...msg, showThinking: !msg.showThinking }
          : msg
      )
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-slate-50 to-stone-50 relative">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, #64748b 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}></div>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200/60 bg-white/80 backdrop-blur-xl shadow-sm sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative group">
                <div className="w-11 h-11 bg-slate-800 rounded-xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:shadow-xl group-hover:scale-105">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white"></div>
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-800">
                  AI Assistant
                </h1>
                <div className="flex items-center space-x-3 text-sm text-slate-600">
                  <div className="flex items-center space-x-1">
                    <Circle className="w-2 h-2 text-emerald-500 fill-current" />
                    <span>Trực tuyến</span>
                  </div>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <span>GPT-4</span>
                  <div className="w-1 h-1 bg-slate-300 rounded-full"></div>
                  <span>Streaming</span>
                </div>
              </div>
            </div>
            
            <div className="px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-sm font-medium border border-emerald-200">
              <div className="flex items-center space-x-1.5">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                <span>Sẵn sàng</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 h-[calc(100vh-160px)]">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-6">
            {messages.map((message, index) => (
              <div
                key={message.id}
                className={`flex items-start space-x-4 ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
                style={{ 
                  animation: `slideInUp 0.4s ease-out ${index * 50}ms both`
                }}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm transition-all duration-200 hover:shadow-md ${
                      message.role === "user"
                        ? "bg-slate-700 text-white"
                        : message.isError
                        ? "bg-red-100 text-red-600 border border-red-200"
                        : "bg-white text-slate-600 border border-slate-200"
                    }`}
                  >
                    {message.role === "user" ? (
                      <User className="w-5 h-5" />
                    ) : (
                      <Bot className="w-5 h-5" />
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div
                  className={`group max-w-3xl ${
                    message.role === "user" ? "ml-auto" : "mr-auto"
                  }`}
                >
                  {/* Thinking Process */}
                  {message.role === "assistant" && 
                   !message.isError && 
                   (message.thinking || message.isThinking) && (
                    <div className="mb-4">
                      <button
                        onClick={() => toggleThinking(message.id)}
                        className="flex items-center space-x-2 text-sm text-slate-500 hover:text-slate-700 transition-colors mb-3 px-3 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/50"
                      >
                        <Brain className="w-4 h-4" />
                        <span className="font-medium">
                          {message.isThinking ? "Đang phân tích..." : "Quá trình tư duy"}
                        </span>
                        {!message.isThinking && (
                          message.showThinking ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {(message.showThinking || message.isThinking) && (
                        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
                          <div className="text-sm text-slate-600 font-mono leading-relaxed">
                            {message.thinking && (
                              <div className="whitespace-pre-wrap">
                                {message.thinking}
                              </div>
                            )}
                            {message.isThinking && (
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="flex space-x-1">
                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce"></div>
                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                                  <div className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                </div>
                                <span className="text-slate-600">Đang suy nghĩ...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Message Bubble */}
                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm transition-all duration-200 hover:shadow-md ${
                      message.role === "user"
                        ? "bg-slate-800 text-white ml-auto"
                        : message.isError
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-white border border-slate-200 text-slate-800"
                    }`}
                  >
                    <div className="text-sm leading-relaxed">
                      {message.role === "assistant" && !message.isError ? (
                        <MarkdownContent
                          content={message.content}
                          isStreaming={message.isStreaming}
                        />
                      ) : (
                        <p className="whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>

                    {/* Message Actions */}
                    {message.role === "assistant" &&
                      !message.isError &&
                      !message.isStreaming && (
                        <div className="flex items-center justify-end space-x-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => copyMessage(message.content)}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                            title="Sao chép"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"
                            title="Thích"
                          >
                            <ThumbsUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-red-600 transition-colors"
                            title="Không thích"
                          >
                            <ThumbsDown className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Timestamp */}
                  <div
                    className={`text-xs text-slate-400 mt-1.5 px-1 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {message.isStreaming && (
                      <span className="ml-2 text-slate-500 animate-pulse">
                        • Đang trả lời...
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>
        </div>
      </div>

      {/* Input Area */}
      <div className="border-t border-slate-200/60 bg-white/80 backdrop-blur-xl">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={input}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                placeholder="Nhập tin nhắn của bạn..."
                className="w-full px-4 py-3 pr-12 bg-white border border-slate-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-slate-400 focus:border-transparent shadow-sm transition-all min-h-[50px] max-h-32 text-slate-800 placeholder-slate-500"
                rows={1}
                disabled={isLoading}
              />
              
              <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                {isTyping && (
                  <div className="flex space-x-0.5">
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-1 h-1 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                )}
                <div className="text-xs text-slate-400">
                  {input.length}/1000
                </div>
              </div>
            </div>

            {streamingMessageId ? (
              <button
                onClick={stopGeneration}
                className="p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-sm hover:shadow-md transform hover:scale-105 transition-all duration-200"
                title="Dừng"
              >
                <div className="w-4 h-4 bg-white rounded-sm"></div>
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-2xl transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? "bg-slate-800 hover:bg-slate-900 text-white shadow-sm hover:shadow-md transform hover:scale-105"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
                title="Gửi"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          {/* Status Icons */}
          <div className="flex items-center justify-center mt-3 space-x-6 text-xs text-slate-500">
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3" />
              <span>AI Thinking</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3" />
              <span>Real-time</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3" />
              <span>Markdown</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>Streaming</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes slideInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default ChatPage;
