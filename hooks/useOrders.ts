import { useState, useCallback, useEffect } from 'react';
import { Order, OrderDetail } from '@/types';
import { getAccessToken } from '@/lib/auth';

interface OrderFilters {
  page: number;
  pageSize: number;
  search?: string;
  status?: string;
  date?: string;
  dateRange?: { start: string; end: string };
  employee?: string;
  employees?: string;
  departments?: string;
  products?: string;
  warningLevel?: string;
}

interface OrdersResponse {
  data: OrderDetail[];
  total: number;
  page: number;
  pageSize: number;
}

interface UseOrdersReturn {
  // State
  orders: OrderDetail[];
  total: number;
  filters: OrderFilters;
  
  // State setters
  setFilters: (filters: Partial<OrderFilters>) => void;
  setPage: (page: number) => void;
  setPageSize: (pageSize: number) => void;
  setSearch: (search: string) => void;
  setStatus: (status: string) => void;
  setDate: (date: string) => void;
  setDateRange: (dateRange: { start: string; end: string } | undefined) => void;
  setEmployee: (employee: string) => void;
  setEmployees: (employees: string) => void;
  setDepartments: (departments: string) => void;
  setProducts: (products: string) => void;
  setWarningLevel: (warningLevel: string) => void;
  
  // Actions
  refetch: () => Promise<void>;
  resetFilters: () => void;
  getFilterOptions: () => Promise<{ departments: any[], products: any[] }>;
  
  // CRUD methods
  createOrder: (orderData: Partial<Order>) => Promise<Order>;
  updateOrder: (id: number, orderData: Partial<Order>) => Promise<Order>;
  deleteOrder: (id: number) => Promise<void>;
  getOrderById: (id: number) => Promise<Order>;
  
  // Order Details methods
  fetchOrderDetails: (orderId: number) => Promise<OrderDetail[]>;
  createOrderDetail: (orderDetailData: Partial<OrderDetail>) => Promise<OrderDetail>;
  updateOrderDetail: (id: number, orderDetailData: Partial<OrderDetail>) => Promise<OrderDetail>;
  deleteOrderDetail: (id: number) => Promise<void>;
  getOrderDetailById: (id: number) => Promise<OrderDetail>;
  
  // Loading states
  isLoading: boolean;
  error: string | null;
}

// ✅ Helper function để get pageSize từ localStorage - LOẠI BỎ giới hạn upper limit
const getPageSizeFromStorage = (defaultSize: number = 10): number => {
  if (typeof window === 'undefined') return defaultSize;
  
  try {
    const saved = localStorage.getItem('orderPageSize');
    if (saved) {
      const parsed = parseInt(saved);
      // ✅ CHỈ check > 0, KHÔNG giới hạn trên
      return parsed > 0 ? parsed : defaultSize;
    }
  } catch (error) {
    console.warn('Error reading orderPageSize from localStorage:', error);
  }
  
  return defaultSize;
};

// ✅ Helper function để save pageSize vào localStorage
const savePageSizeToStorage = (pageSize: number): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem('orderPageSize', pageSize.toString());
  } catch (error) {
    console.warn('Error saving orderPageSize to localStorage:', error);
  }
};

// ✅ Helper function để clear pageSize từ localStorage
const clearPageSizeFromStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('orderPageSize');
  } catch (error) {
    console.warn('Error clearing orderPageSize from localStorage:', error);
  }
};

// ✅ Helper functions để save/load tất cả filters từ localStorage
const saveFiltersToStorage = (filters: OrderFilters): void => {
  if (typeof window === 'undefined') return;
  
  try {
    const filtersToSave = {
      search: filters.search || '',
      status: filters.status || '',
      date: filters.date || '',
      dateRange: filters.dateRange || null,
      employee: filters.employee || '',
      employees: filters.employees || '',
      departments: filters.departments || '',
      products: filters.products || '',
      warningLevel: filters.warningLevel || '',
    };
    localStorage.setItem('orderFilters', JSON.stringify(filtersToSave));
  } catch (error) {
    console.warn('Error saving filters to localStorage:', error);
  }
};

const getFiltersFromStorage = (): Partial<OrderFilters> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const saved = localStorage.getItem('orderFilters');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (error) {
    console.warn('Error reading filters from localStorage:', error);
  }
  return {};
};

