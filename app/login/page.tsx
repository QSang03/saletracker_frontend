"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Eye, EyeOff } from "lucide-react";

import { Input } from "@/components/ui/custom/input";
import { Button } from "@/components/ui/buttons/LoginButton";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/custom/card";
import { LoadingSpinner } from "@/components/ui/custom/loading-spinner";

export default function LoginPage() {
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
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();

      if (res.ok && data.access_token) {
        const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        document.cookie = `access_token=${
          data.access_token
        }; expires=${expires.toUTCString()}; path=/; SameSite=Lax${
          location.protocol === "https:" ? "; Secure" : ""
        }`;

        toast.success("🎉 Đăng nhập thành công!");

        window.location.href = callbackUrl;
      } else {
        toast.error("Đăng nhập thất bại", {
          description: data.message || "Sai tên đăng nhập hoặc mật khẩu",
        });
      }
    } catch (err) {
      toast.error("Lỗi hệ thống", { description: String(err) });
    }
    setLoading(false);
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

          <CardContent className="space-y-4" onKeyDown={handleKeyDown}>
            <Input
              type="text"
              placeholder="👤 Tên đăng nhập"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              disabled={loading}
              className="w-[300px] mx-auto px-4 py-2 rounded-xl bg-white/60 dark:bg-gray-900/60 text-sm shadow-inner backdrop-blur-md border border-transparent focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-400 transition-all duration-300"
              autoComplete="username"
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
