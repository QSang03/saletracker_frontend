"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";
import {
  setAccessToken,
  clearAccessToken,
  setRefreshToken,
  clearAllTokens,
  getAccessToken,
  getRefreshToken,
} from "@/lib/auth";

import { Input } from "@/components/ui/custom/input";
import { Button } from "@/components/ui/buttons/LoginButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/custom/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";

function LoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = "/dashboard/transactions";

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    const debugLogs: string[] = [];

    try {
      debugLogs.push(
        `🔄 [Login] Starting login request at ${new Date().toISOString()}`
      );

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json; charset=utf-8",
        },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      debugLogs.push(`📊 [Login] Response status: ${res.status}`);
      debugLogs.push(
        `📊 [Login] Response headers: ${JSON.stringify(
          Object.fromEntries(res.headers.entries())
        )}`
      );

      if (!res.ok) {
        const errorData = await res.json();
        debugLogs.push(`❌ [Login] Login failed: ${JSON.stringify(errorData)}`);
        throw new Error(errorData.message || "Login failed");
      }

      const data = await res.json();
      debugLogs.push(
        `✅ [Login] Response data received: ${JSON.stringify({
          hasAccessToken: !!data.access_token,
          hasRefreshToken: !!data.refresh_token,
          hasUser: !!data.user,
          userIsBlock: data.user?.isBlock,
          accessTokenLength: data.access_token?.length,
        })}`
      );

      if (data.user && data.user.isBlock) {
        debugLogs.push("⚠️ [Login] User is blocked");
        localStorage.setItem("loginDebugLogs", JSON.stringify(debugLogs));
        clearAllTokens();
        toast.error(
          "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên!"
        );
        return;
      }

      if (!data.access_token || !data.refresh_token || !data.user) {
        debugLogs.push(
          `❌ [Login] Missing required data: ${JSON.stringify({
            hasAccessToken: !!data.access_token,
            hasRefreshToken: !!data.refresh_token,
            hasUser: !!data.user,
          })}`
        );
        localStorage.setItem("loginDebugLogs", JSON.stringify(debugLogs));
        clearAllTokens();
        toast.error("Đăng nhập thất bại", {
          description: "Phản hồi từ server không đầy đủ",
        });
        return;
      }

      debugLogs.push("🔄 [Login] Setting tokens...");

      const cleanAccessToken = data.access_token.trim();
      const cleanRefreshToken = data.refresh_token.trim();

      clearAllTokens();
      await new Promise((resolve) => setTimeout(resolve, 100));

      setAccessToken(cleanAccessToken);
      setRefreshToken(cleanRefreshToken);

      await new Promise((resolve) => setTimeout(resolve, 200));

      const verifyAccess = getAccessToken();
      const verifyRefresh = getRefreshToken();

      const verificationResult = {
        accessTokenSet: !!verifyAccess,
        refreshTokenSet: !!verifyRefresh,
        accessTokenMatches: verifyAccess === cleanAccessToken,
        refreshTokenMatches: verifyRefresh === cleanRefreshToken,
        accessTokenLength: verifyAccess?.length,
        refreshTokenLength: verifyRefresh?.length,
        domain: window.location.hostname,
        protocol: window.location.protocol,
      };

      debugLogs.push(
        `🔍 [Login] Token verification: ${JSON.stringify(verificationResult)}`
      );

      if (!verifyAccess || !verifyRefresh) {
        debugLogs.push("❌ [Login] Failed to set tokens in cookies");
        debugLogs.push(
          `❌ [Login] Cookie verification failed: ${JSON.stringify({
            expectedAccessToken: cleanAccessToken.substring(0, 50) + "...",
            actualAccessToken: verifyAccess
              ? verifyAccess.substring(0, 50) + "..."
              : "null",
            cookieString: document.cookie.substring(0, 200) + "...",
          })}`
        );

        // Lưu debug logs trước khi return
        localStorage.setItem("loginDebugLogs", JSON.stringify(debugLogs));

        toast.error("Không thể lưu thông tin đăng nhập", {
          description: "Vui lòng kiểm tra cài đặt trình duyệt và thử lại",
        });
        return;
      }

      debugLogs.push("✅ [Login] Login successful, tokens verified");

      // Lưu debug logs TRƯỚC KHI redirect
      localStorage.setItem("loginDebugLogs", JSON.stringify(debugLogs));
      localStorage.setItem("loginSuccess", "true");
      localStorage.setItem("loginTimestamp", new Date().toISOString());

      toast.success("🎉 Đăng nhập thành công!");

      const passwordDefault = process.env.NEXT_PUBLIC_PASSWORD_DEFAULT;
      const isDefaultPassword = passwordDefault && password === passwordDefault;

      if (isDefaultPassword) {
        localStorage.setItem("requireChangePassword", "true");
      } else {
        localStorage.removeItem("requireChangePassword");
      }

      // Redirect với delay
      setTimeout(() => {
        window.location.href = callbackUrl;
      }, 300);
    } catch (err: any) {
      debugLogs.push(
        `❌ [Login] Login process failed: ${JSON.stringify({
          error: err.message,
          stack: err.stack?.substring(0, 200),
          response: err.response?.data,
        })}`
      );

      // Lưu debug logs khi có lỗi
      localStorage.setItem("loginDebugLogs", JSON.stringify(debugLogs));
      localStorage.setItem(
        "loginError",
        JSON.stringify({
          message: err.message,
          timestamp: new Date().toISOString(),
        })
      );

      clearAllTokens();
      toast.error("Lỗi hệ thống", {
        description: err.message || String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-pink-100 to-purple-200 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 px-5">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Card className="rounded-3xl backdrop-blur-sm bg-white/70 dark:bg-background/70 shadow-xl border-none animate-in fade-in zoom-in-75">
          <CardHeader className="text-center space-y-2 relative">
            <div className="flex justify-center items-center">
              <motion.span
                className="text-xl md:text-2xl font-extrabold bg-gradient-to-r from-pink-500 via-yellow-500 to-indigo-500 bg-clip-text text-transparent"
                style={{
                  backgroundSize: "200% auto",
                  backgroundImage:
                    "linear-gradient(90deg, #ec4899, #facc15, #6366f1)",
                }}
                animate={{ backgroundPosition: ["0% center", "100% center"] }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  repeatType: "reverse",
                  ease: "easeInOut",
                }}
              >
                SaleTracker v2.0
              </motion.span>
            </div>
            <CardTitle className="text-2xl font-extrabold text-gray-800 dark:text-white">
              Đăng nhập hệ thống
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            <Input
              type="text"
              placeholder="👤 Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-[300px] mx-auto px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-900/60 text-sm shadow-inner backdrop-blur-md border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 transition-all duration-300"
              autoComplete="username"
              onKeyDown={handleKeyDown}
            />

            <div className="relative w-[300px] mx-auto">
              <Input
                type={showPassword ? "text" : "password"}
                placeholder="🔒 Mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="w-full px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-900/60 text-sm shadow-inner backdrop-blur-md border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-400 transition-all duration-300"
                autoComplete="current-password"
                onKeyDown={handleKeyDown}
              />
              <motion.button
                type="button"
                whileTap={{ scale: 0.9 }}
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-indigo-600 dark:hover:text-indigo-300"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </motion.button>
            </div>

            {loading ? (
              <LoadingSpinner label="Đang đăng nhập..." duration={1.5} />
            ) : (
              <motion.div
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                whileTap={{ scale: 0.97 }}
                className="flex justify-center"
              >
                <Button
                  className="w-[200px] bg-gradient-to-r from-indigo-500 via-pink-500 to-purple-500 bg-[length:200%_auto] hover:scale-[1.03] transition-all duration-300 ease-in-out text-white font-semibold rounded-xl shadow-md cursor-pointer"
                  onClick={handleLogin}
                  disabled={!username || !password || loading}
                >
                  Đăng nhập
                </Button>
              </motion.div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <LoadingSpinner size={32} />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
