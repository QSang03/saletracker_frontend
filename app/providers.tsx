"use client";

import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from '@/contexts/AuthContext';

type Props = {
  children: React.ReactNode;
};

export function Providers({ children }: Props) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
      {children}
      </AuthProvider>
    </ThemeProvider>
  );
}
