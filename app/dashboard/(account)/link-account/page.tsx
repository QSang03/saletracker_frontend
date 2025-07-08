"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import LinkAccountContent from "@/components/account/link-account/LinkAccountContent";
import { Link2 } from "lucide-react";
import type { User } from "@/types";

// Nhận props từ layout (Next.js app router sẽ truyền currentUser qua cloneElement)
export default function LinkAccountPage(props: { currentUser: User | null; debugLabel?: string }) {
  const { currentUser, debugLabel } = props;
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
          <LinkAccountContent debugLabel={debugLabel} />
        </CardContent>
      </Card>
    </div>
  );
}
