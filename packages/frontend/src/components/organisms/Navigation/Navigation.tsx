/**
 * Navigation Component
 * 
 * Sidebar navigation with icon and label items.
 */

'use client';

import React from 'react';
import { cn, transition } from '@/lib/utils/styles';
import { Text, Icon } from '@/components/atoms';
import { NAV_ITEMS } from '@/lib/constants';
import type { NavPage } from '@/lib/constants/types';

export interface NavigationProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  className?: string;
}

/**
 * Navigation component for sidebar
 * 
 * @example
 * ```tsx
 * <Navigation activePage="dashboard" onNavigate={setPage} />
 * ```
 */
export function Navigation({
  activePage,
  onNavigate,
  className,
}: NavigationProps) {
  return (
    <nav
      className={cn(
        'w-[200px] flex-shrink-0',
        'bg-bg-secondary border-r border-border-subtle',
        'flex flex-col h-full',
        'py-4',
        className
      )}
    >
      {/* Logo */}
      <div className="px-4 pb-5 border-b border-border-subtle mb-2">
        <Text variant="title" color="primary" className="text-[20px]">
          FORO
        </Text>
      </div>

      {/* Nav items */}
      <div className="flex-1 flex flex-col gap-px px-2 py-1">
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id as NavPage)}
              className={cn(
                'flex items-center gap-2',
                'px-2.5 py-1.5 rounded',
                'cursor-pointer',
                'w-full text-left',
                'border-none',
                active ? 'bg-bg-elevated' : 'bg-transparent',
                transition(['background'])
              )}
            >
              <Icon
                icon={item.icon}
                size="sm"
                color={active ? '#F4F4F8' : '#52525E'}
                aria-label={item.label}
              />
              <Text
                variant="caption"
                color={active ? 'primary' : 'quaternary'}
                className={active ? 'font-medium' : 'font-normal'}
              >
                {item.label}
              </Text>
            </button>
          );
        })}
      </div>

      {/* Bottom - API key hint */}
      <div className="px-4 py-3 border-t border-border-subtle mt-auto">
        <Text variant="code" color="muted" className="text-[10px] tracking-wide">
          foro_sk_•••••a4f2
        </Text>
      </div>
    </nav>
  );
}

Navigation.displayName = 'Navigation';
