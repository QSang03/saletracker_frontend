"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import type { Product, Brand } from "@/types";
import { getAccessToken } from "@/lib/auth";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ProductTable() {
  const { canExportInDepartment } = useDynamicPermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [productFilter, setProductFilter] = useState({ search: "", brandIds: [] as (string|number)[], categoryIds: [] as (string|number)[], parentOnly: false });
  const [brandFilter, setBrandFilter] = useState({ search: "" });
  const [deleteBrandId, setDeleteBrandId] = useState<number | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [brandHasProducts, setBrandHasProducts] = useState(false);
  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);
  const [brandPage, setBrandPage] = useState(1);
  const [brandPageSize, setBrandPageSize] = useState(10);

  // Thêm refs cho component lifecycle
  const isComponentMounted = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isComponentMounted.current = false;
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Cải thiện fetch functions
  const fetchProducts = async (silent = false) => {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products`, { headers: getAuthHeaders() });
      const json = await r.json();
      
      if (!isComponentMounted.current) return;
      
      setProducts((json && Array.isArray(json.data)) ? json.data : []);
    } catch (err) {
      console.error("Lỗi fetch products:", err);
      if (!isComponentMounted.current) return;
      setProducts([]);
    }
  };

  const fetchBrands = async (silent = false) => {
    try {
      const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands`, { headers: getAuthHeaders() });
      const json = await r.json();

      
      if (!isComponentMounted.current) return;
      
      setBrands(Array.isArray(json) ? json : (json.data ?? []));
    } catch (err) {
      console.error("Lỗi fetch brands:", err);
      if (!isComponentMounted.current) return;
      setBrands([]);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchProducts();
    fetchBrands();
  }, []);

  // Auto-refresh every 2 minutes
  useEffect(() => {
    const startAutoRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      refreshIntervalRef.current = setInterval(() => {
        if (isComponentMounted.current) {
          fetchProducts(true); // silent refresh
          fetchBrands(true); // silent refresh
        }
      }, 120000); // 2 minutes
    };

    startAutoRefresh();
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  // Lấy danh sách category_id duy nhất từ products (dựa trên categories array)
  const categoryIds = useMemo(() => {
    const ids = products
      .flatMap((p) => (Array.isArray(p.categories) ? p.categories.map((c) => c.id) : []))
      .filter((id) => id !== null && id !== undefined);
    return Array.from(new Set(ids)).map(String);
  }, [products]);
  // Lấy danh sách brand id duy nhất từ products (dựa trên brand object)
  const brandIds = useMemo(() => {
    const ids = products
      .map((p) => p.brand?.id)
      .filter((id) => id !== null && id !== undefined);
    return Array.from(new Set(ids)).map(String);
  }, [products]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchName = p.productName.toLowerCase().includes(productFilter.search.toLowerCase());
      const productBrandId = p.brand?.id ? String(p.brand.id) : undefined;
      const matchBrand = productFilter.brandIds && productFilter.brandIds.length > 0
        ? (productBrandId ? productFilter.brandIds.includes(productBrandId) : false)
        : true;
      const productCategoryIds = Array.isArray(p.categories) ? p.categories.map((c) => String(c.id)) : [];
      const matchCategory = productFilter.categoryIds && productFilter.categoryIds.length > 0 ? productCategoryIds.some((id) => productFilter.categoryIds.includes(id)) : true;
      const matchParent = productFilter.parentOnly ? (!p.categories || p.categories.length === 0) : true;
      return matchName && matchBrand && matchCategory && matchParent;
    });
  }, [products, productFilter]);

  // Filtered brands (giữ nguyên)
  const filteredBrands = useMemo(() => {
    return brands.filter((b) => b.name.toLowerCase().includes(brandFilter.search.toLowerCase()));
  }, [brands, brandFilter]);

  // Pagination for products
  const pagedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Pagination for brands
  const pagedBrands = useMemo(() => {
    const start = (brandPage - 1) * brandPageSize;
    return filteredBrands.slice(start, start + brandPageSize);
  }, [filteredBrands, brandPage, brandPageSize]);

  const handleDeleteBrand = (id: number) => {
    const hasProducts = products.some((p) => p.brand?.id === id);
    setBrandHasProducts(hasProducts);
    setDeleteBrandId(id);
    setShowConfirm(true);
  };

  const confirmDeleteBrand = async () => {
    if (deleteBrandId && !brandHasProducts) {
      await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands/${deleteBrandId}`, { method: "DELETE", headers: getAuthHeaders() });
      setBrands(brands.filter((b) => b.id !== deleteBrandId));
    }
    setShowConfirm(false);
    setDeleteBrandId(null);
  };

  // Chặn setState lặp khi filter không đổi
  const lastProductFilter = React.useRef(productFilter);
  const handleProductFilterChange = React.useCallback((filters: any) => {
    const newFilter = {
      search: filters.search,
      brandIds: filters.brands ?? [],
      categoryIds: filters.categories ?? [],
      parentOnly: false,
    };
    // So sánh filter mới và cũ, chỉ setState khi thực sự khác
    if (JSON.stringify(lastProductFilter.current) !== JSON.stringify(newFilter)) {
      setProductFilter(newFilter);
      lastProductFilter.current = newFilter;
    }
  }, []);

  const lastBrandFilter = React.useRef(brandFilter);
  const handleBrandFilterChange = React.useCallback((filters: any) => {
    const newFilter = { search: filters.search };
    if (JSON.stringify(lastBrandFilter.current) !== JSON.stringify(newFilter)) {
      setBrandFilter(newFilter);
      lastBrandFilter.current = newFilter;
    }
  }, []);
  


  return (
    <div className="flex flex-row gap-8 w-full">
      {/* Products Table */}
      <div className="flex-1 min-w-[400px] border rounded-xl bg-background p-6 flex flex-col">
        <h2 className="font-bold text-lg mb-4">Sản phẩm</h2>
        <PaginatedTable
          enableSearch
          page={productPage}
          pageSize={productPageSize}
          total={filteredProducts.length}
          onPageChange={setProductPage}
          emptyText="Không có sản phẩm nào phù hợp."
          availableCategories={[]}
          availableBrands={brands.map((b) => b.name)}
          onFilterChange={handleProductFilterChange}
          canExport={canExportInDepartment('san-pham')}
          buttonClassNames={{ export: "ml-2", reset: "ml-2" }}
        >
          <Table className="min-w-[400px]">
            <TableHeader className="sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="px-3 py-2 text-left w-12">#</TableHead>
                <TableHead className="px-3 py-2 text-left">Tên sản phẩm</TableHead>
                <TableHead className="px-3 py-2 text-left">Danh mục</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="text-center py-4 text-gray-400">Không có sản phẩm nào phù hợp.</TableCell>
                </TableRow>
              ) : (
                pagedProducts.map((p, idx) => (
                  <TableRow
                    key={p.id}
                    className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                  >
                    <TableCell className="px-3 py-2 text-center">{(productPage - 1) * productPageSize + idx + 1}</TableCell>
                    <TableCell className="px-3 py-2">{p.productName}</TableCell>
                    <TableCell className="px-3 py-2">
                      {Array.isArray(p.categories) && p.categories.length > 0
                        ? p.categories.map((c) => c.catName).join(', ')
                        : '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </PaginatedTable>
      </div>
      {/* Brands Table */}
      <div className="flex-1 min-w-[400px] border rounded-xl bg-background p-6 flex flex-col">
        <h2 className="font-bold text-lg mb-4">Brands</h2>
        <PaginatedTable
          enableSearch
          page={brandPage}
          pageSize={brandPageSize}
          total={filteredBrands.length}
          onPageChange={setBrandPage}
          emptyText="Không có brand nào phù hợp."
          onFilterChange={handleBrandFilterChange}
          canExport={canExportInDepartment('san-pham')}
          buttonClassNames={{ export: "ml-2", reset: "ml-2" }}
        >
          <Table className="min-w-[400px]">
            <TableHeader className="sticky top-0 z-10 bg-background shadow-sm">
              <TableRow>
                <TableHead className="px-3 py-2 text-left w-12">#</TableHead>
                <TableHead className="px-3 py-2 text-left">Tên brand</TableHead>
                <TableHead className="px-3 py-2 text-left">Mô tả</TableHead>
                <TableHead className="w-36 text-center px-3 py-2">Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pagedBrands.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-4 text-gray-400">Không có brand nào phù hợp.</TableCell>
                </TableRow>
              ) : (
                pagedBrands.map((b, idx) => (
                  <TableRow
                    key={b.id}
                    className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                  >
                    <TableCell className="px-3 py-2 text-center">{(brandPage - 1) * brandPageSize + idx + 1}</TableCell>
                    <TableCell className="px-3 py-2">{b.name}</TableCell>
                    <TableCell className="px-3 py-2">{b.descriptions || '-'}</TableCell>
                    <TableCell className="text-center px-3 py-2 flex gap-2 justify-center">
                      <Button variant="edit" size="sm">Sửa</Button>
                      <Button
                        variant="delete"
                        size="sm"
                        className="ml-2"
                        onClick={() => handleDeleteBrand(b.id)}
                      >
                        Xóa
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
              
            </TableBody>
          </Table>
        </PaginatedTable>
        <ConfirmDialog
          isOpen={showConfirm}
          title="Xác nhận xoá brand"
          message={brandHasProducts ? "Không thể xoá brand này vì còn sản phẩm liên quan." : "Bạn có chắc muốn xoá brand này?"}
          onConfirm={confirmDeleteBrand}
          onCancel={() => setShowConfirm(false)}
        />
      </div>
    </div>
  );
}
