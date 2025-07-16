"use client";

import ZaloManager from "@/components/zalo/ZaloManager";

export default function ZaloPage() {
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <ZaloManager />
    </div>
  );
}