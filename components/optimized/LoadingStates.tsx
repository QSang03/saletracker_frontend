// components/optimized/LoadingStates.tsx
import React, { memo, useMemo } from 'react';

// Skeleton Loading Component
interface SkeletonProps {
  width?: string | number;
  height?: string | number;
  className?: string;
  animated?: boolean;
}

export const Skeleton = memo<SkeletonProps>(({
  width = '100%',
  height = '20px',
  className = '',
  animated = true,
}) => {
  const style = useMemo(() => ({
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  }), [width, height]);

  const skeletonClasses = useMemo(() => {
    const baseClasses = 'bg-gray-200 rounded';
    const animationClasses = animated ? 'animate-pulse' : '';
    return `${baseClasses} ${animationClasses} ${className}`;
  }, [animated, className]);

  return (
    <div
      className={skeletonClasses}
      style={style}
    />
  );
});

Skeleton.displayName = 'Skeleton';

// Skeleton Text Component
interface SkeletonTextProps {
  lines?: number;
  lineHeight?: number;
  className?: string;
  animated?: boolean;
}

export const SkeletonText = memo<SkeletonTextProps>(({
  lines = 3,
  lineHeight = 20,
  className = '',
  animated = true,
}) => {
  const skeletonLines = useMemo(() => {
    return Array.from({ length: lines }, (_, index) => (
      <Skeleton
        key={index}
        height={lineHeight}
        className={index === lines - 1 ? 'w-3/4' : 'w-full'}
        animated={animated}
      />
    ));
  }, [lines, lineHeight, animated]);

  return (
    <div className={`space-y-2 ${className}`}>
      {skeletonLines}
    </div>
  );
});

SkeletonText.displayName = 'SkeletonText';

// Skeleton Card Component
interface SkeletonCardProps {
  className?: string;
  animated?: boolean;
}

export const SkeletonCard = memo<SkeletonCardProps>(({
  className = '',
  animated = true,
}) => {
  return (
    <div className={`p-4 border border-gray-200 rounded-lg ${className}`}>
      <div className="space-y-3">
        <Skeleton height={24} width="60%" animated={animated} />
        <SkeletonText lines={2} animated={animated} />
        <div className="flex space-x-2">
          <Skeleton height={32} width={80} animated={animated} />
          <Skeleton height={32} width={80} animated={animated} />
        </div>
      </div>
    </div>
  );
});

SkeletonCard.displayName = 'SkeletonCard';

// Skeleton Table Row Component
interface SkeletonTableRowProps {
  columns: number;
  className?: string;
  animated?: boolean;
}

export const SkeletonTableRow = memo<SkeletonTableRowProps>(({
  columns,
  className = '',
  animated = true,
}) => {
  const skeletonCells = useMemo(() => {
    return Array.from({ length: columns }, (_, index) => (
      <td key={index} className="px-4 py-2">
        <Skeleton height={16} animated={animated} />
      </td>
    ));
  }, [columns, animated]);

  return (
    <tr className={className}>
      {skeletonCells}
    </tr>
  );
});

SkeletonTableRow.displayName = 'SkeletonTableRow';

// Progressive Loading Component
interface ProgressiveLoadingProps {
  isLoading: boolean;
  error?: string | null;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  errorFallback?: React.ReactNode;
  className?: string;
}

export const ProgressiveLoading = memo<ProgressiveLoadingProps>(({
  isLoading,
  error,
  children,
  fallback,
  errorFallback,
  className = '',
}) => {
  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        {errorFallback || (
          <div className="text-red-600">
            <p className="text-lg font-semibold">Đã xảy ra lỗi</p>
            <p className="text-sm mt-2">{error}</p>
          </div>
        )}
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className={className}>
        {fallback || <SkeletonText lines={5} />}
      </div>
    );
  }

  return <>{children}</>;
});

ProgressiveLoading.displayName = 'ProgressiveLoading';

// Infinite Scroll Loading
interface InfiniteScrollLoadingProps {
  hasMore: boolean;
  isLoading: boolean;
  onLoadMore: () => void;
  threshold?: number;
  className?: string;
}

