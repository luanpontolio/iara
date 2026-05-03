/**
 * Button Component
 * 
 * Primary UI button with multiple variants and sizes.
 */

'use client';

import React from 'react';
import { cn, createVariants, focusRing, transition } from '@/lib/utils/styles';

const buttonVariants = createVariants({
  base: cn(
    'inline-flex items-center justify-center',
    'font-sans font-medium',
    'border rounded-md',
    'cursor-pointer',
    'disabled:cursor-not-allowed disabled:opacity-50',
    transition(['background', 'color', 'border-color']),
    focusRing
  ),
  variants: {
    variant: {
      primary: cn(
        'bg-accent text-bg-primary',
        'border-transparent',
        'hover:bg-accent-hover'
      ),
      secondary: cn(
        'bg-bg-tertiary text-text-secondary',
        'border-border-default',
        'hover:bg-bg-elevated'
      ),
      ghost: cn(
        'bg-transparent text-text-tertiary',
        'border-transparent',
        'hover:text-text-secondary'
      ),
      danger: cn(
        'bg-error text-bg-primary',
        'border-transparent',
        'hover:opacity-90'
      ),
    },
    size: {
      sm: 'px-3 py-1.5 text-xs',
      md: 'px-4 py-2 text-sm',
      lg: 'px-6 py-3 text-base',
      xl: 'px-8 py-4 text-base tracking-wide',
    },
  },
  defaultVariants: {
    variant: 'primary',
    size: 'md',
  },
});

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
  asChild?: boolean;
}

/**
 * Button component with variants and sizes
 * 
 * @example
 * ```tsx
 * <Button variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </Button>
 * ```
 */
export function Button({
  variant = 'primary',
  size = 'md',
  className,
  children,
  asChild = false,
  ...props
}: ButtonProps) {
  const styles = buttonVariants({
    variant,
    size,
    ...(className != null ? { className } : {}),
  });

  if (asChild) {
    return (
      <span className={styles}>
        {children}
      </span>
    );
  }

  return (
    <button className={styles} {...props}>
      {children}
    </button>
  );
}

Button.displayName = 'Button';
