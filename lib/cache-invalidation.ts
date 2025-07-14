/**
 * Global cache invalidation service
 * Quản lý việc invalidate cache khi có các action update/create/delete
 */

type CacheInvalidationEvent = 
  | 'debt-updated'
  | 'debt-created' 
  | 'debt-deleted'
  | 'debt-config-updated'
  | 'user-updated'
  | 'department-updated'
  | 'product-updated'
  | 'all';

type InvalidationCallback = () => void;

class CacheInvalidationService {
  private listeners: Map<CacheInvalidationEvent, Set<InvalidationCallback>> = new Map();

  // Subscribe to cache invalidation events
  subscribe(event: CacheInvalidationEvent, callback: InvalidationCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      this.listeners.get(event)?.delete(callback);
    };
  }

  // Trigger cache invalidation
  invalidate(event: CacheInvalidationEvent) {

    
    // Notify specific event listeners
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error('Error in cache invalidation callback:', error);
        }
      });
    }

    // If not 'all' event, also trigger 'all' listeners
    if (event !== 'all') {
      const allListeners = this.listeners.get('all');
      if (allListeners) {
        allListeners.forEach(callback => {
          try {
            callback();
          } catch (error) {
            console.error('Error in global cache invalidation callback:', error);
          }
        });
      }
    }
  }

  // Clear all listeners
  clear() {
    this.listeners.clear();
  }

  // Get current listener count for debugging
  getListenerCount(event?: CacheInvalidationEvent): number {
    if (event) {
      return this.listeners.get(event)?.size || 0;
    }
    
    let total = 0;
    this.listeners.forEach(set => {
      total += set.size;
    });
    return total;
  }
}

// Singleton instance
export const cacheInvalidationService = new CacheInvalidationService();

// React hook to use cache invalidation
import { useEffect } from 'react';

export const useCacheInvalidation = (
  event: CacheInvalidationEvent | CacheInvalidationEvent[],
  callback: InvalidationCallback
) => {
  useEffect(() => {
    const events = Array.isArray(event) ? event : [event];
    const unsubscribeFns = events.map(e => 
      cacheInvalidationService.subscribe(e, callback)
    );

    return () => {
      unsubscribeFns.forEach(fn => fn());
    };
  }, [event, callback]);
};

// Helper function to invalidate multiple cache types
export const invalidateRelatedCaches = (primaryEvent: CacheInvalidationEvent) => {
  cacheInvalidationService.invalidate(primaryEvent);
  
  // Define related cache invalidations
  const relations: Record<CacheInvalidationEvent, CacheInvalidationEvent[]> = {
    'debt-updated': ['debt-created'], // debt updates might affect debt statistics
    'debt-created': ['debt-updated'],
    'debt-deleted': ['debt-updated', 'debt-created'],
    'debt-config-updated': ['debt-updated'],
    'user-updated': ['department-updated'], // user changes might affect department stats
    'department-updated': ['user-updated'],
    'product-updated': ['debt-updated'], // product changes might affect debt calculations
    'all': []
  };

  const relatedEvents = relations[primaryEvent] || [];
  relatedEvents.forEach(relatedEvent => {
    cacheInvalidationService.invalidate(relatedEvent);
  });
};
