// hooks/usePerformance.ts
import { useCallback, useMemo, useRef, useEffect, useState } from 'react';

// Hook để debounce function calls
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const timeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => callback(...args), delay);
    }) as T,
    [callback, delay]
  );
}

// Hook để throttle function calls
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): T {
  const lastCallRef = useRef(0);
  const lastCallTimerRef = useRef<NodeJS.Timeout | undefined>(undefined);

  return useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      
      if (now - lastCallRef.current >= delay) {
        callback(...args);
        lastCallRef.current = now;
      } else {
        if (lastCallTimerRef.current) {
          clearTimeout(lastCallTimerRef.current);
        }
        lastCallTimerRef.current = setTimeout(() => {
          callback(...args);
          lastCallRef.current = Date.now();
        }, delay - (now - lastCallRef.current));
      }
    }) as T,
    [callback, delay]
  );
}

// Hook để memoize expensive calculations
export function useMemoizedValue<T>(
  factory: () => T,
  deps: React.DependencyList,
  equalityFn?: (prev: T, next: T) => boolean
): T {
  const prevValueRef = useRef<T | undefined>(undefined);
  const prevDepsRef = useRef<React.DependencyList | undefined>(undefined);

  return useMemo(() => {
    const newValue = factory();
    
    // Check if dependencies changed
    const depsChanged = !prevDepsRef.current || 
      prevDepsRef.current.length !== deps.length ||
      prevDepsRef.current.some((dep, index) => dep !== deps[index]);

    if (!depsChanged && prevValueRef.current !== undefined) {
      // Use custom equality function if provided
      if (equalityFn && equalityFn(prevValueRef.current, newValue)) {
        return prevValueRef.current;
      }
    }

    prevValueRef.current = newValue;
    prevDepsRef.current = deps;
    return newValue;
  }, deps);
}

// Hook để track component render performance
export function useRenderTracker(componentName: string) {
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  useEffect(() => {
    renderCountRef.current++;
    const now = performance.now();
    const timeSinceLastRender = now - lastRenderTimeRef.current;
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[${componentName}] Render #${renderCountRef.current} (${timeSinceLastRender.toFixed(2)}ms)`);
    }
    
    lastRenderTimeRef.current = now;
  });

  return {
    renderCount: renderCountRef.current,
    timeSinceLastRender: () => performance.now() - lastRenderTimeRef.current,
  };
}

// Hook để lazy load components
export function useLazyComponent<T extends React.ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const [Component, setComponent] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);

    importFn()
      .then((module) => {
        setComponent(() => module.default);
        setLoading(false);
      })
      .catch((err) => {
        setError(err);
        setLoading(false);
      });
  }, [importFn]);

  return { Component, loading, error, fallback };
}

// Hook để optimize list rendering
export function useVirtualizedList<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.startIndex * itemHeight;

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);

  return {
    visibleItems,
    visibleRange,
    totalHeight,
    offsetY,
    handleScroll,
    scrollTop,
  };
}

// Hook để optimize form inputs
export function useFormOptimization<T extends Record<string, any>>(
  initialValues: T,
  validationSchema?: any
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounced validation
  const debouncedValidate = useDebounce(async (fieldValues: T) => {
    if (!validationSchema) return;

    try {
      await validationSchema.validate(fieldValues, { abortEarly: false });
      setErrors({});
    } catch (validationErrors: any) {
      const newErrors: Partial<Record<keyof T, string>> = {};
      validationErrors.inner?.forEach((error: any) => {
        newErrors[error.path as keyof T] = error.message;
      });
      setErrors(newErrors);
    }
  }, 300);

  const handleChange = useCallback((name: keyof T, value: any) => {
    const newValues = { ...values, [name]: value };
    setValues(newValues);
    debouncedValidate(newValues);
  }, [values, debouncedValidate]);

  const handleBlur = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
  }, []);

  const handleSubmit = useCallback(async (onSubmit: (values: T) => Promise<void>) => {
    setIsSubmitting(true);
    try {
      await onSubmit(values);
    } finally {
      setIsSubmitting(false);
    }
  }, [values]);

  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    reset,
  };
}

// Hook để optimize image loading
export function useImageOptimization(
  src: string,
  options: {
    lazy?: boolean;
    placeholder?: string;
    onLoad?: () => void;
    onError?: () => void;
  } = {}
) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement | undefined>(undefined);

  const { lazy = true, placeholder, onLoad, onError } = options;

  useEffect(() => {
    if (!src) return;

    const img = new Image();
    imgRef.current = img;

    img.onload = () => {
      setLoading(false);
      setLoaded(true);
      setError(false);
      onLoad?.();
    };

    img.onerror = () => {
      setLoading(false);
      setError(true);
      setLoaded(false);
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [src, onLoad, onError]);

  return {
    loading,
    error,
    loaded,
    src: loaded ? src : placeholder,
    imgRef,
  };
}

// Hook để optimize animations
export function useAnimationOptimization(
  duration: number = 300,
  easing: string = 'ease-in-out'
) {
  const [isAnimating, setIsAnimating] = useState(false);
  const animationRef = useRef<number | undefined>(undefined);

  const animate = useCallback((callback: () => void) => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }

    setIsAnimating(true);
    const startTime = performance.now();

    const animateFrame = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);

      callback();

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animateFrame);
      } else {
        setIsAnimating(false);
      }
    };

    animationRef.current = requestAnimationFrame(animateFrame);
  }, [duration]);

  const stopAnimation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      setIsAnimating(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return {
    isAnimating,
    animate,
    stopAnimation,
  };
}

// Hook để optimize event listeners
export function useEventListener<T extends Event>(
  eventName: string,
  handler: (event: T) => void,
  element: EventTarget | null = window,
  options?: AddEventListenerOptions
) {
  const savedHandler = useRef(handler);

  useEffect(() => {
    savedHandler.current = handler;
  }, [handler]);

  useEffect(() => {
    if (!element) return;

    const eventListener = (event: Event) => savedHandler.current(event as T);
    element.addEventListener(eventName, eventListener, options);

    return () => {
      element.removeEventListener(eventName, eventListener, options);
    };
  }, [eventName, element, options]);
}

// Hook để optimize intersection observer
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState<IntersectionObserverEntry | null>(null);
  const elementRef = useRef<Element | null>(null);

  const callback = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    setIsIntersecting(entry.isIntersecting);
    setEntry(entry);
  }, []);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(callback, options);
    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [callback, options]);

  return {
    elementRef,
    isIntersecting,
    entry,
  };
}
