// components/optimized/VirtualizedList.tsx
import React, { useCallback, useMemo, forwardRef } from 'react';
import { useVirtualizedList } from '@/hooks/usePerformance';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  onScroll?: (scrollTop: number) => void;
  className?: string;
  style?: React.CSSProperties;
}

export const VirtualizedList = forwardRef<HTMLDivElement, VirtualizedListProps<any>>(
  ({ items, itemHeight, containerHeight, overscan = 5, renderItem, onScroll, className, style }, ref) => {
    const {
      visibleItems,
      visibleRange,
      totalHeight,
      offsetY,
      handleScroll,
      scrollTop,
    } = useVirtualizedList(items, itemHeight, containerHeight, overscan);

    const handleScrollWithCallback = useCallback(
      (event: React.UIEvent<HTMLDivElement>) => {
        handleScroll(event);
        onScroll?.(event.currentTarget.scrollTop);
      },
      [handleScroll, onScroll]
    );

    const containerStyle = useMemo(
      () => ({
        height: containerHeight,
        overflow: 'auto',
        position: 'relative' as const,
        ...style,
      }),
      [containerHeight, style]
    );

    const contentStyle = useMemo(
      () => ({
        height: totalHeight,
        position: 'relative' as const,
      }),
      [totalHeight]
    );

    const itemsContainerStyle = useMemo(
      () => ({
        position: 'absolute' as const,
        top: offsetY,
        left: 0,
        right: 0,
      }),
      [offsetY]
    );

    return (
      <div
        ref={ref}
        className={className}
        style={containerStyle}
        onScroll={handleScrollWithCallback}
      >
        <div style={contentStyle}>
          <div style={itemsContainerStyle}>
            {visibleItems.map((item, index) => {
              const actualIndex = visibleRange.startIndex + index;
              return (
                <div
                  key={actualIndex}
                  style={{ height: itemHeight }}
                >
                  {renderItem(item, actualIndex)}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }
);

VirtualizedList.displayName = 'VirtualizedList';

// Optimized table component
interface OptimizedTableProps<T> {
  data: T[];
  columns: {
    key: string;
    header: string;
    render: (item: T, index: number) => React.ReactNode;
    width?: number;
  }[];
  rowHeight?: number;
  containerHeight?: number;
  className?: string;
  onRowClick?: (item: T, index: number) => void;
}

export const OptimizedTable = <T extends Record<string, any>>({
  data,
  columns,
  rowHeight = 50,
  containerHeight = 400,
  className,
  onRowClick,
}: OptimizedTableProps<T>) => {
  const renderRow = useCallback(
    (item: T, index: number) => (
      <tr
        key={index}
        onClick={() => onRowClick?.(item, index)}
        className={onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}
        style={{ height: rowHeight }}
      >
        {columns.map((column) => (
          <td
            key={column.key}
            style={{ width: column.width }}
            className="px-4 py-2 border-b border-gray-200"
          >
            {column.render(item, index)}
          </td>
        ))}
      </tr>
    ),
    [columns, rowHeight, onRowClick]
  );

  return (
    <div className={className}>
      <table className="w-full border-collapse">
        <thead>
          <tr style={{ height: rowHeight }}>
            {columns.map((column) => (
              <th
                key={column.key}
                style={{ width: column.width }}
                className="px-4 py-2 text-left font-semibold border-b border-gray-300 bg-gray-50"
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
      </table>
      <VirtualizedList
        items={data}
        itemHeight={rowHeight}
        containerHeight={containerHeight - rowHeight}
        renderItem={renderRow}
        className="border border-gray-200"
      />
    </div>
  );
};

// Optimized grid component
interface OptimizedGridProps<T> {
  items: T[];
  columns: number;
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export const OptimizedGrid = <T,>({
  items,
  columns,
  itemHeight,
  containerHeight,
  renderItem,
  gap = 16,
  className,
}: OptimizedGridProps<T>) => {
  const itemWidth = useMemo(() => {
    return `calc((100% - ${(columns - 1) * gap}px) / ${columns})`;
  }, [columns, gap]);

  const rows = useMemo(() => {
    const result = [];
    for (let i = 0; i < items.length; i += columns) {
      result.push(items.slice(i, i + columns));
    }
    return result;
  }, [items, columns]);

  const renderRow = useCallback(
    (rowItems: T[], rowIndex: number) => (
      <div
        key={rowIndex}
        style={{
          display: 'flex',
          gap: `${gap}px`,
          height: itemHeight,
          marginBottom: gap,
        }}
      >
        {rowItems.map((item, colIndex) => {
          const index = rowIndex * columns + colIndex;
          return (
            <div
              key={index}
              style={{
                width: itemWidth,
                height: '100%',
              }}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
      </div>
    ),
    [columns, gap, itemHeight, itemWidth, renderItem]
  );

  return (
    <VirtualizedList
      items={rows}
      itemHeight={itemHeight + gap}
      containerHeight={containerHeight}
      renderItem={renderRow}
      className={className}
    />
  );
};
