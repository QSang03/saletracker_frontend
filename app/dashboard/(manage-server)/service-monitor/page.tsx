"use client";
import React from "react";
import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Activity,
    Play,
    Square,
    FileText,
    RefreshCw,
    Server,
    Zap,
    AlertTriangle,
    CheckCircle2,
} from "lucide-react";
import { ServiceStatusIndicator } from "@/components/manage-server/service-status-indicator";
import { LogViewer } from "@/components/manage-server/log-viewer";
import { ConnectionStatus } from "@/components/manage-server/connection-status";
import { ServiceMetrics } from "@/components/manage-server/service-metrics";
import { cn } from "@/lib/utils";

// Nếu dùng process.env trong NextJS, có thể cần thêm dòng sau để tránh lỗi linter:
// eslint-disable-next-line no-undef
const WS_URL = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_SERVICE_WS_URL) ? process.env.NEXT_PUBLIC_SERVICE_WS_URL : "http://localhost:5000";

interface ServiceStatus {
    running: boolean;
    pid: number | null;
    status: string;
    process_count: number;
}

interface LogMessage {
    category: string;
    service: string;
    message: string;
}

// Mảng màu động
const COLORS = [
  "#60a5fa", "#34d399", "#fbbf24", "#f87171", "#a78bfa", "#f472b6", "#38bdf8", "#facc15", "#4ade80"
];

