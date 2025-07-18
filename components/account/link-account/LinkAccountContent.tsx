import { useCallback, useMemo, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { ServerResponseAlert } from "@/components/ui/loading/ServerResponseAlert";
import type { User } from "@/types";
import { useCurrentUser } from "@/contexts/CurrentUserContext";
import type { AlertType } from "@/components/ui/loading/ServerResponseAlert";
import { getAccessToken, getUserFromToken } from "@/lib/auth";
import { LoadingSpinner } from "@/components/ui/loading/loading-spinner";
import ConfirmDialog from "@/components/ui/ConfirmDialog";

const VALID_ALERT_TYPES: AlertType[] = [
  "success",
  "error",
  "warning",
  "confirm",
  "loading",
  "info",
  "default",
];

export default function LinkAccountContent({
  debugLabel,
}: {
  debugLabel?: string;
}) {
  const { currentUser, setCurrentUser } = useCurrentUser();
  const [alerts, setAlerts] = useState<
    Array<{ type: AlertType; message: string }>
  >([]);
  const [qrData, setQrData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isLinked, setIsLinked] = useState(false);
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const pingInterval = useRef<NodeJS.Timeout | null>(null);

  const qrTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const zaloAvatar = useMemo(() => currentUser?.avatarZalo || null, [currentUser?.avatarZalo]);
  const zaloName = useMemo(() => currentUser?.zaloName || null, [currentUser?.zaloName]);

  const refreshUserToken = useCallback(async () => {
    if (!currentUser?.id) return;
    const token = getAccessToken();
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
    try {
      const res = await fetch(`${apiUrl}/auth/refresh-after-update`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.access_token) {
          // Import function để set access token
          const { setAccessToken } = await import("@/lib/auth");
          
          // Chỉ cập nhật access token, giữ nguyên refresh token
          setAccessToken(data.access_token);
          
          // Cập nhật current user từ JWT token mới
          const updatedUser = getUserFromToken(data.access_token);
          if (updatedUser) {
            setCurrentUser(updatedUser);
          } else {
            console.error("❌ [LinkAccount] Failed to parse user from token");
          }
        }
      }
    } catch (error) {
      console.error("❌ [LinkAccount] Failed to refresh token:", error);
    }
  }, [currentUser?.id, setCurrentUser]);

  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      if (pingInterval.current) clearInterval(pingInterval.current);
      clearQrTimeout();
    };
  }, []);

  const startPing = () => {
    if (pingInterval.current) clearInterval(pingInterval.current);
    pingInterval.current = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === 1) {
        wsRef.current.send(JSON.stringify({ type: "ping" }));
      } else {
        stopPing();
        addAlert({
          type: "error",
          message: "Mất kết nối đến máy chủ liên kết!",
        });
        setLoading(false);
      }
    }, 20000);
  };
  const stopPing = () => {
    if (pingInterval.current) {
      clearInterval(pingInterval.current);
      pingInterval.current = null;
    }
  };

  const clearQrTimeout = () => {
    if (qrTimeoutRef.current) {
      clearTimeout(qrTimeoutRef.current);
      qrTimeoutRef.current = null;
    }
  };

  const addAlert = (alert: { type: AlertType; message: string }) => {
    setAlerts((prev) => [...prev, alert]);
  };

  const updateZaloLinkStatus = async (
    status: number,
    zaloName?: string | null,
    avatarZalo?: string | null
  ) => {
    if (!currentUser) return;
    try {
      const token = getAccessToken();
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || "";
      const response = await fetch(`${apiUrl}/users/${currentUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          zaloLinkStatus: status,
          zaloName,
          avatarZalo,
        }),
      });
      
      if (response.ok) {
        // Gọi refresh token để cập nhật thông tin Zalo trong JWT
        await refreshUserToken();
      }
    } catch (e) {
      // ignore
    }
  };

  const WS_URL = process.env.NEXT_PUBLIC_ZALO_WS_URL || "";
  const UNLINK_WEBHOOK_URL = process.env.NEXT_PUBLIC_ZALO_UNLINK_URL || "";
  
  const stopAllConnections = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    stopPing();
    clearQrTimeout();
  };

  const handleLinkAccount = () => {
    if (!currentUser || !currentUser.username) {
      addAlert({
        type: "error",
        message: "Không tìm thấy thông tin tài khoản!",
      });
      stopAllConnections();
      return;
    }
    setLoading(true);
    setAlerts([{ type: "info", message: "Đang lấy mã QR..." }]);
    setQrData(null);
    setIsLinked(false);
    updateZaloLinkStatus(0);
    stopAllConnections();
    const ws = new window.WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "start_login",
          username: currentUser.username,
          userId: currentUser.id,
        })
      );
      startPing();
      clearQrTimeout();
      qrTimeoutRef.current = setTimeout(() => {
        stopAllConnections();
        setQrData(null);
        setLoading(false);
        setIsLinked(false);
        setAlerts([{ type: 'warning', message: 'Mã QR đã hết hạn do không quét trong 1 phút. Vui lòng thử lại.' }]);
        updateZaloLinkStatus(0);
      }, 60000);
    };
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "qr_code" && msg.data) {
          setQrData(`data:image/png;base64,${msg.data}`);
          setLoading(false);
          setAlerts([
            {
              type: "success",
              message: "Lấy thành công mã QR. Vui lòng quét mã bằng Zalo App.",
            },
          ]);
        } else if (msg.type === "status") {
          switch (msg.message) {
            case 'CONNECTED':
              setAlerts([{ type: 'success', message: 'Đã kết nối thành công tới máy chủ liên kết Zalo.' }]);
              break;
            case 'LOGIN_STARTED':
              setAlerts([{ type: 'info', message: 'Quy trình liên kết Zalo đã bắt đầu. Vui lòng mở ứng dụng Zalo và quét mã QR bên dưới để tiếp tục.' }]);
              setLoading(false);
              break;
            case 'LOGIN_STOPPED':
              setAlerts([{ type: 'warning', message: 'Quy trình liên kết đã được dừng. Nếu bạn muốn tiếp tục, hãy bắt đầu lại.' }]);
              setLoading(false);
              setQrData(null);
              stopAllConnections();
              break;
            case 'QR_EXPIRED':
              setAlerts([{ type: 'warning', message: 'Mã QR đã hết hạn. Vui lòng nhấn "Liên kết tài khoản Zalo" để lấy mã mới và đảm bảo quét trong thời gian hiệu lực.' }]);
              setLoading(false);
              setQrData(null);
              setIsLinked(false);
              updateZaloLinkStatus(0);
              stopAllConnections();
              break;
            case 'QR_SCANNED':
              setAlerts([{ type: 'info', message: `Đã quét mã QR${msg.data?.displayName ? ' bởi ' + msg.data.displayName : ''}. Đang xác thực thông tin, vui lòng chờ trong giây lát...` }]);
              setLoading(true);
              break;
            case 'PROCESSING':
              setAlerts([{ type: 'info', message: 'Đang xử lý liên kết tài khoản Zalo...' }]);
              setLoading(true);
              break;
            case 'QR_AVAILABLE':
              setAlerts([{ type: 'info', message: 'Mã QR mới đã sẵn sàng. Hãy sử dụng ứng dụng Zalo để quét lại và hoàn tất liên kết.' }]);
              setLoading(false);
              break;
            case 'LOGIN_SUCCESS':
              setAlerts([{ type: 'success', message: 'Liên kết tài khoản Zalo thành công! Bạn đã có thể sử dụng các tính năng nâng cao.' }]);
              setLoading(false);
              setTimeout(() => {
                stopAllConnections();
              }, 10000);
              break;
            case 'LOGIN_FAILED':
              setAlerts([{ type: 'error', message: 'Liên kết thất bại: ' + (msg.data?.reason || 'Đã xảy ra lỗi không xác định. Vui lòng thử lại hoặc liên hệ hỗ trợ.') }]);
              setLoading(false);
              setQrData(null);
              stopAllConnections();
              break;
            case 'SESSION_DELETED':
              setAlerts([{ type: 'success', message: 'Phiên đăng nhập đã được xóa thành công.' }]);
              break;
            default:
              setAlerts([{ type: 'info', message: 'Trạng thái hệ thống: ' + msg.message }]);
          }
        } else if (msg.type === "login_processing") {
          setAlerts([{ type: "info", message: "Hệ thống đang tiến hành liên kết tài khoản Zalo của bạn. Vui lòng chờ trong giây lát và không đóng trang này." }]);
          setLoading(true);
        } else if (msg.type === "login_complete") {
          setAlerts([{ type: "success", message: "Liên kết tài khoản Zalo thành công! Chào mừng bạn đến với hệ sinh thái tự động hóa của chúng tôi." }]);
          setIsLinked(true);
          setQrData(null);
          setLoading(false);
          stopPing();
          if (msg.data && msg.data.avatar) {
            setUserAvatar(msg.data.avatar);
          }
          updateZaloLinkStatus(1, msg.data?.zaloUsername, msg.data?.avatar);
          // Refresh token để cập nhật thông tin Zalo trong JWT
          refreshUserToken();
          ws.close();
        } else if (msg.type === "error") {
          setAlerts([
            { type: "error", message: msg.message || "Đã xảy ra lỗi trong quá trình liên kết. Vui lòng thử lại hoặc liên hệ bộ phận hỗ trợ để được trợ giúp." },
          ]);
          setLoading(false);
          setIsLinked(false);
          setQrData(null);
          updateZaloLinkStatus(0);
          stopAllConnections();
        }
      } catch (e) {
        setAlerts([
          { type: "error", message: "Lỗi xử lý dữ liệu từ máy chủ!" },
        ]);
        setLoading(false);
        setIsLinked(false);
        setQrData(null);
        updateZaloLinkStatus(0);
        stopAllConnections();
      }
    };
    ws.onerror = () => {
      setAlerts([
        { type: "error", message: "Không thể kết nối máy chủ liên kết!" },
      ]);
      setLoading(false);
      stopAllConnections();
    };
    ws.onclose = () => {
      stopAllConnections();
    };
  };

  const handleUnlink = async () => {
    setShowConfirm(false);
    setLoading(true);
    setAlerts([{ type: 'info', message: 'Đang xử lý yêu cầu hủy liên kết Zalo...' }]);
    let wsError = false;
    let wsUnlinkSuccess = false;
    if (wsRef.current && wsRef.current.readyState === 1) {
      try {
        wsRef.current.send(JSON.stringify({ type: "stop_login" }));
        wsRef.current.onmessage = (event) => {
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "unlink_success") {
              wsUnlinkSuccess = true;
              setLoading(false);
              setAlerts([{ type: 'success', message: 'Đã hủy liên kết.' }]);
              doUnlinkWebhookAndUpdate();
            } else if (msg.type === "unlink_error") {
              wsError = true;
              setLoading(false);
              addAlert({ type: "error", message: msg.message || "Hủy liên kết thất bại (websocket)!" });
            }
          } catch (e) {
            wsError = true;
            setLoading(false);
            addAlert({ type: "error", message: "Lỗi xử lý phản hồi hủy liên kết từ websocket!" });
          }
        };
        setTimeout(() => {
          if (!wsUnlinkSuccess && !wsError) {
            wsError = true;
            setLoading(false);
            addAlert({ type: "error", message: "Không nhận được phản hồi hủy liên kết từ websocket!" });
          }
        }, 5000);
        wsRef.current.close();
      } catch (e) {
        wsError = true;
        setLoading(false);
        addAlert({ type: "error", message: "Lỗi khi gửi stop_login qua websocket." });
      }
    } else {
      setLoading(false);
      doUnlinkWebhookAndUpdate();
    }
    stopPing();
    setQrData(null);
    setIsLinked(false);
  };

  const doUnlinkWebhookAndUpdate = async () => {
    let webhookError = false;
    let webhookSuccess = false;
    if (currentUser?.id && currentUser?.username) {
      try {
        const res = await fetch(`${UNLINK_WEBHOOK_URL}/${currentUser.id}/${currentUser.username}`, {
          method: "DELETE",
        });
        let json = null;
        try {
          json = await res.json();
        } catch {}
        if (!res.ok || !json?.success) {
          webhookError = true;
          setLoading(false);
          addAlert({ type: "error", message: json?.message || "Hủy liên kết thất bại (webhook)!" });
        } else {
          webhookSuccess = true;
          setLoading(false);
          setAlerts((prev) => prev.some(a => a.type === 'success' && a.message === 'Đã hủy liên kết.') ? prev : [{ type: 'success', message: 'Đã hủy liên kết.' }]);
        }
      } catch (e) {
        webhookError = true;
        setLoading(false);
        addAlert({ type: "error", message: "Lỗi khi gọi webhook hủy liên kết!" });
      }
    }
    if (webhookSuccess) {
      updateZaloLinkStatus(0, null, null);
      refreshUserToken();
    }
  };

  useEffect(() => {
    if (isLinked) {
      refreshUserToken();
    }
  }, [isLinked, refreshUserToken]);

  // Đảm bảo hiển thị loading khi đang chờ currentUser
  if (!currentUser) {
    return (
      <LoadingSpinner message="Đang tải thông tin tài khoản..." size={48} fullScreen={false} />
    );
  }

  const zaloLinkStatus = currentUser?.zaloLinkStatus ?? 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[75vh] w-full">
      {/* Thông báo đặc biệt khi zaloLinkStatus = 2 */}
      {zaloLinkStatus === 2 && (
        <div className="w-full max-w-3xl mb-4">
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 20 20">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 11V6m0 8h.01M19 10a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"/>
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Lỗi liên kết tài khoản Zalo
                </h3>
                <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                  Tài khoản Zalo của bạn đã bị ngắt kết nối. Vui lòng liên kết lại để tiếp tục sử dụng hệ thống.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="w-full max-w-3xl bg-white dark:bg-zinc-900 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-8 flex flex-col md:flex-row gap-8">
        <div className="flex-1 flex flex-col gap-6 justify-center items-center border-r border-zinc-200 dark:border-zinc-800 pr-0 md:pr-8">
          <h2 className="text-2xl font-bold text-center text-primary flex items-center justify-center gap-2">
            <span className="inline-block bg-primary/10 rounded-full p-2">
              <svg width="28" height="28" fill="none" viewBox="0 0 24 24">
                <path
                  d="M17 17v.01M7 17v.01M12 17v.01M12 3C7.03 3 3 7.03 3 12c0 2.39 1.05 4.54 2.88 6.13.36.3.57.76.5 1.22l-.24 1.53a1 1 0 0 0 1.15 1.15l1.53-.24c.46-.07.92.14 1.22.5A8.96 8.96 0 0 0 12 21c4.97 0 9-4.03 9-9s-4.03-9-9-9Z"
                  stroke="#2563eb"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            Liên kết tài khoản Zalo
          </h2>
          {alerts.length > 0 && (
            <div className="flex flex-col gap-2 mb-2 w-full">
              {alerts.map((alert, idx) => (
                <ServerResponseAlert
                  key={idx}
                  type={alert.type}
                  message={alert.message}
                  onClose={() =>
                    setAlerts((prev) => prev.filter((_, i) => i !== idx))
                  }
                />
              ))}
            </div>
          )}
          <div className="flex flex-col items-center gap-6 w-full">
            {qrData ? (
              <div className="flex flex-col items-center gap-2 mb-4">
                <img
                  src={qrData}
                  alt="QR Code"
                  className="w-48 h-48 object-contain border rounded-lg shadow"
                />
                <span className="text-sm text-zinc-500 mt-2">
                  Quét mã QR bằng Zalo App để liên kết
                </span>
              </div>
            ) : zaloLinkStatus === 1 ? (
              <>
                <Button
                  variant="delete"
                  size="lg"
                  onClick={() => setShowConfirm(true)}
                  className="w-44 h-12 text-base font-semibold shadow-md px-6 py-2"
                >
                  Hủy liên kết
                </Button>
                <ConfirmDialog
                  isOpen={showConfirm}
                  title="Xác nhận hủy liên kết Zalo"
                  message="Bạn có chắc chắn muốn hủy liên kết tài khoản Zalo?"
                  onConfirm={handleUnlink}
                  onCancel={() => setShowConfirm(false)}
                />
                <p className="text-xs text-zinc-400 mt-2 text-center">Tài khoản đã liên kết thành công với Zalo. Bạn có thể hủy liên kết bất cứ lúc nào.</p>
              </>
            ) : zaloLinkStatus === 0 || zaloLinkStatus === 2 ? (
              <>
                <Button
                  variant="add"
                  size="lg"
                  onClick={handleLinkAccount}
                  disabled={loading}
                  className="w-44 h-12 text-base font-semibold shadow-md px-6 py-2"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin inline-block w-5 h-5 border-2 border-primary border-t-transparent rounded-full"></span>{" "}
                      Đang kết nối...
                    </span>
                  ) : (
                    <span>{zaloLinkStatus === 2 ? 'Liên kết lại Zalo' : 'Liên kết tài khoản Zalo'}</span>
                  )}
                </Button>
                <p className="text-xs text-zinc-400 mt-2 text-center">
                  {zaloLinkStatus === 2 
                    ? 'Tài khoản Zalo gặp lỗi liên kết. Nhấn nút để liên kết lại.' 
                    : 'Chưa liên kết Zalo. Nhấn nút để bắt đầu quá trình liên kết.'
                  }
                </p>
              </>
            ) : null}
          </div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 min-w-[220px]">
          <div
            className={
              "avatar-gradient-border p-[6px] shadow-lg w-36 h-36 flex items-center justify-center rounded-full transition-all duration-500"
            }
          >
            <div className="w-32 h-32 rounded-full bg-white dark:bg-zinc-900 overflow-hidden flex items-center justify-center">
              {zaloLinkStatus === 1 && zaloAvatar ? (
                <img
                  src={zaloAvatar}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              ) : (
                <svg width="64" height="64" fill="none" viewBox="0 0 24 24">
                  <circle
                    cx="12"
                    cy="8"
                    r="4"
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                  <path
                    d="M4 20c0-2.21 3.58-4 8-4s8 1.79 8 4"
                    stroke="#64748b"
                    strokeWidth="2"
                  />
                </svg>
              )}
            </div>
          </div>
          <div className="flex flex-col items-center mt-2">
            <span className="font-semibold text-lg text-zinc-800 dark:text-zinc-100">
              {zaloLinkStatus === 1 && zaloName
                ? zaloName
                : zaloLinkStatus === 2 
                  ? "Lỗi liên kết"
                  : "Chưa liên kết"}
            </span>
            <span className="text-sm text-zinc-500 dark:text-zinc-400">
              {zaloLinkStatus === 1 && currentUser.email
                ? currentUser.email
                : zaloLinkStatus === 2
                  ? "Cần liên kết lại để sử dụng"
                  : "Vui lòng liên kết để hiển thị thông tin"}
            </span>
            <p className="text-xs text-zinc-400 mt-2 text-center max-w-[220px]">
              {zaloLinkStatus === 1
                ? "Bạn đã liên kết thành công với Zalo. Thông tin tài khoản sẽ được đồng bộ tự động."
                : zaloLinkStatus === 2
                  ? "Tài khoản Zalo gặp lỗi liên kết. Vui lòng liên kết lại để tiếp tục sử dụng."
                  : "Liên kết Zalo để hiển thị avatar và tên tài khoản Zalo tại đây."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
