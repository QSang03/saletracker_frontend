"use client";

import { useState, useEffect } from "react";
import { ChartBarDeals } from "@/components/dashboard/ChartBarDeals";
import { LoadingSpinner } from "@/components/ui/loading/loading-spinner";

export default function TransactionsPage() {
  const [isLoading, setIsLoading] = useState(true);
  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1000);
    return () => clearTimeout(timer);
  }, []);
  return (
    <main className="flex flex-col gap-4 pt-0 pb-0">
      <div className="bg-muted text-muted-foreground rounded-xl md:min-h-min">
        <div className="rounded-xl border bg-background p-4 shadow-sm h-auto overflow-hidden">
          <h1 className="text-xl font-bold mb-4">📊 Thống kê giao dịch</h1>
          {isLoading ? <LoadingSpinner size={48} /> : <ChartBarDeals />}
        </div>
      </div>
    </main>
  );
}
