// app/layout.tsx
import type { Metadata } from 'next'
import './globals.css'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import { Providers } from './providers'
import { ThemeToggle } from "../components/theme-toggle";

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Đăng nhập hệ thống',
  description: 'AutoZalo Admin Panel',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head />
      <body
        className={`min-h-0 bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable}`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
          <div className="fixed z-50 bottom-10 right-6">
            <ThemeToggle />
          </div>
        </Providers>
      </body>
    </html>
  )
}
