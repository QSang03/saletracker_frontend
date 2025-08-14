"use client";

import { TokenRefreshProvider } from "@/components/providers/TokenRefreshProvider";
import { CurrentUserProvider } from "@/components/providers/CurrentUserProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/contexts/AuthContext';

import { WebSocketProvider } from '@/contexts/WebSocketContext';

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  // Force theme to light in localStorage on every render
  if (typeof window !== "undefined") {
    localStorage.setItem("theme", "light");
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  }
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <AuthProvider>
        <CurrentUserProvider>
          <TokenRefreshProvider>
            <WebSocketProvider>
              {children}
            </WebSocketProvider>
          </TokenRefreshProvider>
        </CurrentUserProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