function getColorForCategory(category: string) {
  let hash = 0;
  for (let i = 0; i < category.length; i++) {
    hash = category.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % COLORS.length;
  return COLORS[idx];
}

export default function ServiceMonitorPage() {
    const [status, setStatus] = useState<Record<string, ServiceStatus>>({});
    const [logs, setLogs] = useState<Record<string, string[]>>({});
    const logsRef = useRef<Record<string, string[]>>({});
    const [realtimeLogs, setRealtimeLogs] = useState<Record<string, string[]>>({});
    // Luôn cập nhật logsRef khi logs thay đổi
    useEffect(() => {
        logsRef.current = logs;
    }, [logs]);
    const [connecting, setConnecting] = useState(true);
    const [connected, setConnected] = useState(false);
    const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});
    const [pendingStart, setPendingStart] = useState<Record<string, boolean>>({});
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const socketRef = useRef<Socket | null>(null);
    const [componentKey, setComponentKey] = useState(Date.now());

    useEffect(() => {
        console.log("WS_URL:", WS_URL);
        const socket = io(WS_URL, {
            transports: ["websocket", "polling"], // Cho phép fallback sang polling
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 10,
            timeout: 20000,
            forceNew: true, // Tạo connection mới mỗi lần
        });

        socketRef.current = socket;
        setConnecting(true);

        // Debug connection states
        socket.on("connect", () => {
            console.log("🔗 Connected to WebSocket, transport:", socket.io.engine.transport.name);
            setConnecting(false);
            setConnected(true);
            setLastUpdate(new Date());
            socket.emit("get_status");
        });

        socket.on("connect_error", (error) => {
            console.error("❌ Connection error:", error);
            setConnecting(false);
            setConnected(false);
        });

        socket.on("disconnect", (reason) => {
            console.log("🔌 Disconnected:", reason);
            setConnected(false);
            setConnecting(false);
        });

        socket.on("reconnect", (attemptNumber) => {
            console.log("🔄 Reconnected after", attemptNumber, "attempts");
            setConnecting(false);
            setConnected(true);
            setLastUpdate(new Date());
            socket.emit("get_status");
        });

        // Lắng nghe event 'connected' từ backend nếu có
        socket.on("connected", (data) => {
            console.log("✅ Backend confirmed connection:", data);
            setConnecting(false);
            setConnected(true);
            setLastUpdate(new Date());
            socket.emit("get_status");

            // Test: Gửi ping để kiểm tra connection
            socket.emit("ping", { message: "Frontend test ping" });
        });

        // Test: Lắng nghe tất cả events để debug
        socket.onAny((eventName, ...args) => {
            console.log(`🔊 Received event: ${eventName}`, args);
            // Đặc biệt chú ý đến log_message event
            if (eventName === 'log_message') {
                console.log('🎯 DETECTED log_message event!', args);
            }
        });

        socket.on("disconnect", () => {
            setConnected(false);
            setConnecting(false);
        });

        // Khi nhận status, chỉ gọi get_logs nếu logs chưa có hoặc FE vừa reconnect
        socket.on("status", (data) => {
            console.log("📊 Received status:", data); // Debug log
            setStatus(data);
            setLastUpdate(new Date());
            Object.keys(data).forEach(category => {
                if (data[category]?.running && (!logsRef.current[category] || logsRef.current[category].length === 0)) {
                    // Chỉ gọi get_logs nếu logs chưa có (lần đầu hoặc reconnect)
                    socket.emit("get_logs", { category, limit: 100 });
                }
            });
            // Clear pending states cho services đã running
            setPendingStart((prev) => {
                const newState = { ...prev };
                Object.keys(data).forEach(category => {
                    if (data[category]?.running) {
                        newState[category] = false;
                        // Gọi get_logs cho services đang running
                        setLoadingLogs((prev) => ({ ...prev, [category]: true }));
                        socket.emit("get_logs", { category, limit: 100 });
                    }
                });
                return newState;
            });
            // Clear loading states cho services đã stop
            setLoadingLogs((prev) => {
                const newState = { ...prev };
                Object.keys(data).forEach(category => {
                    if (!data[category]?.running) {
                        newState[category] = false;
                    }
                });
                return newState;
            });
        });

        // Lắng nghe log_message để nhận log mới realtime
        socket.on("log_message", (data: LogMessage) => {
            console.log("📝 Received log_message:", data); // Debug log
            if (data?.category && data?.message) {
                console.log(`📝 Adding realtime log for ${data.category}:`, data.message);
                // Append log mới vào logs[category] ngay lập tức
                setLogs((prev) => ({
                    ...prev,
                    [data.category]: [...(prev[data.category] || []), data.message].slice(-100) // Keep last 100 messages
                }));

                // Cập nhật lastUpdate để user biết có activity mới
                setLastUpdate(new Date());
            } else {
                console.warn("⚠️ Invalid log_message data:", data);
            }
        });

        // Lắng nghe logs để đồng bộ log lịch sử (khi vừa connect hoặc reconnect)
        socket.on("logs", (data) => {
            console.log("📋 Received logs:", data); // Debug log
            if (data?.category) {
                console.log(`📋 Logs for category "${data.category}":`, data.logs?.length || 0, "entries");
                if (data.logs?.length > 0) {
                    console.log("📋 First few logs:", data.logs.slice(0, 3));
                } else {
                    console.log("⚠️ No logs returned for category:", data.category);
                }
                // Chỉ replace logs nếu đang loadingLogs (tức là do user bấm nút hoặc reconnect)
                setLoadingLogs((prev) => {
                    if (prev[data.category]) {
                        setLogs((logsPrev) => ({ ...logsPrev, [data.category]: data.logs || [] }));
                        return { ...prev, [data.category]: false };
                    }
                    // Nếu không phải do FE chủ động fetch thì bỏ qua, không replace logs
                    return prev;
                });
            }
        });

        socket.on("service_started", (result) => {
            // Backend không gửi category trong result, nên clear tất cả pending states
            console.log(`✅ Service started:`, result.message);
            setPendingStart({});
            // Chỉ cần gọi lại get_status, không gọi get_logs ở đây nữa
            setTimeout(() => {
                socket.emit("get_status");
            }, 500);
        });

        socket.on("service_stopped", (result) => {
            console.log(`⏹️ Service stopped:`, result.message);
            setPendingStart({});
            // Chủ động gọi lại get_status để đảm bảo UI update
            setTimeout(() => {
                socket.emit("get_status");
            }, 500);
        });

        return () => {
            socket.disconnect();
        };
    }, []);

    useEffect(() => {
        console.log("🎯 ServiceMonitor component mounted");
        setComponentKey(Date.now());
    }, []);

    // Debug effect để log state changes
    useEffect(() => {
        console.log("📊 Status updated:", status);
    }, [status]);

    useEffect(() => {
        console.log("📋 Logs updated:", logs);
    }, [logs]);

    useEffect(() => {
        console.log("📝 RealtimeLogs updated:", realtimeLogs);
    }, [realtimeLogs]);

    const handleStart = (category: string) => {
        setPendingStart((prev) => ({ ...prev, [category]: true }));
        socketRef.current?.emit("start_service", { category });
        // Backend sẽ tự động broadcast status và logs, không cần gọi lại

        // Timeout để auto-clear pending state nếu không nhận được response
        setTimeout(() => {
            setPendingStart((prev) => ({ ...prev, [category]: false }));
        }, 2000); // 10 giây timeout
    };

    const handleStop = (category: string) => {
        // Đặt pending state để hiển thị "Đang dừng..."
        setPendingStart((prev) => ({ ...prev, [category]: true }));
        socketRef.current?.emit("stop_service", { category });
        // Backend sẽ tự động broadcast status và logs, nhưng cũng gọi lại để đảm bảo
        setTimeout(() => {
            socketRef.current?.emit("get_status");
        }, 500);
    };

    const handleGetLogs = (category: string) => {
        setLoadingLogs((prev) => ({ ...prev, [category]: true }));
        socketRef.current?.emit("get_logs", { category, limit: 100 });
    };

    const handleRefreshStatus = () => {
        socketRef.current?.emit("get_status");
    };

    const handleTestLogMessage = () => {
        console.log("🧪 Testing log_message manually");
        const testLogMessage = {
            category: "debt",
            service: "test_service",
            message: `[${new Date().toISOString()}] Test log message from frontend`
        };

        // Simulate receiving log_message
        console.log("📝 Simulating log_message:", testLogMessage);
        setRealtimeLogs((prev) => {
            const current = prev[testLogMessage.category] || [];
            const newLogs = [...current, testLogMessage.message].slice(-50);
            return { ...prev, [testLogMessage.category]: newLogs };
        });
        setLastUpdate(new Date());
    };

    const handleClearLogs = (category: string) => {
        setLogs((prev) => ({ ...prev, [category]: [] }));
        setRealtimeLogs((prev) => ({ ...prev, [category]: [] }));
    };

    const serviceCategories = Object.keys(status);
    const hasRunningServices = serviceCategories.some(
        (cat) => status[cat]?.running
    );

    return (
        <div key={componentKey} className="flex flex-col gap-6 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-1">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                            <Server className="size-6 text-primary" />
                            <h1 className="text-2xl font-bold">Service Monitor</h1>
                        </div>
                        <ConnectionStatus
                            isConnected={connected}
                            isConnecting={connecting}
                        />
                    </div>
                    <p className="text-muted-foreground">
                        Quản lý và giám sát các dịch vụ debt management
                    </p>
                </div>

                <div className="flex items-center gap-3">
                    {lastUpdate && (
                        <div className="text-xs text-muted-foreground">
                            Cập nhật lần cuối: {lastUpdate.toLocaleTimeString()}
                        </div>
                    )}
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleTestLogMessage}
                        disabled={!connected}
                    >
                        <Activity className="size-4 mr-2 inline-block" />
                        <span className="leading-none align-middle">Test Log</span>
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRefreshStatus}
                        disabled={!connected}
                    >
                        <RefreshCw className="size-4 mr-2 inline-block" />
                        <span className="leading-none align-middle">Refresh</span>
                    </Button>
                </div>
            </div>

            {/* Overview Stats */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Activity className="size-5" />
                        Tổng quan hệ thống
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng dịch vụ</p>
                                <p className="text-2xl font-bold">{serviceCategories.length}</p>
                            </div>
                            <Server className="size-8 text-muted-foreground" />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-green-50 dark:bg-green-950">
                            <div>
                                <p className="text-sm text-muted-foreground">Đang chạy</p>
                                <p className="text-2xl font-bold text-green-600">
                                    {
                                        serviceCategories.filter((cat) => status[cat]?.running)
                                            .length
                                    }
                                </p>
                            </div>
                            <CheckCircle2 className="size-8 text-green-500" />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg bg-yellow-50 dark:bg-yellow-950">
                            <div>
                                <p className="text-sm text-muted-foreground">Tổng tiến trình</p>
                                <p className="text-2xl font-bold text-yellow-600">
                                    {serviceCategories.reduce(
                                        (sum, cat) => sum + (status[cat]?.process_count || 0),
                                        0
                                    )}
                                </p>
                            </div>
                            <Zap className="size-8 text-yellow-500" />
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Service Cards */}
            <div className="grid gap-6">
                {serviceCategories.length > 0 ? (
                    serviceCategories.map((category) => {
                        const service = status[category];
                        const serviceLogs = logs[category] || [];
                        const combinedLogs = serviceLogs;
                        const color = getColorForCategory(category);
                        return (
                            <Card key={category} className="overflow-hidden">
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 rounded-lg" style={{ background: color + "22" }}>
                                                <Server className="size-5" style={{ color }} />
                                            </div>
                                            <div>
                                                <CardTitle className="text-xl capitalize">
                                                    {category.replace(/_/g, " ")} Service
                                                </CardTitle>
                                                <div className="flex items-center gap-2 mt-1">
                                                    <ServiceStatusIndicator
                                                        status={service?.status || "Unknown"}
                                                        running={service?.running || false}
                                                    />
                                                    {pendingStart[category] && !service?.running && (
                                                        <Badge variant="outline" className="gap-1">
                                                            <RefreshCw className="size-3 text-orange-500 animate-spin" />
                                                            Đang dừng...
                                                        </Badge>
                                                    )}
                                                    {pendingStart[category] && service?.running && (
                                                        <Badge variant="outline" className="gap-1">
                                                            <RefreshCw className="size-3 text-blue-500 animate-spin" />
                                                            Đang khởi động...
                                                        </Badge>
                                                    )}
                                                    {serviceLogs.length > 0 && service?.running && (
                                                        <Badge variant="outline" className="gap-1">
                                                            <Activity className="size-3" style={{ color }} />
                                                            Live
                                                        </Badge>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {service?.running ? (
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleStop(category)}
                                                    disabled={!connected || pendingStart[category]}
                                                >
                                                    <Square className="size-4 mr-2 inline-block" />
                                                    <span className="leading-none align-middle">
                                                        {pendingStart[category] ? "Đang dừng..." : "Stop"}
                                                    </span>
                                                </Button>
                                            ) : (
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    onClick={() => handleStart(category)}
                                                    disabled={!connected || pendingStart[category]}
                                                >
                                                    <Play className="size-4 mr-2 inline-block" />
                                                    <span className="leading-none align-middle">
                                                        {pendingStart[category] ? "Đang khởi động..." : "Start"}
                                                    </span>
                                                </Button>
                                            )}
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => handleGetLogs(category)}
                                                disabled={!connected}
                                            >
                                                <FileText className="size-4 mr-2 inline-block" />
                                                <span className="leading-none align-middle">Logs</span>
                                            </Button>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <ServiceMetrics processCount={service?.process_count || 0} />
                                    <Separator />
                                    <LogViewer
                                        logs={combinedLogs}
                                        title="Service Logs"
                                        loading={loadingLogs[category]}
                                        maxHeight="max-h-80"
                                        isServiceRunning={service?.running || false}
                                        onClearLogs={() => handleClearLogs(category)}
                                    />
                                </CardContent>
                            </Card>
                        );
                    })
                ) : (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <AlertTriangle className="size-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Không có dịch vụ nào</h3>
                            <p className="text-muted-foreground text-center max-w-md">
                                {connecting
                                    ? "Đang kết nối đến server..."
                                    : !connected
                                        ? "Không thể kết nối đến server WebSocket"
                                        : "Server chưa có dịch vụ nào được cấu hình"}
                            </p>
                        </CardContent>
                    </Card>
                )}
            </div>
        </div>
    );
}
