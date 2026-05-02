/**
 * Card Component
 * 
 * Flexible card container with composable parts.
 */

'use client';

import React from 'react';
import { cn, transition } from '@/lib/utils/styles';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hovered?: boolean;
  selected?: boolean;
  accentColor?: string;
}

/**
 * Card shell - base card container
 */
export function CardShell({
  children,
  className,
  onClick,
  hovered = false,
  selected = false,
  accentColor,
  ...rest
}: CardProps) {
  const isInteractive = !!onClick;

  return (
    <div
      {...rest}
      onClick={onClick}
      className={cn(
        'rounded-md border',
        'flex flex-col',
        selected ? 'bg-bg-elevated border-border-default' : 
        hovered ? 'bg-bg-tertiary border-border-subtle' : 
        'bg-bg-secondary border-border-subtle',
        isInteractive && 'cursor-pointer',
        transition(['background', 'border-color']),
        className
      )}
      style={accentColor ? { borderLeftColor: accentColor, borderLeftWidth: '2px' } : undefined}
    >
      {children}
    </div>
  );
}

export interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card header section
 */
export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div className={cn('px-4 py-3 border-b border-border-subtle', className)}>
      {children}
    </div>
  );
}

export interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card content section
 */
export function CardContent({ children, className }: CardContentProps) {
  return (
    <div className={cn('px-4 py-3', className)}>
      {children}
    </div>
  );
}

export interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card footer section
 */
export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div className={cn('px-4 py-3 border-t border-border-subtle', className)}>
      {children}
    </div>
  );
}

/**
 * Complete Card component with sub-components
 * 
 * @example
 * ```tsx
 * <CardShell>
 *   <CardHeader>Header</CardHeader>
 *   <CardContent>Content</CardContent>
 *   <CardFooter>Footer</CardFooter>
 * </CardShell>
 * ```
 */
export const Card = Object.assign(CardShell, {
  Header: CardHeader,
  Content: CardContent,
  Footer: CardFooter,
});
