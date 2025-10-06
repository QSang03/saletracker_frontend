'use client'

import React from 'react'

export default function ZaloChatRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="vi">
      <body className="h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  )
}
