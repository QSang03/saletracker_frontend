import { formatCurrency, numberCompact } from '@/lib/order-helper';
import React, { useState, useEffect, useRef } from 'react';

interface CountUpAnimationProps {
  value: number;
  duration?: number;
  isCurrency?: boolean;
}

const CountUpAnimation: React.FC<CountUpAnimationProps> = ({
  value,
  duration = 800,
  isCurrency = false,
}) => {
  const [display, setDisplay] = useState(0);
  const startRef = useRef<number | null>(null);
  const fromRef = useRef(0);

  useEffect(() => {
    const from = fromRef.current;
    const to = value;

    const step = (timestamp: number) => {
      if (startRef.current == null) startRef.current = timestamp;
      const progress = Math.min(1, (timestamp - startRef.current) / duration);
      const easeOutQuart = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * easeOutQuart);
      setDisplay(current);

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        startRef.current = null;
      }
    };

    const id = requestAnimationFrame(step);
    return () => cancelAnimationFrame(id);
  }, [value, duration]);

  if (isCurrency) {
    return <>{formatCurrency(display)}</>;
  }

  return <>{numberCompact(display)}</>;
};

export default CountUpAnimation;
