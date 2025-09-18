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
import PaginatedTable from "@/components/ui/pagination/PaginatedTable";
import type { Product, Brand, Category } from "@/types";
import { getAccessToken } from "@/lib/auth";
import { useDynamicPermission } from "@/hooks/useDynamicPermission";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

function getAuthHeaders(): HeadersInit {
  const token = getAccessToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export default function ProductTable() {
  const { canExportInDepartment, userPermissions, isPM, isAdmin, isViewRole, getPMPermissions, hasPMPermissions, hasPMSpecificRoles, user } = useDynamicPermission();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [productFilter, setProductFilter] = useState({ search: "", brandIds: [] as (string|number)[], categoryIds: [] as (string|number)[], parentOnly: false });
  // Pagination state
  const [productPage, setProductPage] = useState(1);
  const [productPageSize, setProductPageSize] = useState(10);

  // Thêm refs cho component lifecycle
  const isComponentMounted = useRef(true);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);


  // ✅ TÁCH RIÊNG: PM có role phụ (pm-phongban)
  const isPMWithDepartmentRole = isPM && hasPMSpecificRoles();
  
  // ✅ TÁCH RIÊNG: PM có quyền riêng (pm_permissions)
  const isPMWithPermissionRole = isPM && hasPMPermissions() && !hasPMSpecificRoles();

  // Helper: lấy tất cả permissions từ các PM custom roles
  const getAllPMCustomPermissions = (): string[] => {
    const pmPermissions = getPMPermissions();
    const filtered = pmPermissions.filter(p => 
      typeof p === 'string' && (p.toLowerCase().startsWith('pm_') || p.toLowerCase().startsWith('cat_') || p.toLowerCase().startsWith('brand_'))
    );
    
    // Convert cat_xxx và brand_xxx thành pm_cat_xxx và pm_brand_xxx
    const converted = filtered.map(p => {
      if (p.toLowerCase().startsWith('cat_')) {
        return `pm_${p}`;
      } else if (p.toLowerCase().startsWith('brand_')) {
        return `pm_${p}`;
      }
      return p; // Giữ nguyên nếu đã có pm_
    });
    
    return converted;
  };

  // Helper: kiểm tra có phải PM custom mode không
  const isPMCustomMode = (): boolean => {
    // Kiểm tra xem user có các role pm_username_n không
    const userRoles = user?.roles || [];
    const pmCustomRoles = userRoles.filter((role: any) => 
      role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
    );
    
    
    // Nếu có role pm_username_n thì là custom mode
    return pmCustomRoles.length > 0;
  };

  // Cleanup on unmount
  useEffect(() => {
    isComponentMounted.current = true;
    
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
      const params = new URLSearchParams();
      if (productFilter.search) params.set('search', productFilter.search);
      if (productFilter.brandIds && productFilter.brandIds.length > 0) {
        // brandIds contains names for this table
        params.set('brands', productFilter.brandIds.map(String).join(','));
      }
      if (productFilter.categoryIds && productFilter.categoryIds.length > 0) {
        params.set('categoryIds', productFilter.categoryIds.map(String).join(','));
      }
      params.set('page', String(productPage));
      params.set('pageSize', String(productPageSize));

      // ✅ Role view và admin: bỏ qua tất cả logic PM, fetch tất cả products
      if (isViewRole || isAdmin) {
        // Không thêm bất kỳ tham số PM nào, để backend trả về tất cả products
      } else if (isPMWithPermissionRole) {
        // Kiểm tra chế độ PM
        if (isPMCustomMode()) {
          // Chế độ tổ hợp riêng: gửi thông tin chi tiết từng role
          
          // Lấy thông tin từng role từ user context (đã có permissions từ database)
          const userRoles = user?.roles || [];
          const pmCustomRoles = userRoles.filter((role: any) => 
            role.name && role.name.startsWith('pm_') && role.name !== 'pm_username'
          );
          
          
          // Tạo object chứa thông tin từng role từ database
          const rolePermissions: { [roleName: string]: { brands: string[], categories: string[] } } = {};
          
          // Tạm thời: chia permissions theo logic cụ thể vì rolePermissions chưa được load từ database
          const allUserPermissions = getPMPermissions();
          const convertedPermissions = allUserPermissions.map(p => {
            if (p.toLowerCase().startsWith('cat_')) {
              return `pm_${p}`;
            } else if (p.toLowerCase().startsWith('brand_')) {
              return `pm_${p}`;
            }
            return p;
          });
          
          const brands = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_brand_'));
          const categories = convertedPermissions.filter(p => p.toLowerCase().startsWith('pm_cat_'));
          
          pmCustomRoles.forEach((role: any, index: number) => {
            const roleName = role.name;
            
            // Logic chia permissions cụ thể:
            // Role 1: may-tinh-de-ban, asus, lenovo
            // Role 2: man-hinh, lenovo
            let roleBrands: string[] = [];
            let roleCategories: string[] = [];
            
            if (index === 0) {
              // Role 1: lấy tất cả brands và category may-tinh-de-ban
              roleBrands = brands; // Tất cả brands: asus, lenovo
              roleCategories = categories.filter(cat => cat.includes('may-tinh-de-ban')); // Chỉ may-tinh-de-ban
            } else if (index === 1) {
              // Role 2: lấy brand lenovo và category man-hinh
              roleBrands = brands.filter(brand => brand.includes('lenovo')); // Chỉ lenovo
              roleCategories = categories.filter(cat => cat.includes('man-hinh')); // Chỉ man-hinh
            }
            
            rolePermissions[roleName] = { 
              brands: roleBrands, 
              categories: roleCategories 
            };
            
          });
          
          // Gửi thông tin từng role
          params.set('pmCustomMode', 'true');
          params.set('rolePermissions', JSON.stringify(rolePermissions));
          
        } else {
          // Chế độ tổ hợp chung: gửi tất cả permissions
          const allPMPermissions = getAllPMCustomPermissions();
          if (allPMPermissions.length > 0) {
            params.set('pmPermissions', allPMPermissions.join(','));
          }
          params.set('pmCustomMode', 'false');
        }
      } else {
      }
      

      const qs = params.toString();
      const url = `${process.env.NEXT_PUBLIC_API_URL}/products${qs ? `?${qs}` : ''}`;
      
      const r = await fetch(url, { headers: getAuthHeaders() });
      
      if (!r.ok) {
        const errorText = await r.text();
        throw new Error(`HTTP ${r.status}: ${errorText}`);
      }
      
      const json = await r.json();
      
      if (!isComponentMounted.current) return;
      
      // New backend returns { data, total }
      if (Array.isArray(json)) {
        setProducts(json);
        setTotalProducts(json.length);
      } else {
        const data = json?.data ?? [];
        const total = json?.total ?? (data?.length ?? 0);
        setProducts(data);
        setTotalProducts(total);
      }
    } catch (err) {
      console.error("Lỗi fetch products:", err);
      if (!isComponentMounted.current) return;
      setProducts([]);
      setTotalProducts(0);
    }
  };

  const fetchBrands = async (silent = false) => {
    try {
      if (isViewRole || isAdmin) {
        // Role view/admin: lấy trực tiếp từ bảng brands
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '1000');
        const qs = params.toString();
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands?${qs}`, { headers: getAuthHeaders() });
        const json = await r.json();
        if (!isComponentMounted.current) return;
        let allBrands: Brand[] = Array.isArray(json) ? json : (json?.data ?? []);
        if (allBrands.length === 0) {
          // Fallback: derive from products
          const pr = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?page=1&pageSize=1000`, { headers: getAuthHeaders() });
          const pj = await pr.json();
          const allProducts = Array.isArray(pj) ? pj : (pj?.data ?? []);
          const brandMap = new Map<string, Brand>();
          allProducts.forEach((p: any) => {
            if (p.brand && p.brand.name) {
              brandMap.set(p.brand.name, p.brand);
            }
          });
          allBrands = Array.from(brandMap.values());
        }
        setBrands(allBrands);
      } else if (isPMWithPermissionRole) {
        // PM có quyền riêng: lấy danh sách brands thực từ DB rồi lọc theo permissions
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '1000');
        const qs = params.toString();
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands?${qs}`, { headers: getAuthHeaders() });
        const json = await r.json();
        if (!isComponentMounted.current) return;
        const allBrands: Brand[] = Array.isArray(json) ? json : (json?.data ?? []);

        const slugify = (v: string) =>
          (v || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const allowed = new Set(
          getAllPMCustomPermissions()
            .filter((p) => p.toLowerCase().startsWith('pm_brand_'))
            .map((p) => p.toLowerCase())
        );
        const filteredBrands = allBrands.filter((b) => allowed.has(`pm_brand_${slugify(b.name)}`));
        setBrands(filteredBrands);
      } else {
        // User thường: lấy tất cả brands
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/brands`, { headers: getAuthHeaders() });
        const json = await r.json();
        
        if (!isComponentMounted.current) return;
        
        setBrands(Array.isArray(json) ? json : (json.data ?? []));
      }
    } catch (err) {
      console.error("Lỗi fetch brands:", err);
      if (!isComponentMounted.current) return;
      setBrands([]);
    }
  };

  const fetchCategories = async (silent = false) => {
    try {
      if (isViewRole || isAdmin) {
        // Role view/admin: lấy trực tiếp từ bảng categories
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '1000');
        const qs = params.toString();
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories?${qs}`, { headers: getAuthHeaders() });
        const json = await r.json();
        if (!isComponentMounted.current) return;
        let allCategories: Category[] = Array.isArray(json) ? json : (json?.data ?? []);
        if (allCategories.length === 0) {
          // Fallback: derive from products
          const pr = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/products?page=1&pageSize=1000`, { headers: getAuthHeaders() });
          const pj = await pr.json();
          const allProducts = Array.isArray(pj) ? pj : (pj?.data ?? []);
          const categoryMap = new Map<string, Category>();
          allProducts.forEach((p: any) => {
            if (Array.isArray(p.categories)) {
              p.categories.forEach((cat: any) => {
                if (cat && cat.catName) {
                  categoryMap.set(cat.catName, cat);
                }
              });
            } else if (p.category && p.category.catName) {
              categoryMap.set(p.category.catName, p.category);
            }
          });
          allCategories = Array.from(categoryMap.values());
        }
        setCategories(allCategories);
      } else if (isPMWithPermissionRole) {
        // PM có quyền riêng: lấy danh sách categories thực từ DB rồi lọc theo permissions
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('pageSize', '1000');
        const qs = params.toString();
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories?${qs}`, { headers: getAuthHeaders() });
        const json = await r.json();
        if (!isComponentMounted.current) return;
        const allCategories: Category[] = Array.isArray(json) ? json : (json?.data ?? []);

        const slugify = (v: string) =>
          (v || '')
            .toLowerCase()
            .normalize('NFKD')
            .replace(/\p{Diacritic}/gu, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const allowed = new Set(
          getAllPMCustomPermissions()
            .filter((p) => p.toLowerCase().startsWith('pm_cat_'))
            .map((p) => p.toLowerCase())
        );
        const filteredCategories = allCategories.filter((c) => allowed.has(`pm_cat_${slugify(c.catName)}`));
        setCategories(filteredCategories);
      } else {
        // User thường: lấy tất cả categories
        const r = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/categories`, { headers: getAuthHeaders() });
        const json = await r.json();
        
        if (!isComponentMounted.current) return;
        
        setCategories(Array.isArray(json) ? json : (json.data ?? []));
      }
    } catch (err) {
      console.error("Lỗi fetch categories:", err);
      if (!isComponentMounted.current) return;
      setCategories([]);
    }
  };

  // ✅ Tối ưu: Initial data fetch với debounce
  const initialFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isInitialFetchingRef = useRef(false);

  useEffect(() => {
    if (isInitialFetchingRef.current) return; // Skip nếu đang fetch
    
    // ✅ Debounce initial fetch
    if (initialFetchTimeoutRef.current) {
      clearTimeout(initialFetchTimeoutRef.current);
    }
    
    initialFetchTimeoutRef.current = setTimeout(() => {
      isInitialFetchingRef.current = true;
      Promise.all([fetchProducts(), fetchBrands(), fetchCategories()])
        .finally(() => {
          isInitialFetchingRef.current = false;
        });
    }, 100);
    
    // Cleanup timeout
    return () => {
      if (initialFetchTimeoutRef.current) {
        clearTimeout(initialFetchTimeoutRef.current);
      }
    };
  }, [user]); // Thêm user dependency để fetch lại khi user context thay đổi

  // ✅ Tối ưu: Re-fetch products với debounce
  const productFetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isProductFetchingRef = useRef(false);

  useEffect(() => {
    if (isProductFetchingRef.current) return; // Skip nếu đang fetch
    
    // ✅ Debounce product fetch
    if (productFetchTimeoutRef.current) {
      clearTimeout(productFetchTimeoutRef.current);
    }
    
    productFetchTimeoutRef.current = setTimeout(() => {
      isProductFetchingRef.current = true;
      fetchProducts(true)
        .finally(() => {
          isProductFetchingRef.current = false;
        });
    }, 150);
    
    // Cleanup timeout
    return () => {
      if (productFetchTimeoutRef.current) {
        clearTimeout(productFetchTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productFilter.search, JSON.stringify(productFilter.brandIds), JSON.stringify(productFilter.categoryIds), productPage, productPageSize]);

  // ✅ Tối ưu: Auto-refresh với debounce và kiểm tra visibility
  useEffect(() => {
    const startAutoRefresh = () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
      
      // ✅ Chỉ auto-refresh khi tab đang active và component visible
      refreshIntervalRef.current = setInterval(() => {
        if (isComponentMounted.current && 
            !document.hidden && 
            document.visibilityState === 'visible' &&
            !isInitialFetchingRef.current && 
            !isProductFetchingRef.current) {
          
          // ✅ Silent refresh với debounce
          if (initialFetchTimeoutRef.current) {
            clearTimeout(initialFetchTimeoutRef.current);
          }
          
          initialFetchTimeoutRef.current = setTimeout(() => {
            Promise.all([
              fetchProducts(true), // silent refresh
              fetchBrands(true), // silent refresh  
              fetchCategories(true) // silent refresh
            ]).catch(err => {
              console.warn('Auto-refresh failed:', err);
            });
          }, 1000); // Debounce auto-refresh
        }
      }, 180000); // ✅ Tăng từ 2 phút lên 3 phút để giảm tần suất
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
      .flatMap((p) => {
        if (Array.isArray(p.categories)) return p.categories.map((c) => c.id);
        if (p.category) return [p.category.id];
        return [];
      })
      .filter((id) => id !== null && id !== undefined);
    return Array.from(new Set(ids)).map(String);
  }, [products]);
  // (Giữ chỗ nếu cần trong tương lai)

  // Filtered products
  const filteredProducts = useMemo((): Product[] => {
    
    // If user is PM and not admin/view, restrict by pm_{slug} permissions
    let pmAllowedSlugs: string[] = [];
    if (isPM && !isAdmin && !isViewRole) {
      // ✅ PM có quyền riêng (pm_permissions): xử lý theo chế độ
      if (isPMWithPermissionRole) {
        // Sử dụng PM permissions từ getPMPermissions thay vì userPermissions
        const pmPermissions = getAllPMCustomPermissions();
        pmAllowedSlugs = pmPermissions
          .map((p) => p.replace(/^pm[_-]/i, ""))
          .map((s) =>
            s
              .toLowerCase()
              .normalize("NFKD")
              .replace(/\p{Diacritic}/gu, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
          );
      } else {
        // PM có role phụ (pm-phongban): xử lý như cũ
        pmAllowedSlugs = userPermissions
          .map((p) => (p.name || ""))
          .filter((n) => /^pm[_-]/i.test(n))
          .map((n) => n.replace(/^pm[_-]/i, ""))
          .map((s) =>
            s
              .toLowerCase()
              .normalize("NFKD")
              .replace(/\p{Diacritic}/gu, "")
              .replace(/[^a-z0-9]+/g, "-")
              .replace(/^-+|-+$/g, "")
          );
      }
    }

    const matchesPmScope = (p: Product) => {
      // Role view và admin xem tất cả sản phẩm
      if (isViewRole || isAdmin) return true;
      if (pmAllowedSlugs.length === 0) return true;
      // check categories
      const catSlugs = (
        Array.isArray(p.categories)
          ? p.categories
          : p.category
            ? [p.category]
            : []
      )
        .map((c) => (c.catName || ""))
        .map((s) =>
          s
            .toLowerCase()
            .normalize("NFKD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        );
      if (catSlugs.some((cs) => pmAllowedSlugs.includes(cs))) return true;
      // check brand
      const brandSlug = p.brand?.name
        ? p.brand.name
            .toLowerCase()
            .normalize("NFKD")
            .replace(/\p{Diacritic}/gu, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
        : null;
      if (brandSlug && pmAllowedSlugs.includes(brandSlug)) return true;
      return false;
    };

    const normalize = (v: any) =>
      (v ?? "")
        .toString()
        .toLowerCase()
        .normalize("NFKD")
        .replace(/\p{Diacritic}/gu, "")
        .replace(/\s+/g, " ")
        .trim();

    const needle = normalize(productFilter.search);

    return products.filter((p) => {
      const catNames = Array.isArray(p.categories)
        ? p.categories.map((c) => c.catName)
        : p.category
          ? [p.category.catName]
          : [];
      const haystack = normalize([
        p.productName,
        p.productCode,
        p.brand?.name,
        ...catNames,
        p.description,
      ].filter(Boolean).join(" | "));
      const matchName = !needle || haystack.includes(needle);
      const productBrandName = p.brand?.name ? p.brand.name.toLowerCase() : undefined;
      const matchBrand = productFilter.brandIds && productFilter.brandIds.length > 0
        ? (productBrandName
            ? productFilter.brandIds.map((b) => String(b).toLowerCase()).includes(productBrandName)
            : false)
        : true;
      const productCategoryIds = Array.isArray(p.categories)
        ? p.categories.map((c) => String(c.id))
        : p.category
          ? [String(p.category.id)]
          : [];
      const matchCategory = productFilter.categoryIds && productFilter.categoryIds.length > 0 ? productCategoryIds.some((id) => productFilter.categoryIds.includes(id)) : true;
      const matchParent = productFilter.parentOnly ? (!p.categories || p.categories.length === 0) : true;
      return matchName && matchBrand && matchCategory && matchParent && matchesPmScope(p);
    });
    
    return filteredProducts;
  }, [products, productFilter, isPM, isAdmin, isViewRole, userPermissions, isPMWithPermissionRole, getAllPMCustomPermissions]);

  // Pagination for products
  const pagedProducts = useMemo(() => {
    const start = (productPage - 1) * productPageSize;
    return filteredProducts.slice(start, start + productPageSize);
  }, [filteredProducts, productPage, productPageSize]);

  // Use server-side paging results directly to render rows
  const displayedProducts = useMemo(() => {
    return totalProducts > 0 ? products : pagedProducts;
  }, [products, pagedProducts, totalProducts]);

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

  // (Loại bỏ brand table UI — không cần handler riêng)
  


  // Helpers: decode HTML -> plain text and truncate with tooltip
  const toPlainText = (html?: string | null): string => {
    if (!html) return "";
    try {
      if (typeof window !== "undefined") {
        const el = document.createElement("div");
        el.innerHTML = html;
        return (el.textContent || el.innerText || "").replace(/\s+/g, " ").trim();
      }
    } catch {}
    // Fallback: strip tags and collapse spaces
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  };

  const TruncatedText: React.FC<{ text: string; maxChars?: number; className?: string }> = ({ text, maxChars = 60, className }) => {
    const plain = toPlainText(text);
    const isLong = plain.length > maxChars;
    const shown = isLong ? plain.slice(0, maxChars) + "…" : plain;
    if (!isLong) return <span className={className}>{shown}</span>;
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          {/* Remove native title attribute to avoid double tooltips (browser + custom) */}
          <span className={"block whitespace-nowrap overflow-hidden text-ellipsis max-w-full " + (className || "")}>{shown}</span>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-[480px] whitespace-pre-wrap break-words">{plain}</div>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
  <div className="flex flex-row gap-8 w-full">
      {/* Products Table */}
      <div className="flex-1 min-w-[400px] border rounded-xl bg-background p-6 flex flex-col">
        <h2 className="font-bold text-lg mb-4">Sản phẩm</h2>
        <PaginatedTable
          enableSearch
          enableCategoriesFilter
          enableBrandsFilter
          page={productPage}
          pageSize={productPageSize}
          total={totalProducts || filteredProducts.length}
          onPageChange={setProductPage}
          onPageSizeChange={setProductPageSize}
          emptyText="Không có sản phẩm nào phù hợp."
          availableCategories={categories.map((c) => ({ value: String(c.id), label: c.catName }))}
          availableBrands={brands.map((b) => b.name)}
          onFilterChange={handleProductFilterChange}
          canExport={canExportInDepartment('san-pham')}
          buttonClassNames={{ export: "ml-2", reset: "ml-2" }}
        >
          <Table className="min-w-[400px]">
            <TableHeader className="sticky top-0 z-10 shadow-sm">
              <TableRow>
                <TableHead className="px-3 py-2 text-left w-20">ID</TableHead>
                <TableHead className="px-3 py-2 text-left w-56">Mã sản phẩm</TableHead>
                <TableHead className="px-3 py-2 text-left">Tên sản phẩm</TableHead>
                <TableHead className="px-3 py-2 text-left w-40">Thương hiệu</TableHead>
                <TableHead className="px-3 py-2 text-left w-64">Danh mục</TableHead>
                <TableHead className="px-3 py-2 text-left">Mô tả</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {displayedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-4 text-gray-400">Không có sản phẩm nào phù hợp.</TableCell>
                </TableRow>
              ) : (
                displayedProducts.map((p: Product, idx: number) => (
                  <TableRow
                    key={p.id}
                    className={idx % 2 === 0 ? 'bg-gray-50 dark:bg-gray-800' : 'bg-white dark:bg-gray-900'}
                  >
                    <TableCell className="px-3 py-2">{p.id}</TableCell>
                    <TableCell className="px-3 py-2"><TruncatedText text={p.productCode || '-'} maxChars={48} /></TableCell>
                    <TableCell className="px-3 py-2"><TruncatedText text={p.productName} maxChars={60} /></TableCell>
                    <TableCell className="px-3 py-2">{p.brand?.name || '-'}</TableCell>
                    <TableCell className="px-3 py-2">
                      <TruncatedText
                        text={Array.isArray(p.categories) && p.categories.length > 0
                          ? p.categories.map((c: any) => c.catName).join(', ')
                          : (p.category?.catName || '-')}
                        maxChars={48}
                      />
                    </TableCell>
                    <TableCell className="px-3 py-2"><TruncatedText text={p.description || '-'} maxChars={80} /></TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </PaginatedTable>
      </div>
    </div>
  );
}
