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
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
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
