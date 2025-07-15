"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/contexts/AuthContext';
import { TokenRefreshProvider } from '@/components/providers/TokenRefreshProvider';

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <TokenRefreshProvider>
          {children}
        </TokenRefreshProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
