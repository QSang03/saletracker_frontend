"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { useCustomerList, CustomerListFilters } from '@/hooks/useCustomerList';
import { 
  Users, 
  Search, 
  ShoppingBag, 
  Eye, 
  Loader2,
  Filter,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Star,
  Crown,
  TrendingUp,
  Zap,
  Sparkles,
  Trophy,
  Target,
  Heart
} from 'lucide-react';

// Simple and Clean Pagination Component
const PaginationComponent = ({ 
  currentPage, 
  totalPages, 
  onPageChange 
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => {
  if (totalPages <= 1) return null;

  const getVisiblePages = (): number[] => {
    const delta = 2; // Show 2 pages before and after current page
    const range = [];
    const rangeWithDots = [];

    for (let i = Math.max(2, currentPage - delta); 
         i <= Math.min(totalPages - 1, currentPage + delta); 
         i++) {
      range.push(i);
    }

    if (currentPage - delta > 2) {
      rangeWithDots.push(1, -1); // -1 represents dots
    } else {
      rangeWithDots.push(1);
    }

    rangeWithDots.push(...range);

    if (currentPage + delta < totalPages - 1) {
      rangeWithDots.push(-2, totalPages); // -2 represents dots
    } else if (totalPages > 1) {
      rangeWithDots.push(totalPages);
    }

    return rangeWithDots.filter((v, i, arr) => arr.indexOf(v) === i);
  };

  return (
    <div className="flex items-center gap-1.5">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(1)}
        disabled={currentPage === 1}
        className="h-9 w-9 p-0 border-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-40"
      >
        <ChevronsLeft className="h-4 w-4" />
      </Button>
      
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-9 w-9 p-0 border-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>

      {getVisiblePages().map((page, index) => (
        page < 0 ? (
          <span key={`dots-${index}`} className="px-2 text-gray-400">...</span>
        ) : (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`h-9 w-9 p-0 text-sm font-semibold transition-all duration-200 ${
              currentPage === page 
                ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg border-0 scale-105 hover:from-blue-700 hover:to-purple-700" 
                : "border-2 hover:border-blue-400 hover:bg-blue-50 hover:scale-105"
            }`}
          >
            {page}
          </Button>
        )
      ))}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-9 w-9 p-0 border-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>

      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(totalPages)}
        disabled={currentPage === totalPages}
        className="h-9 w-9 p-0 border-2 hover:border-blue-400 hover:bg-blue-50 transition-all duration-200 disabled:opacity-40"
      >
        <ChevronsRight className="h-4 w-4" />
      </Button>
    </div>
  );
};

