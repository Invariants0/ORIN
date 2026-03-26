import React from 'react';
import { cn } from '@/lib/utils';

interface ProgressProps {
  value: number;
  className?: string;
  color?: string;
}

export const BrandProgress = ({ value, className, color = 'bg-black' }: ProgressProps) => {
  return (
    <div className={cn('w-full h-3 bg-white border-2 border-black rounded-full overflow-hidden shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]', className)}>
      <div
        className={cn('h-full transition-all duration-500 ease-out', color)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
};
