"use client";

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

const WS_URL = (
  process.env.NEXT_PUBLIC_SERVICE_WS_URL || "http://localhost:5000"
).replace(/\/socket\.io\/?$/, "");

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

export default function ServiceMonitorPage() {
  const [status, setStatus] = useState<Record<string, ServiceStatus>>({});
  const [logs, setLogs] = useState<Record<string, string[]>>({});
  const [realtimeLogs, setRealtimeLogs] = useState<Record<string, string[]>>(
    {}
  );
  const [connecting, setConnecting] = useState(true);
  const [connected, setConnected] = useState(false);
  const [loadingLogs, setLoadingLogs] = useState<Record<string, boolean>>({});
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const [componentKey, setComponentKey] = useState(Date.now());

  useEffect(() => {
    console.log("WS_URL:", WS_URL);
    const socket = io(WS_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;
    setConnecting(true);

    socket.on("connect", () => {
      setConnecting(false);
      setConnected(true);
      setLastUpdate(new Date());
      socket.emit("get_status");
    });

    // Lắng nghe event 'connected' từ backend nếu có
    socket.on("connected", (data) => {
      setConnecting(false);
      setConnected(true);
      setLastUpdate(new Date());
      socket.emit("get_status");
    });

    socket.on("disconnect", () => {
      setConnected(false);
      setConnecting(false);
    });

    socket.on("status", (data) => {
      setStatus(data);
      setLastUpdate(new Date());

      // Auto-fetch logs for running services
      Object.keys(data).forEach((category) => {
        if (data[category]?.running) {
          setLoadingLogs((prev) => ({ ...prev, [category]: true }));
          socket.emit("get_logs", { category, limit: 100 });
        }
      });
    });

    socket.on("logs", (data) => {
      if (data?.category && data?.logs) {
        setLogs((prev) => ({ ...prev, [data.category]: data.logs }));
        setLoadingLogs((prev) => ({ ...prev, [data.category]: false }));
      }
    });

    // Realtime log messages
    socket.on("log_message", (data: LogMessage) => {
      if (data?.category && data?.message) {
        setRealtimeLogs((prev) => {
          const current = prev[data.category] || [];
          const newLogs = [...current, data.message].slice(-50); // Keep last 50 messages
          return { ...prev, [data.category]: newLogs };
        });
      }
    });

    socket.on("service_started", (result) => {
      socket.emit("get_status");
      // Auto-fetch logs for the started service
      if (result.success && result.category) {
        setTimeout(() => {
          setLoadingLogs((prev) => ({ ...prev, [result.category]: true }));
          socket.emit("get_logs", { category: result.category, limit: 100 });
        }, 1000); // Wait 1 second for service to initialize
      }
    });

    socket.on("service_stopped", (result) => {
      socket.emit("get_status");
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    setComponentKey(Date.now());
  }, []);

  const handleStart = (category: string) => {
    socketRef.current?.emit("start_service", { category });
    // Auto-fetch logs after starting service
    setTimeout(() => {
      setLoadingLogs((prev) => ({ ...prev, [category]: true }));
      socketRef.current?.emit("get_logs", { category, limit: 100 });
    }, 2000); // Wait 2 seconds for service to start and generate logs
  };

  const handleStop = (category: string) => {
    socketRef.current?.emit("stop_service", { category });
  };

  const handleGetLogs = (category: string) => {
    setLoadingLogs((prev) => ({ ...prev, [category]: true }));
    socketRef.current?.emit("get_logs", { category, limit: 100 });
  };

  const handleRefreshStatus = () => {
    socketRef.current?.emit("get_status");
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
            const realtime = realtimeLogs[category] || [];
            const combinedLogs = [...serviceLogs, ...realtime];

            return (
              <Card key={category} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Server className="size-5 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-xl capitalize">
                          {category.replace("_", " ")} Service
                        </CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          <ServiceStatusIndicator
                            status={service?.status || "Unknown"}
                            running={service?.running || false}
                          />
                          {realtime.length > 0 && (
                            <Badge variant="outline" className="gap-1">
                              <Activity className="size-3 text-blue-500 animate-pulse" />
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
                          disabled={!connected}
                        >
                          <Square className="size-4 mr-2 inline-block" />
                          <span className="leading-none align-middle">
                            Stop
                          </span>
                        </Button>
                      ) : (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleStart(category)}
                          disabled={!connected}
                        >
                          <Play className="size-4 mr-2 inline-block" />
                          <span className="leading-none align-middle">
                            Start
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
                  {/* Service Metrics */}
                  <ServiceMetrics processCount={service?.process_count || 0} />

                  <Separator />

                  {/* Log Viewer */}
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
