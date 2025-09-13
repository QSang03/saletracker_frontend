// Frontend types for optimized transaction stats

export interface TransactionSummaryStats {
  // Current period stats
  chaoBan: number;
  completed: number;
  quoted: number;
  demand: number;
  pending: number;
  confirmed: number;
  totalRevenue: number;
  avgOrderValue: number;
  conversionRate: number;
  
  // Working days stats
  gdToday: number;
  gdYesterday: number;
  gd2DaysAgo: number;
  
  // Previous period stats for comparison
  prevChaoBan: number;
  prevCompleted: number;
  prevQuoted: number;
  prevDemand: number;
  prevPending: number;
  prevTotalRevenue: number;
  prevAvgOrderValue: number;
  prevConversionRate: number;
}

export interface TransactionChartPoint {
  name: string;
  timestamp: number;
  demand: number;
  completed: number;
  quoted: number;
  pending: number;
  confirmed: number;
}

export interface TransactionCustomerStat {
  name: string;
  total: number;
  completed: number;
  quoted: number;
  pending: number;
  demand: number;
  confirmed: number;
}

export interface TransactionEmployeeStat {
  id: number;
  name: string;
  orders: number;
  customers: number;
  completed: number;
  quoted: number;
  conversion: number;
}

export interface TransactionExpiredStats {
  expiredToday: number;
  overdue: number;
}

export interface TransactionStatsApiResponse {
  summary: TransactionSummaryStats;
  chartData: TransactionChartPoint[];
  customerStats: TransactionCustomerStat[];
  employeeStats: TransactionEmployeeStat[];
  expiredStats: TransactionExpiredStats;
  
  // Meta info
  totalRecords: number;
  dateRange: {
    from: string;
    to: string;
  };
  previousDateRange: {
    from: string;
    to: string;
  };
}

// Legacy types for backward compatibility
export interface ChartPoint {
  name: string;
  timestamp: number;
  demand: number;
  completed: number;
  quoted: number;
  pending: number;
}

export interface CustomerStat {
  name: string;
  total: number;
  completed: number;
  quoted: number;
  pending: number;
  demand: number;
  confirmed: number;
}

export interface EmployeeStat {
  id: number;
  name: string;
  orders: number;
  customers: number;
  completed: number;
  quoted: number;
  conversion: number;
}