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
    <html lang="vi" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body
        className={`min-h-0 bg-background text-foreground antialiased ${geistSans.variable} ${geistMono.variable}`}
      >
        <Providers>
          {children}
          <Toaster position="top-center" richColors />
        </Providers>
      </body>
    </html>
  )
}
