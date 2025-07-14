"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function ZaloPage() {
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Cài đặt Zalo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Trang cài đặt Zalo đang phát triển...</p>
        </CardContent>
      </Card>
    </div>
  );
}