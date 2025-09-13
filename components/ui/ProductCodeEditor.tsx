"use client";

import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Edit2, Check, X, Search, Package, Tag, Building2 } from "lucide-react";
import { getAccessToken } from "@/lib/auth";

interface Product {
  id: number;
  productCode: string;
  productName: string;
  description?: string;
  category?: {
    id: number;
    catName: string;
    slug: string;
  };
  brand?: {
    id: number;
    name: string;
    slug: string;
  };
}

interface ProductCodeEditorProps {
  currentProductCode: string;
  orderDetailId: number;
  onUpdate: (newProductCode: string) => void;
  onOpen?: () => void;
  onClose?: () => void;
  disabled?: boolean;
}

export default function ProductCodeEditor({
  currentProductCode,
  orderDetailId,
  onUpdate,
  onOpen,
  onClose,
  disabled = false,
}: ProductCodeEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [customCode, setCustomCode] = useState("");
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const inputRef = useRef<HTMLInputElement>(null);

  // Load products khi mở dialog
  useEffect(() => {
    if (isOpen) {
      setCustomCode(currentProductCode);
      loadProducts();
    }
  }, [isOpen, currentProductCode]);

  // Search products với debounce
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (searchQuery.trim()) {
      const timeout = setTimeout(() => {
        searchProducts(searchQuery);
      }, 300);
      setSearchTimeout(timeout);
    } else {
      loadProducts();
    }

    return () => {
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
    };
  }, [searchQuery]);

  const loadProducts = async () => {
    try {
      const token = getAccessToken();

      // Nếu có mã sản phẩm hiện tại, fetch thông tin chi tiết của nó trước
      if (currentProductCode && currentProductCode.trim()) {
        try {
          const currentProductResponse = await fetch(
            `${
              process.env.NEXT_PUBLIC_API_URL
            }/orders/products/search?q=${encodeURIComponent(
              currentProductCode.trim()
            )}&limit=1`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          if (currentProductResponse.ok) {
            const currentProductData = await currentProductResponse.json();
            const currentProducts = currentProductData.products || [];

            // Nếu tìm thấy sản phẩm hiện tại, fetch danh sách sản phẩm khác
            const otherProductsResponse = await fetch(
              `${process.env.NEXT_PUBLIC_API_URL}/orders/products?limit=19`,
              {
                headers: {
                  Authorization: `Bearer ${token}`,
                },
              }
            );

            if (otherProductsResponse.ok) {
              const otherProductsData = await otherProductsResponse.json();
              const otherProducts = otherProductsData.products || [];

              // Kết hợp sản phẩm hiện tại với các sản phẩm khác
              const allProducts = [
                ...currentProducts,
                ...otherProducts.filter(
                  (p: Product) => p.productCode !== currentProductCode
                ),
              ];

              setProducts(allProducts);

              // Tự động chọn sản phẩm hiện tại
              const currentProduct = allProducts.find(
                (p: Product) => p.productCode === currentProductCode
              );
              if (currentProduct) {
                setSelectedProduct(currentProduct);
              }
              return;
            }
          }
        } catch (error) {
          console.error("Error fetching current product:", error);
        }
      }

      // Fallback: fetch danh sách sản phẩm bình thường
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/products?limit=20`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        const products = data.products || [];
        setProducts(products);

        // Tự động chọn sản phẩm hiện tại nếu có trong danh sách
        if (
          currentProductCode &&
          currentProductCode.trim() &&
          products.length > 0
        ) {
          const currentProduct = products.find(
            (p: Product) => p.productCode === currentProductCode
          );
          if (currentProduct) {
            setSelectedProduct(currentProduct);
          }
        }
      }
    } catch (error) {
      console.error("Error loading products:", error);
    }
  };

  const searchProducts = async (query: string) => {
    try {
      const token = getAccessToken();

      // Nếu có mã sản phẩm hiện tại và chưa có trong kết quả tìm kiếm, fetch thông tin của nó
      if (currentProductCode && currentProductCode.trim()) {
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL
          }/orders/products/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          let products = data.products || [];

          // Kiểm tra xem sản phẩm hiện tại có trong kết quả tìm kiếm không
          const currentProductExists = products.find(
            (p: Product) => p.productCode === currentProductCode
          );

          if (!currentProductExists) {
            // Nếu không có, fetch thông tin chi tiết của sản phẩm hiện tại
            try {
              const currentProductResponse = await fetch(
                `${
                  process.env.NEXT_PUBLIC_API_URL
                }/orders/products/search?q=${encodeURIComponent(
                  currentProductCode.trim()
                )}&limit=1`,
                {
                  headers: {
                    Authorization: `Bearer ${token}`,
                  },
                }
              );

              if (currentProductResponse.ok) {
                const currentProductData = await currentProductResponse.json();
                const currentProducts = currentProductData.products || [];

                if (currentProducts.length > 0) {
                  // Thêm sản phẩm hiện tại vào đầu danh sách
                  products = [...currentProducts, ...products];
                }
              }
            } catch (error) {
              console.error("Error fetching current product in search:", error);
            }
          }

          setProducts(products);

          // Tự động chọn sản phẩm hiện tại nếu query trùng với mã hiện tại
          if (query === currentProductCode && products.length > 0) {
            const currentProduct = products.find(
              (p: Product) => p.productCode === currentProductCode
            );
            if (currentProduct) {
              setSelectedProduct(currentProduct);
            }
          }
        }
      } else {
        // Nếu không có mã sản phẩm hiện tại, tìm kiếm bình thường
        const response = await fetch(
          `${
            process.env.NEXT_PUBLIC_API_URL
          }/orders/products/search?q=${encodeURIComponent(query)}&limit=10`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      }
    } catch (error) {
      console.error("Error searching products:", error);
    }
  };

  const handleUpdate = async () => {
    if (!customCode.trim()) return;

    setIsLoading(true);
    try {
      const token = getAccessToken();
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/orders/product-code/${orderDetailId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productCode: customCode.trim(),
          }),
        }
      );

      const result = await response.json();

      if (result.success) {
        onUpdate(customCode.trim());
        
        // ✅ Fetch lại danh sách sản phẩm để đảm bảo sản phẩm vừa chọn có trong list
        await loadProducts();
        
        setIsOpen(false);
        setSelectedProduct(null);
        onClose?.();
      } else {
        alert(result.message || "Có lỗi xảy ra");
      }
    } catch (error) {
      console.error("Error updating product code:", error);
      alert("Có lỗi xảy ra khi cập nhật mã sản phẩm");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectProduct = (product: Product) => {
    setSelectedProduct(product);
    setCustomCode(product.productCode);
    // ✅ Không clear searchQuery để giữ danh sách search result
    // setSearchQuery("");
  };

  const handleCustomCodeChange = (value: string) => {
    setCustomCode(value);
    setSelectedProduct(null);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          onOpen?.();
        }}
        disabled={disabled}
        className="h-8 w-8 p-0 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:border-blue-200 transition-all duration-200 group"
      >
        <Edit2 className="h-4 w-4 text-gray-600 group-hover:text-blue-600 transition-colors" />
      </Button>

      <Dialog open={isOpen} onOpenChange={(open) => {
        setIsOpen(open);
        if (!open) {
          onClose?.();
        }
      }}>
        <DialogContent className="!max-w-[60vw] bg-gradient-to-br from-white via-gray-50 to-blue-50/30 border-0 shadow-2xl">
          <DialogHeader className="space-y-3 pb-6 border-b border-gradient-to-r from-transparent via-gray-200 to-transparent">
            <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-blue-700 bg-clip-text text-transparent flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                <Package className="h-5 w-5 text-white" />
              </div>
              Chỉnh sửa mã sản phẩm
            </DialogTitle>
            <DialogDescription className="text-gray-600 text-base leading-relaxed">
              Tìm kiếm và chọn sản phẩm từ danh sách hoặc nhập mã sản phẩm tùy
              chỉnh
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Search Section */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Search className="h-4 w-4 text-blue-500" />
                Tìm kiếm sản phẩm
              </label>
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                <Input
                  placeholder="Nhập tên sản phẩm hoặc mã sản phẩm..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-100 rounded-xl text-base bg-white/80 backdrop-blur-sm transition-all duration-200"
                />
                {searchQuery && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse" />
                  </div>
                )}
              </div>
            </div>

            {/* Product Grid */}
            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Tag className="h-4 w-4 text-green-500" />
                Danh sách sản phẩm
              </label>
              <div className="border-2 border-gray-200 rounded-xl shadow-lg bg-white/80 backdrop-blur-sm overflow-hidden">
                <div className="max-h-80 overflow-y-auto p-4">
                  {products.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center gap-3">
                        <Package className="h-16 w-16 text-gray-300" />
                        <p className="text-lg">Không tìm thấy sản phẩm nào</p>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-4">
                      {products.map((product) => {
                        const isCurrentProduct =
                          product.productCode === currentProductCode;
                        const isSelected = selectedProduct?.id === product.id;

                        return (
                          <div
                            key={product.id}
                            onClick={() => handleSelectProduct(product)}
                            className={`cursor-pointer p-4 rounded-lg border transition-all duration-200 hover:shadow-md ${
                              isSelected
                                ? "bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-300 shadow-md"
                                : isCurrentProduct
                                ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-300 shadow-md ring-2 ring-green-200"
                                : "bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                          >
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant={
                                    isSelected
                                      ? "default"
                                      : isCurrentProduct
                                      ? "default"
                                      : "secondary"
                                  }
                                  className={`font-mono text-xs px-2 py-1 ${
                                    isSelected
                                      ? "bg-blue-600 text-white"
                                      : isCurrentProduct
                                      ? "bg-green-600 text-white"
                                      : "bg-gray-100 text-gray-700"
                                  }`}
                                >
                                  {product.productCode}
                                  {isCurrentProduct && !isSelected && (
                                    <span className="ml-1 text-xs">
                                      (hiện tại)
                                    </span>
                                  )}
                                </Badge>
                                <div className="flex items-center gap-1">
                                  {isCurrentProduct && !isSelected && (
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-green-500">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                  {isSelected && (
                                    <div className="flex items-center justify-center h-5 w-5 rounded-full bg-blue-500 animate-pulse">
                                      <Check className="h-3 w-3 text-white" />
                                    </div>
                                  )}
                                </div>
                              </div>

                              <h4 className="font-semibold text-gray-800 text-sm leading-tight line-clamp-2">
                                {product.productName}
                              </h4>

                              {(product.category || product.brand) && (
                                <div className="space-y-1">
                                  {product.category && (
                                    <div className="flex items-center gap-1">
                                      <div className="h-3 w-3 rounded bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center">
                                        <Tag className="h-2 w-2 text-white" />
                                      </div>
                                      <span className="text-xs text-gray-600 truncate">
                                        {product.category.catName}
                                      </span>
                                    </div>
                                  )}
                                  {product.brand && (
                                    <div className="flex items-center gap-1">
                                      <div className="h-3 w-3 rounded bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center">
                                        <Building2 className="h-2 w-2 text-white" />
                                      </div>
                                      <span className="text-xs text-gray-600 truncate">
                                        {product.brand.name}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Custom Code Input */}
          </div>

          <DialogFooter className="pt-6 border-t border-gradient-to-r from-transparent via-gray-200 to-transparent">
            <div className="flex gap-3 w-full sm:w-auto">
              <Button
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isLoading}
                className="inline-flex items-center gap-2 whitespace-nowrap flex-1 sm:flex-none h-11 border-2 border-gray-300 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
              >
                <span className="flex items-center justify-center">
                  <X className="h-4 w-4 mr-2" />
                  Hủy
                </span>
              </Button>

              <Button
                onClick={handleUpdate}
                disabled={!customCode.trim() || isLoading}
                className="flex sm:flex-none h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <span className="flex items-start justify-center">
                    <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Đang cập nhật...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <Check className="h-4 w-4 mr-2" />
                    Cập nhật
                  </span>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
