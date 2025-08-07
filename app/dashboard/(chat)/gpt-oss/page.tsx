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
      content: `# Xin chào! 👋 

Tôi là **AI Assistant** của bạn. Hãy hỏi tôi bất cứ điều gì bạn muốn!

## ✨ Tôi có thể:
- Trả lời câu hỏi với **markdown formatting** đẹp mắt
- Stream response theo *thời gian thực*
- Hiển thị **quá trình suy nghĩ** như AI thật
- Hỗ trợ nhiều định dạng khác nhau

> **Tip**: Hãy thử hỏi tôi về bất kỳ chủ đề nào! Tôi sẽ cho bạn thấy cách tôi suy nghĩ và phân tích vấn đề.

---

🚀 **Sẵn sàng bắt đầu cuộc trò chuyện!**`,
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<number | null>(
    null
  );
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
    setIsLoading(true);

    // Create streaming message
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

    // Create abort controller for this request
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
      let buffer = ""; // Buffer for incomplete JSON

      if (reader) {
        while (true) {
          const { value, done } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Split by lines and process complete lines
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === "[DONE]") {
                  // Thinking phase is done, start showing content
                  setMessages((prev) =>
                    prev.map((msg) =>
                      msg.id === streamingMessage.id
                        ? { ...msg, isThinking: false }
                        : msg
                    )
                  );
                  break;
                }

                // Skip empty or malformed JSON
                if (!jsonStr || jsonStr === "") continue;

                const data = JSON.parse(jsonStr);

                // Handle OpenAI-style streaming format
                if (data.choices && data.choices[0]) {
                  const delta = data.choices[0].delta;

                  // Handle thinking content (reasoning)
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

                  // Handle main content
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
                }
                // Fallback for custom format
                else if (data.response) {
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
                // Skip invalid JSON lines - this is normal for streaming
                console.warn("Skipping malformed JSON in stream:", line.slice(0, 100) + "...");
                continue;
              }
            }
          }
        }
      } else {
        // Fallback to regular response if streaming is not supported
        const data = await response.json();
        accumulatedContent =
          data.response ||
          data.choices?.[0]?.message?.content ||
          "Không có phản hồi từ AI";
      }

      // Finalize the message
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
        // Request was cancelled
        setMessages((prev) =>
          prev.filter((msg) => msg.id !== streamingMessage.id)
        );
      } else {
        const errorMessage = {
          id: streamingMessage.id,
          role: "assistant",
          content:
            "Xin lỗi! Đã có lỗi xảy ra khi kết nối với AI. Vui lòng thử lại sau.",
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
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-cyan-50 flex flex-col">
      {/* Header */}
      <div className="border-b bg-white/80 backdrop-blur-lg shadow-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-10 h-10 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full flex items-center justify-center">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div>
              <h1 className="text-xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                AI Assistant Pro
              </h1>
              <p className="text-sm text-gray-500">
                Thinking • Markdown • Streaming • Real-time
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-hidden">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex items-start space-x-3 animate-in slide-in-from-bottom duration-500 ${
                  message.role === "user"
                    ? "flex-row-reverse space-x-reverse"
                    : ""
                }`}
              >
                <div
                  className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    message.role === "user"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-600"
                      : message.isError
                      ? "bg-gradient-to-r from-red-500 to-pink-600"
                      : "bg-gradient-to-r from-indigo-500 to-purple-600"
                  }`}
                >
                  {message.role === "user" ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>

                <div
                  className={`group max-w-3xl ${
                    message.role === "user" ? "ml-auto" : "mr-auto"
                  }`}
                >
                  {/* Thinking Process */}
                  {message.role === "assistant" && 
                   !message.isError && 
                   (message.thinking || message.isThinking) && (
                    <div className="mb-2">
                      <button
                        onClick={() => toggleThinking(message.id)}
                        className="flex items-center space-x-2 text-sm text-gray-500 hover:text-gray-700 transition-colors mb-2"
                      >
                        <Brain className="w-4 h-4" />
                        <span>
                          {message.isThinking ? "Đang suy nghĩ..." : "Quá trình suy nghĩ"}
                        </span>
                        {!message.isThinking && (
                          message.showThinking ? 
                            <ChevronUp className="w-4 h-4" /> : 
                            <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                      
                      {(message.showThinking || message.isThinking) && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
                          <div className="text-xs text-gray-600 font-mono leading-relaxed">
                            {message.thinking && (
                              <div className="whitespace-pre-wrap">
                                {message.thinking}
                              </div>
                            )}
                            {message.isThinking && (
                              <div className="flex items-center space-x-2 mt-2">
                                <div className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></div>
                                <span className="text-indigo-600">Đang phân tích...</span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div
                    className={`px-4 py-3 rounded-2xl shadow-sm relative ${
                      message.role === "user"
                        ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white"
                        : message.isError
                        ? "bg-red-50 border border-red-200 text-red-700"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    {message.role === "assistant" && !message.isError && (
                      <div className="flex items-center space-x-1">
                        {message.isStreaming && (
                          <Eye className="w-3 h-3 text-indigo-400 animate-pulse" />
                        )}
                        <Sparkles className="w-4 h-4 text-indigo-400 absolute -top-2 -left-1 animate-pulse" />
                      </div>
                    )}

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
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600"
                            title="Copy message"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-green-600"
                            title="Like"
                          >
                            <ThumbsUp className="w-3 h-3" />
                          </button>
                          <button
                            className="p-1 hover:bg-gray-100 rounded text-gray-400 hover:text-red-600"
                            title="Dislike"
                          >
                            <ThumbsDown className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                  </div>
                  <div
                    className={`text-xs text-gray-400 mt-1 px-1 ${
                      message.role === "user" ? "text-right" : "text-left"
                    }`}
                  >
                    {message.timestamp.toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    {message.isStreaming && (
                      <span className="ml-2 text-indigo-400 animate-pulse">
                        Đang trả lời...
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
      <div className="border-t bg-white/80 backdrop-blur-lg">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-end space-x-3">
            <div className="flex-1 relative">
              <div className="relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Nhập tin nhắn của bạn... (hỗ trợ **markdown**)"
                  className="w-full px-4 py-3 pr-12 bg-white border border-gray-200 rounded-2xl resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent shadow-sm transition-all min-h-[50px] max-h-32"
                  rows={1}
                  style={{ height: "auto" }}
                  disabled={isLoading}
                />
                <div className="absolute right-3 bottom-3 flex items-center space-x-2">
                  <div className="text-xs text-gray-400">
                    {input.length}/1000
                  </div>
                </div>
              </div>
            </div>

            {streamingMessageId ? (
              <button
                onClick={stopGeneration}
                className="p-3 rounded-2xl bg-red-500 hover:bg-red-600 text-white shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200"
                title="Dừng phản hồi"
              >
                <div className="w-5 h-5 bg-white rounded-sm"></div>
              </button>
            ) : (
              <button
                onClick={sendMessage}
                disabled={!input.trim() || isLoading}
                className={`p-3 rounded-2xl transition-all duration-200 ${
                  input.trim() && !isLoading
                    ? "bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transform hover:scale-105"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
                title="Gửi tin nhắn"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-center mt-3 space-x-4 text-xs text-gray-500">
            <div className="flex items-center space-x-1">
              <Brain className="w-3 h-3 text-purple-500" />
              <span>AI Thinking</span>
            </div>
            <div className="flex items-center space-x-1">
              <Zap className="w-3 h-3 text-yellow-500" />
              <span>Stream Response</span>
            </div>
            <div className="flex items-center space-x-1">
              <MessageCircle className="w-3 h-3 text-blue-500" />
              <span>Markdown Support</span>
            </div>
            <div className="flex items-center space-x-1">
              <Eye className="w-3 h-3 text-green-500" />
              <span>Real-time</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;