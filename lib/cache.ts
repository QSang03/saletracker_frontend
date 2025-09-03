// lib/cache.ts - Frontend caching service
interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

interface CacheConfig {
  defaultTTL: number; // milliseconds
  maxSize: number;
  cleanupInterval: number; // milliseconds
}

class FrontendCache {
  private cache = new Map<string, CacheItem<any>>();
  private config: CacheConfig = {
    defaultTTL: 5 * 60 * 1000, // 5 minutes
    maxSize: 100,
    cleanupInterval: 60 * 1000, // 1 minute
  };

  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config?: Partial<CacheConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
    this.startCleanup();
  }

  /**
   * Set cache item
   */
  set<T>(key: string, data: T, ttl?: number): void {
    // Remove oldest items if cache is full
    if (this.cache.size >= this.config.maxSize) {
      this.evictOldest();
    }

    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl: ttl || this.config.defaultTTL,
    };

    this.cache.set(key, item);
  }

  /**
   * Get cache item
   */
  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if expired
    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item.data;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Delete cache item
   */
  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache size
   */
  size(): number {
    return this.cache.size;
  }

  /**
   * Get cache keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate: number;
    keys: string[];
  } {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: 0, // TODO: Implement hit rate tracking
      keys: this.keys(),
    };
  }

  /**
   * Check if item is expired
   */
  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  /**
   * Remove oldest items
   */
  private evictOldest(): void {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
    
    // Remove 20% of oldest items
    const toRemove = Math.ceil(this.config.maxSize * 0.2);
    for (let i = 0; i < toRemove && i < entries.length; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Cleanup expired items
   */
  private cleanup(): void {
    const now = Date.now();
    for (const [key, item] of this.cache.entries()) {
      if (now - item.timestamp > item.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Stop cleanup timer
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Create global cache instance
export const frontendCache = new FrontendCache();

// Cache utilities for API responses
export const apiCache = {
  /**
   * Generate cache key from URL and params
   */
  generateKey(url: string, params?: Record<string, any>): string {
    const paramString = params ? JSON.stringify(params) : '';
    return `api:${url}:${paramString}`;
  },

  /**
   * Cache API response
   */
  setResponse<T>(url: string, params: Record<string, any> | undefined, data: T, ttl?: number): void {
    const key = this.generateKey(url, params);
    frontendCache.set(key, data, ttl);
  },

  /**
   * Get cached API response
   */
  getResponse<T>(url: string, params?: Record<string, any>): T | null {
    const key = this.generateKey(url, params);
    return frontendCache.get<T>(key);
  },

  /**
   * Check if API response is cached
   */
  hasResponse(url: string, params?: Record<string, any>): boolean {
    const key = this.generateKey(url, params);
    return frontendCache.has(key);
  },

  /**
   * Invalidate cache by pattern
   */
  invalidatePattern(pattern: string): void {
    const keys = frontendCache.keys();
    keys.forEach(key => {
      if (key.includes(pattern)) {
        frontendCache.delete(key);
      }
    });
  },

  /**
   * Invalidate all API cache
   */
  invalidateAll(): void {
    const keys = frontendCache.keys();
    keys.forEach(key => {
      if (key.startsWith('api:')) {
        frontendCache.delete(key);
      }
    });
  },
};

// Cache utilities for component data
export const componentCache = {
  /**
   * Generate cache key for component
   */
  generateKey(componentName: string, props?: Record<string, any>): string {
    const propsString = props ? JSON.stringify(props) : '';
    return `component:${componentName}:${propsString}`;
  },

  /**
   * Cache component data
   */
  setData<T>(componentName: string, props: Record<string, any> | undefined, data: T, ttl?: number): void {
    const key = this.generateKey(componentName, props);
    frontendCache.set(key, data, ttl);
  },

  /**
   * Get cached component data
   */
  getData<T>(componentName: string, props?: Record<string, any>): T | null {
    const key = this.generateKey(componentName, props);
    return frontendCache.get<T>(key);
  },

  /**
   * Check if component data is cached
   */
  hasData(componentName: string, props?: Record<string, any>): boolean {
    const key = this.generateKey(componentName, props);
    return frontendCache.has(key);
  },

  /**
   * Invalidate component cache
   */
  invalidate(componentName: string): void {
    const keys = frontendCache.keys();
    keys.forEach(key => {
      if (key.startsWith(`component:${componentName}:`)) {
        frontendCache.delete(key);
      }
    });
  },
};

// Cache utilities for user data
export const userCache = {
  /**
   * Generate cache key for user data
   */
  generateKey(userId: string, dataType: string): string {
    return `user:${userId}:${dataType}`;
  },

  /**
   * Cache user data
   */
  setData<T>(userId: string, dataType: string, data: T, ttl?: number): void {
    const key = this.generateKey(userId, dataType);
    frontendCache.set(key, data, ttl);
  },

  /**
   * Get cached user data
   */
  getData<T>(userId: string, dataType: string): T | null {
    const key = this.generateKey(userId, dataType);
    return frontendCache.get<T>(key);
  },

  /**
   * Check if user data is cached
   */
  hasData(userId: string, dataType: string): boolean {
    const key = this.generateKey(userId, dataType);
    return frontendCache.has(key);
  },

  /**
   * Invalidate user cache
   */
  invalidate(userId: string): void {
    const keys = frontendCache.keys();
    keys.forEach(key => {
      if (key.startsWith(`user:${userId}:`)) {
        frontendCache.delete(key);
      }
    });
  },
};

export default frontendCache;
