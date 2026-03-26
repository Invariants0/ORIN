import React from 'react';
import { cn } from '@/lib/utils';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'white' | 'yellow' | 'sage' | 'black';
}

export const BrandBadge = ({
  className,
  variant = 'white',
  children,
  ...props
}: BadgeProps) => {
  const variants = {
    white: 'bg-white text-black',
    yellow: 'bg-[#ffe17c] text-black',
    sage: 'bg-[#b7c6c2] text-black',
    black: 'bg-black text-white',
  };

  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border-2 border-black',
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
};
