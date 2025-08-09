"use client";

import React, { Suspense } from "react";
import dynamic from "next/dynamic";

const TrashedOrderDetailTable = dynamic(
  () => import("@/components/order/order-trashed/TrashedOrderDetailTable"),
  { ssr: false }
);

function Loading() {
  return <div className="p-6">Đang tải...</div>;
}

export default function OrderTrashedPage() {
  return (
    <Suspense fallback={<Loading />}> 
      <TrashedOrderDetailTable />
    </Suspense>
  );
}
