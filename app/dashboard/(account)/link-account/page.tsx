"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import LinkAccountContent from "@/components/account/link-account/LinkAccountContent";
import { Link2 } from "lucide-react";

// Next.js page components không nhận props tuỳ chỉnh
export default function LinkAccountPage() {
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <Link2 className="w-6 h-6 text-primary" />
            Liên kết tài khoản Zalo
          </CardTitle>
        </CardHeader>
        <CardContent>
          <LinkAccountContent />
        </CardContent>
      </Card>
    </div>
  );
}