export function CustomerListDialog({
  open,
  onOpenChange,
  filters,
  onSelectCustomer,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  filters?: CustomerListFilters;
  onSelectCustomer?: (name: string) => void;
}) {
  const { 
    items = [], 
    page = 1, 
    pageSize = 20, 
    total = 0, 
    totalPages = 1, 
    loading = false, 
    error, 
    fetchPage, 
    setPage, 
    setPageSize 
  } = useCustomerList(filters, { autoFetch: false }) || {};
  
  const [searchTerm, setSearchTerm] = useState('');
  const [animatedTotal, setAnimatedTotal] = useState(0);
  const fetchedOnOpenRef = React.useRef(false);
  const prevIsSearchingRef = React.useRef<boolean | null>(null);

  // Animate total counter
  useEffect(() => {
    if (total > 0) {
      const duration = 1000;
      const steps = 30;
      const increment = total / steps;
      let current = 0;
      
      const timer = setInterval(() => {
        current += increment;
        if (current >= total) {
          setAnimatedTotal(total);
          clearInterval(timer);
        } else {
          setAnimatedTotal(Math.floor(current));
        }
      }, duration / steps);

      return () => clearInterval(timer);
    }
  }, [total]);

  // Simplified filtering logic
  const filteredItems = React.useMemo(() => {
    if (!Array.isArray(items)) return [];
    if (!searchTerm.trim()) return items;
    
    return items.filter(item => 
      item?.customer_name?.toLowerCase()?.includes(searchTerm.toLowerCase().trim())
    );
  }, [items, searchTerm]);

  // Simplified pagination logic
  const displayItems = filteredItems;
  const isSearching = searchTerm.trim().length > 0;
  
  // When searching, we show all filtered results (no pagination for search)
  // When not searching, we use server-side pagination
  const currentItems = isSearching ? displayItems : items;
  const currentTotal = isSearching ? displayItems.length : total;
  const currentTotalPages = isSearching ? 1 : totalPages; // No pagination when searching

  // Reset page when starting/stopping search
  useEffect(() => {
    const prev = prevIsSearchingRef.current;
    // Only act when transitioning from search -> non-search
    if (prev === true && isSearching === false) {
      setPage?.(1);
      fetchPage?.(1);
    }
    prevIsSearchingRef.current = isSearching;
  }, [isSearching, fetchPage, setPage]);

  // Fetch data when dialog opens
  useEffect(() => {
    if (open && !fetchedOnOpenRef.current) {
      fetchedOnOpenRef.current = true;
      fetchPage?.(page);
    }
    if (!open) {
      // Reset guard when dialog closes so next open fetches again once
      fetchedOnOpenRef.current = false;
    }
  }, [open, page, fetchPage]);

  // Enhanced customer tier system
  const getCustomerTier = (orders: number = 0) => {
    if (orders >= 100) return { 
      tier: 'Diamond', 
      icon: Crown, 
      gradient: 'from-purple-600 via-pink-600 to-purple-700',
      bg: 'bg-gradient-to-r from-purple-100 to-pink-100', 
      text: 'text-purple-800',
      border: 'border-purple-300',
      shadow: 'shadow-purple-200',
      glow: 'shadow-lg shadow-purple-300/50'
    };
    if (orders >= 50) return { 
      tier: 'Gold', 
      icon: Trophy, 
      gradient: 'from-yellow-500 via-amber-500 to-orange-500',
      bg: 'bg-gradient-to-r from-yellow-50 to-orange-100', 
      text: 'text-amber-800',
      border: 'border-amber-300',
      shadow: 'shadow-amber-200',
      glow: 'shadow-lg shadow-amber-300/50'
    };
    if (orders >= 20) return { 
      tier: 'Silver', 
      icon: Target, 
      gradient: 'from-slate-400 via-gray-500 to-slate-600',
      bg: 'bg-gradient-to-r from-gray-50 to-slate-100', 
      text: 'text-slate-700',
      border: 'border-slate-300',
      shadow: 'shadow-slate-200',
      glow: 'shadow-lg shadow-slate-300/50'
    };
    return { 
      tier: 'Bronze', 
      icon: Sparkles, 
      gradient: 'from-orange-500 via-red-500 to-pink-500',
      bg: 'bg-gradient-to-r from-orange-50 to-red-50', 
      text: 'text-orange-700',
      border: 'border-orange-300',
      shadow: 'shadow-orange-200',
      glow: 'shadow-lg shadow-orange-300/50'
    };
  };

  const handlePageChange = (newPage: number) => {
    if (!setPage || isSearching) return;
    
    setPage(newPage);
    fetchPage?.(newPage);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    if (isSearching) return; // Don't change page size when searching
    
    setPageSize?.(newPageSize);
    setPage?.(1);
    // Pass pageSize to avoid one extra render with stale size
    fetchPage?.(1, undefined, newPageSize);
  };

  // Display stats
  const displayCount = currentItems.length;
  const displayTotal = currentTotal;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] !max-w-[80vw] !max-h-[85vh] !h-[85vh] min-h-0 p-0 flex flex-col overflow-y-auto bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 border-0 shadow-2xl">
        {/* Header */}
        <DialogHeader className="flex-shrink-0 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-700 animate-pulse"></div>
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
          
          <div className="absolute top-2 left-10 w-2 h-2 bg-white/30 rounded-full animate-bounce"></div>
          <div className="absolute top-6 right-16 w-1 h-1 bg-white/40 rounded-full animate-ping"></div>
          <div className="absolute bottom-3 left-20 w-1.5 h-1.5 bg-white/25 rounded-full animate-pulse"></div>
          
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="relative p-3 bg-white/20 backdrop-blur-xl rounded-2xl border border-white/30 shadow-lg">
                  <Users className="w-8 h-8 text-white" />
                  <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-pink-400 to-red-500 rounded-full animate-pulse"></div>
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-white mb-1 tracking-tight">
                    Customer Hub
                  </DialogTitle>
                  <p className="text-blue-100 text-base font-medium">
                    🚀 Quản lý khách hàng thông minh & hiện đại
                  </p>
                </div>
              </div>
              
              <div className="text-right bg-white/15 backdrop-blur-xl rounded-2xl p-4 border border-white/20">
                <div className="text-blue-200 text-sm font-medium mb-1">
                  {isSearching ? 'Kết quả tìm kiếm' : 'Tổng khách hàng'}
                </div>
                <div className="text-3xl font-bold text-white tracking-tight">
                  {isSearching ? displayTotal.toLocaleString() : animatedTotal.toLocaleString()}
                </div>
                
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-h-0 p-6 space-y-6 overflow-visible">
          {/* Search Section */}
          <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl rounded-2xl p-5 shadow-xl border border-white/50">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <Input
                  placeholder="🔍 Tìm kiếm khách hàng..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-12 h-12 border-2 border-gray-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-200 rounded-xl text-base font-medium placeholder:text-gray-400 bg-white/70 backdrop-blur transition-all duration-200"
                />
                {searchTerm && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <div className="bg-blue-100 text-blue-600 px-2 py-1 rounded-lg text-xs font-semibold">
                      {displayTotal} kết quả
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105">
                <Filter className="w-5 h-5" />
                <span className="font-semibold">
                  {displayCount.toLocaleString()}/{displayTotal.toLocaleString()} khách hàng
                </span>
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex-shrink-0 bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-2xl p-4 text-red-700 shadow-lg">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-red-200 rounded-full flex items-center justify-center">
                  <span className="text-red-600 text-sm font-bold">!</span>
                </div>
                <span className="font-medium">{error}</span>
              </div>
            </div>
          )}

          {/* Customer List */}
          <div className="flex-1 relative bg-white/70 backdrop-blur-xl rounded-2xl shadow-2xl border border-white/60 min-h-0 overflow-y-auto flex flex-col">
            {loading && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="text-center">
                  <div className="relative">
                    <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                    <div className="absolute inset-0 w-12 h-12 animate-ping mx-auto border-2 border-blue-300 rounded-full opacity-30"></div>
                  </div>
                  <p className="text-base font-semibold text-gray-700">Đang tải dữ liệu...</p>
                  <p className="text-sm text-gray-500 mt-1">Vui lòng chờ trong giây lát</p>
                </div>
              </div>
            )}
            
            <ScrollArea className="flex-1 min-h-0 h-full">
              <div className="p-4 min-h-0 space-y-3">
                {currentItems.map((item, index) => {
                  if (!item || !item.customer_name) return null;
                  
                  const tier = getCustomerTier(item.orders);
                  const TierIcon = tier.icon;
                  
                  return (
                    <div 
                      key={`${item.customer_name}-${index}`} 
                      className={`group relative overflow-hidden bg-white/90 backdrop-blur-sm rounded-2xl p-4 hover:bg-white transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border-2 border-transparent hover:border-blue-200 ${tier.glow} hover:${tier.glow}`}
                    >
                      <div className="absolute inset-0 bg-gradient-to-r from-blue-50/0 to-purple-50/0 group-hover:from-blue-50/50 group-hover:to-purple-50/50 transition-all duration-300 rounded-2xl"></div>
                      
                      <div className="relative flex items-center gap-4 flex-nowrap">
                        <div className="relative flex-shrink-0">
                          <div className={`w-16 h-16 bg-gradient-to-br ${tier.gradient} rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 group-hover:scale-110 group-hover:rotate-6`}>
                            <TierIcon className="w-7 h-7 text-white" />
                          </div>
                          <div className={`absolute -top-2 -right-2 px-2 py-1 ${tier.bg} ${tier.text} text-xs font-bold rounded-xl ${tier.border} border-2 shadow-lg backdrop-blur transition-all duration-300 group-hover:scale-110`}>
                            {tier.tier}
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full flex items-center justify-center">
                            <div className="w-2 h-2 bg-white rounded-full"></div>
                          </div>
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg text-gray-900 group-hover:text-blue-700 transition-colors truncate mb-2" title={item.customer_name}>
                            {item.customer_name}
                          </h3>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-blue-100 to-indigo-100 rounded-xl border border-blue-200 shadow-sm">
                              <ShoppingBag className="w-4 h-4 text-blue-600" />
                              <span className="text-blue-800 font-bold text-sm">
                                {(item.orders || 0).toLocaleString()} đơn hàng
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <Button 
                          onClick={() => onSelectCustomer?.(item.customer_name)}
                          className="flex-shrink-0 flex items-center whitespace-nowrap bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-12 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 font-semibold"
                        >
                                                    <span className="inline-flex items-center gap-2 whitespace-nowrap">
                            <Eye className="w-4 h-4" />
                            <span>Xem đơn hàng</span>
                          </span>
                        </Button>
                      </div>
                    </div>
                  );
                })}
                
                {/* Empty State */}
                {currentItems.length === 0 && !loading && (
                  <div className="text-center py-16">
                    <div className="relative inline-flex items-center justify-center">
                      <div className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center shadow-lg">
                        <Users className="w-12 h-12 text-gray-400" />
                      </div>
                      <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                        <Search className="w-4 h-4 text-white" />
                      </div>
                    </div>
                    <h3 className="font-bold text-xl text-gray-900 mb-2 mt-6">
                      {isSearching ? '🔍 Không tìm thấy khách hàng' : '📝 Danh sách trống'}
                    </h3>
                    <p className="text-base text-gray-600 max-w-md mx-auto">
                      {isSearching 
                        ? `Không có kết quả phù hợp cho "${searchTerm}". Thử tìm kiếm với từ khóa khác.` 
                        : 'Chưa có khách hàng nào trong hệ thống. Hãy thêm khách hàng đầu tiên!'
                      }
                    </p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>

          {/* Pagination - Only show when not searching and has multiple pages */}
          {!isSearching && currentTotalPages > 1 && (
            <div className="flex-shrink-0 bg-white/80 backdrop-blur-xl rounded-2xl p-5 border border-white/50 shadow-xl">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
                      <div className="absolute inset-0 w-3 h-3 bg-green-400 rounded-full animate-ping opacity-30"></div>
                    </div>
                    <span className="text-gray-700 font-semibold">
                      Hiển thị <span className="text-blue-600 font-bold">{displayCount}</span> / <span className="text-purple-600 font-bold">{displayTotal.toLocaleString()}</span>
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <span className="text-gray-700 font-semibold">Số lượng:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                      className="border-2 border-gray-300 rounded-xl px-3 py-2 text-sm bg-white/90 backdrop-blur focus:border-blue-500 focus:ring-4 focus:ring-blue-200 font-semibold transition-all duration-200 shadow-sm"
                    >
                      {[10, 20, 30, 50].map((s) => (
                        <option key={s} value={s}>{s}/trang</option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <div className="flex items-center gap-4">
                  <span className="text-gray-700 font-semibold bg-gray-100 px-4 py-2 rounded-xl">
                    Trang <span className="text-blue-600 font-bold">{page}</span> / <span className="text-purple-600 font-bold">{currentTotalPages}</span>
                  </span>
                  <PaginationComponent
                    currentPage={page}
                    totalPages={currentTotalPages}
                    onPageChange={handlePageChange}
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}