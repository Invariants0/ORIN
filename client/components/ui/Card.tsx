import React from 'react';
import { cn } from '@/lib/utils';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'white' | 'yellow' | 'sage' | 'charcoal';
  hasShadow?: boolean;
  shadowSize?: 'sm' | 'lg';
}

export const Card = ({ 
  className, 
  variant = 'white', 
  hasShadow = true, 
  shadowSize = 'sm',
  children, 
  ...props 
}: CardProps) => {
  const variants = {
    white: "bg-white text-black",
    yellow: "bg-[#ffe17c] text-black",
    sage: "bg-[#b7c6c2] text-black",
    charcoal: "bg-[#171e19] text-white",
  };

  const shadows = {
    sm: "shadow-[4px_4px_0px_0px_#000000]",
    lg: "shadow-[8px_8px_0px_0px_#000000]",
  };

  return (
    <div
      className={cn(
        "border-2 border-black rounded-xl p-6 transition-all",
        variants[variant],
        hasShadow && shadows[shadowSize],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
};
