import React from 'react';
import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={cn(
          "w-full px-4 py-3 bg-white border-2 border-black rounded-lg text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#ffe17c] transition-all",
          className
        )}
        {...props}
      />
    );
  }
);

Input.displayName = 'Input';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full px-4 py-3 bg-white border-2 border-black rounded-lg text-black placeholder:text-neutral-400 focus:outline-none focus:ring-2 focus:ring-[#ffe17c] transition-all min-h-[100px] resize-none",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