const clearFiltersFromStorage = (): void => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.removeItem('orderFilters');
  } catch (error) {
    console.warn('Error clearing filters from localStorage:', error);
  }
};

export const useOrders = (): UseOrdersReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [orders, setOrders] = useState<OrderDetail[]>([]);
  const [total, setTotal] = useState(0);
  
  // ✅ Khởi tạo filters với pageSize và filters từ localStorage
  const [filters, setFiltersState] = useState<OrderFilters>(() => {
    const initialPageSize = getPageSizeFromStorage(10);
    const savedFilters = getFiltersFromStorage();
    
    return {
      page: 1, // Page luôn bắt đầu từ 1
      pageSize: initialPageSize,
      search: savedFilters.search || '',
      status: savedFilters.status || '',
      date: savedFilters.date || '',
      dateRange: savedFilters.dateRange || undefined,
      employee: savedFilters.employee || '',
      employees: savedFilters.employees || '',
      departments: savedFilters.departments || '',
      products: savedFilters.products || '',
      warningLevel: savedFilters.warningLevel || '',
    };
  });

  const handleApiCall = useCallback(async <T>(apiCall: () => Promise<T>): Promise<T> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const result = await apiCall();
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Đã xảy ra lỗi';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getAuthHeaders = useCallback(() => {
    const token = getAccessToken();
    if (!token) throw new Error('No token available');
    
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };
  }, []);

  const fetchOrdersInternal = useCallback(async (currentFilters: OrderFilters): Promise<void> => {
    return handleApiCall(async () => {
      const params = new URLSearchParams();
      
      params.append('page', currentFilters.page.toString());
      params.append('pageSize', currentFilters.pageSize.toString());
      
      if (currentFilters.search && currentFilters.search.trim()) {
        params.append('search', currentFilters.search.trim());
      }
      if (currentFilters.status && currentFilters.status.trim()) {
        params.append('status', currentFilters.status.trim());
      }
      if (currentFilters.date && currentFilters.date.trim()) {
        params.append('date', currentFilters.date.trim());
      }
      if (currentFilters.dateRange) {
        params.append('dateRange', JSON.stringify(currentFilters.dateRange));
      }
      if (currentFilters.employee && currentFilters.employee.trim()) {
        params.append('employee', currentFilters.employee.trim());
      }
      if (currentFilters.employees && currentFilters.employees.trim()) {
        params.append('employees', currentFilters.employees.trim());
      }
      if (currentFilters.departments && currentFilters.departments.trim()) {
        params.append('departments', currentFilters.departments.trim());
      }
      if (currentFilters.products && currentFilters.products.trim()) {
        params.append('products', currentFilters.products.trim());
      }
      if (currentFilters.warningLevel && currentFilters.warningLevel.trim()) {
        params.append('warningLevel', currentFilters.warningLevel.trim());
      }

      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders?${params.toString()}`, {
        method: 'GET',
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to fetch orders: ${res.status}`);
      
      const result = await res.json();
      
      if (result.data && Array.isArray(result.data)) {
        setOrders(result.data);
        setTotal(result.total || result.data.length);
      } else if (Array.isArray(result)) {
        setOrders(result);
        setTotal(result.length);
      } else {
        setOrders([]);
        setTotal(0);
      }
    });
  }, [getAuthHeaders, handleApiCall]);

  // State setters
  const setFilters = useCallback((newFilters: Partial<OrderFilters>) => {
    setFiltersState(prev => {
      const updated = { ...prev, ...newFilters };
      // Save to localStorage
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setPage = useCallback((page: number) => {
    setFiltersState(prev => ({ ...prev, page }));
  }, []);

  // ✅ Cập nhật setPageSize - LOẠI BỎ giới hạn upper limit
  const setPageSize = useCallback((pageSize: number) => {
    
    // ✅ CHỈ validate > 0, KHÔNG giới hạn trên
    if (pageSize <= 0) {
      console.warn('❌ Invalid pageSize:', pageSize);
      return;
    }
    
    // Update state
    setFiltersState(prev => ({ ...prev, pageSize, page: 1 }));
    
    // Save to localStorage
    savePageSizeToStorage(pageSize);
  }, []);

  const setSearch = useCallback((search: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, search, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setStatus = useCallback((status: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, status, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setDate = useCallback((date: string) => {
    setFiltersState(prev => {
      const updated = { 
        ...prev, 
        date: date.trim() || undefined,
        page: 1 
      };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setEmployee = useCallback((employee: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, employee, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setDateRange = useCallback((dateRange: { start: string; end: string } | undefined) => {
    setFiltersState(prev => {
      const updated = { ...prev, dateRange, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setEmployees = useCallback((employees: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, employees, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setDepartments = useCallback((departments: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, departments, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setProducts = useCallback((products: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, products, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  const setWarningLevel = useCallback((warningLevel: string) => {
    setFiltersState(prev => {
      const updated = { ...prev, warningLevel, page: 1 };
      saveFiltersToStorage(updated);
      return updated;
    });
  }, []);

  // ✅ Cập nhật resetFilters để clear localStorage
  const resetFilters = useCallback(() => {
    
    const defaultPageSize = 10;
    
    // Clear localStorage
    clearPageSizeFromStorage();
    clearFiltersFromStorage(); // Thêm clear filters
    
    // Reset state
    setFiltersState({
      page: 1,
      pageSize: defaultPageSize,
      search: '',
      status: '',
      date: '',
      dateRange: undefined,
      employee: '',
      employees: '',
      departments: '',
      products: '',
      warningLevel: '',
    });
  }, []);

  const refetch = useCallback(async () => {
    await fetchOrdersInternal(filters);
  }, [filters, fetchOrdersInternal]);

  const getFilterOptions = useCallback(async (): Promise<{ departments: any[], products: any[] }> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/filter-options`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to fetch filter options: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  // Auto fetch when filters change
  useEffect(() => {
    fetchOrdersInternal(filters);
  }, [filters, fetchOrdersInternal]);

  // ✅ Debug effect để track localStorage changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
    }
  }, [filters.pageSize]);

  // CRUD methods
  const createOrder = useCallback(async (orderData: Partial<Order>): Promise<Order> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error(`Failed to create order: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  const updateOrder = useCallback(async (id: number, orderData: Partial<Order>): Promise<Order> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderData),
      });

      if (!res.ok) throw new Error(`Failed to update order: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  const deleteOrder = useCallback(async (id: number): Promise<void> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to delete order: ${res.status}`);
    });
  }, [handleApiCall, getAuthHeaders]);

  const getOrderById = useCallback(async (id: number): Promise<Order> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/orders/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to fetch order: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  // Order Details API methods
  const fetchOrderDetails = useCallback(async (orderId: number): Promise<OrderDetail[]> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/order/${orderId}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to fetch order details: ${res.status}`);
      const result = await res.json();
      return Array.isArray(result) ? result : [];
    });
  }, [handleApiCall, getAuthHeaders]);

  const createOrderDetail = useCallback(async (orderDetailData: Partial<OrderDetail>): Promise<OrderDetail> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderDetailData),
      });

      if (!res.ok) throw new Error(`Failed to create order detail: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  const updateOrderDetail = useCallback(async (id: number, orderDetailData: Partial<OrderDetail>): Promise<OrderDetail> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(orderDetailData),
      });

      if (!res.ok) throw new Error(`Failed to update order detail: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  const deleteOrderDetail = useCallback(async (id: number): Promise<void> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to delete order detail: ${res.status}`);
    });
  }, [handleApiCall, getAuthHeaders]);

  const getOrderDetailById = useCallback(async (id: number): Promise<OrderDetail> => {
    return handleApiCall(async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/order-details/${id}`, {
        headers: getAuthHeaders(),
      });

      if (!res.ok) throw new Error(`Failed to fetch order detail: ${res.status}`);
      return res.json();
    });
  }, [handleApiCall, getAuthHeaders]);

  return {
    // State
    orders,
    total,
    filters,
    
    // State setters
    setFilters,
    setPage,
    setPageSize, // ✅ Đã update để lưu localStorage và loại bỏ giới hạn
    setSearch,
    setStatus,
    setDate,
    setDateRange,
    setEmployee,
    setEmployees,
    setDepartments,
    setProducts,
    setWarningLevel,
    
    // Actions
    refetch,
    resetFilters, // ✅ Đã update để clear localStorage
    getFilterOptions,
    
    // CRUD methods
    createOrder,
    updateOrder,
    deleteOrder,
    getOrderById,
    
    // Order Details methods
    fetchOrderDetails,
    createOrderDetail,
    updateOrderDetail,
    deleteOrderDetail,
    getOrderDetailById,
    
    // Loading states
    isLoading,
    error,
  };
};
