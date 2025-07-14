"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProductTable from "@/components/products/ProductTable";

export default function ProductsManagerPage() {
  return (
    <div className="flex flex-col gap-4 pt-0 pb-4 min-h-[calc(100vh-4rem)]">
      <Card className="w-full flex-1">
        <CardHeader>
          <CardTitle className="text-xl font-bold">
            Quản lý sản phẩm
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ProductTable />
        </CardContent>
      </Card>
    </div>
  );
}