export const InfiniteScrollLoading = memo<InfiniteScrollLoadingProps>(({
  hasMore,
  isLoading,
  onLoadMore,
  threshold = 100,
  className = '',
}) => {
  const handleScroll = useMemo(() => {
    return (event: React.UIEvent<HTMLDivElement>) => {
      const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
      const isNearBottom = scrollTop + clientHeight >= scrollHeight - threshold;
      
      if (isNearBottom && hasMore && !isLoading) {
        onLoadMore();
      }
    };
  }, [hasMore, isLoading, onLoadMore, threshold]);

  return (
    <div
      className={`overflow-auto ${className}`}
      onScroll={handleScroll}
    >
      {hasMore && isLoading && (
        <div className="flex justify-center py-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      )}
    </div>
  );
});

InfiniteScrollLoading.displayName = 'InfiniteScrollLoading';

// Loading Spinner Component
interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  className?: string;
}

export const LoadingSpinner = memo<LoadingSpinnerProps>(({
  size = 'md',
  color = 'blue',
  className = '',
}) => {
  const sizeClasses = useMemo(() => {
    switch (size) {
      case 'sm':
        return 'h-4 w-4';
      case 'lg':
        return 'h-12 w-12';
      default:
        return 'h-8 w-8';
    }
  }, [size]);

  const colorClasses = useMemo(() => {
    switch (color) {
      case 'red':
        return 'border-red-600';
      case 'green':
        return 'border-green-600';
      case 'yellow':
        return 'border-yellow-600';
      case 'purple':
        return 'border-purple-600';
      default:
        return 'border-blue-600';
    }
  }, [color]);

  return (
    <div
      className={`animate-spin rounded-full border-2 border-gray-300 border-t-${colorClasses} ${sizeClasses} ${className}`}
    />
  );
});

LoadingSpinner.displayName = 'LoadingSpinner';

// Loading Button Component
interface LoadingButtonProps {
  isLoading: boolean;
  loadingText?: string;
  children: React.ReactNode;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
  type?: 'button' | 'submit' | 'reset';
}

export const LoadingButton = memo<LoadingButtonProps>(({
  isLoading,
  loadingText = 'Đang tải...',
  children,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
}) => {
  const buttonClasses = useMemo(() => {
    const baseClasses = 'px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2';
    const stateClasses = isLoading || disabled
      ? 'bg-gray-400 cursor-not-allowed'
      : 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white';
    return `${baseClasses} ${stateClasses} ${className}`;
  }, [isLoading, disabled, className]);

  return (
    <button
      type={type}
      className={buttonClasses}
      disabled={isLoading || disabled}
      onClick={onClick}
    >
      {isLoading ? (
        <div className="flex items-center space-x-2">
          <LoadingSpinner size="sm" color="white" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </button>
  );
});

LoadingButton.displayName = 'LoadingButton';

// Loading Overlay Component
interface LoadingOverlayProps {
  isLoading: boolean;
  children: React.ReactNode;
  className?: string;
  backdrop?: boolean;
}

export const LoadingOverlay = memo<LoadingOverlayProps>(({
  isLoading,
  children,
  className = '',
  backdrop = true,
}) => {
  if (!isLoading) {
    return <>{children}</>;
  }

  return (
    <div className={`relative ${className}`}>
      {children}
      {backdrop && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 shadow-lg">
            <LoadingSpinner size="lg" />
            <p className="mt-2 text-gray-600">Đang tải...</p>
          </div>
        </div>
      )}
    </div>
  );
});

LoadingOverlay.displayName = 'LoadingOverlay';

// Lazy Loading Image Component
interface LazyLoadingImageProps {
  src: string;
  alt: string;
  placeholder?: string;
  className?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export const LazyLoadingImage = memo<LazyLoadingImageProps>(({
  src,
  alt,
  placeholder,
  className = '',
  onLoad,
  onError,
}) => {
  const [isLoading, setIsLoading] = React.useState(true);
  const [hasError, setHasError] = React.useState(false);

  const handleLoad = React.useCallback(() => {
    setIsLoading(false);
    onLoad?.();
  }, [onLoad]);

  const handleError = React.useCallback(() => {
    setIsLoading(false);
    setHasError(true);
    onError?.();
  }, [onError]);

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <LoadingSpinner size="md" />
        </div>
      )}
      <img
        src={hasError ? placeholder : src}
        alt={alt}
        className={`w-full h-full object-cover ${isLoading ? 'opacity-0' : 'opacity-100'}`}
        onLoad={handleLoad}
        onError={handleError}
        loading="lazy"
      />
    </div>
  );
});

LazyLoadingImage.displayName = 'LazyLoadingImage';
