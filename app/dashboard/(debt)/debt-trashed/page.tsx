"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export default function DebtTrashedPage() {
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Thùng rác công nợ
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p>Trang thùng rác công nợ đang phát triển...</p>
        </CardContent>
      </Card>
    </div>
  );
}