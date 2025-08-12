"use client";

import dynamic from "next/dynamic";

const HiddenOrderPage = dynamic(
  () => import("@/components/order/order-hidden/HiddenOrderPage"),
  { ssr: false }
);

export default function OrderHiddenPage() {
  return <HiddenOrderPage />;
}
