/**
 * Header Component
 * 
 * Page header with logo and actions.
 */

'use client';

import React from 'react';
import { cn, transition } from '@/lib/utils/styles';
import { Text } from '@/components/atoms';

export interface HeaderProps {
  logo?: React.ReactNode;
  title?: string;
  actions?: React.ReactNode;
  className?: string;
  onLogoClick?: () => void;
}

/**
 * Header component for page top
 * 
 * @example
 * ```tsx
 * <Header
 *   title="FORO"
 *   actions={<Button variant="primary">Verify my agent</Button>}
 * />
 * ```
 */
export function Header({
  logo,
  title = 'FORO',
  actions,
  className,
  onLogoClick,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'flex items-center justify-between',
        'px-8 h-[60px]',
        'flex-shrink-0',
        className
      )}
    >
      {logo || (
        <button
          onClick={onLogoClick}
          className={cn(
            'bg-transparent border-none cursor-pointer',
            'p-0 leading-none',
            onLogoClick && transition(['opacity']),
            onLogoClick && 'hover:opacity-80'
          )}
        >
          <Text variant="title" color="primary" className="text-[22px]">
            {title}
          </Text>
        </button>
      )}

      {actions && (
        <div className="flex items-center gap-3">
          {actions}
        </div>
      )}
    </header>
  );
}

Header.displayName = 'Header';
