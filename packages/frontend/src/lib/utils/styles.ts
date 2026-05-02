/**
 * Style Utilities
 * 
 * Helper functions for working with styles and className composition.
 */

import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Merges className strings with Tailwind CSS conflict resolution
 * 
 * @example
 * ```tsx
 * cn('px-4 py-2', 'px-6') // => 'py-2 px-6' (px-4 is overridden)
 * cn('text-red-500', condition && 'text-blue-500') // conditional classes
 * ```
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Creates a variant-based className builder
 * 
 * @example
 * ```tsx
 * const buttonVariants = createVariants({
 *   base: 'px-4 py-2 rounded',
 *   variants: {
 *     variant: {
 *       primary: 'bg-accent text-black',
 *       secondary: 'bg-bg-secondary text-text-primary'
 *     },
 *     size: {
 *       sm: 'text-sm',
 *       md: 'text-base',
 *       lg: 'text-lg'
 *     }
 *   },
 *   defaultVariants: {
 *     variant: 'primary',
 *     size: 'md'
 *   }
 * });
 * 
 * buttonVariants({ variant: 'secondary', size: 'lg' })
 * ```
 */
export function createVariants<V extends Record<string, Record<string, string>>>(
  config: {
    base?: string;
    variants?: V;
    defaultVariants?: {
      [K in keyof V]?: keyof V[K];
    };
    compoundVariants?: Array<{
      [K in keyof V]?: keyof V[K];
    } & { className: string }>;
  }
) {
  return (props?: {
    [K in keyof V]?: keyof V[K];
  } & { className?: string }) => {
    const { base = '', variants = {}, defaultVariants = {}, compoundVariants = [] } = config;
    const { className: extraClassName, ...variantProps } = props || {};

    // Collect variant classes
    const variantClasses = Object.entries(variants).map(([variantKey, variantValues]) => {
      const selectedVariant = 
        (variantProps as any)?.[variantKey] || 
        (defaultVariants as any)?.[variantKey];
      
      return selectedVariant ? (variantValues as any)[selectedVariant] : '';
    });

    // Collect compound variant classes
    const compoundClasses = compoundVariants
      .filter(compound => {
        const { className: _, ...conditions } = compound;
        return Object.entries(conditions).every(
          ([key, value]) => (variantProps as any)?.[key] === value
        );
      })
      .map(compound => compound.className);

    return cn(base, ...variantClasses, ...compoundClasses, extraClassName);
  };
}

/**
 * Responsive helper - generates responsive className strings
 * 
 * @example
 * ```tsx
 * responsive({
 *   base: 'text-sm',
 *   md: 'text-base',
 *   lg: 'text-lg'
 * }) // => 'text-sm md:text-base lg:text-lg'
 * ```
 */
export function responsive(
  values: Partial<Record<'base' | 'sm' | 'md' | 'lg' | 'xl' | '2xl', string>>
): string {
  const { base = '', sm, md, lg, xl, '2xl': xl2 } = values;
  
  return cn(
    base,
    sm && `sm:${sm}`,
    md && `md:${md}`,
    lg && `lg:${lg}`,
    xl && `xl:${xl}`,
    xl2 && `2xl:${xl2}`
  );
}

/**
 * Focus ring utility for accessibility
 */
export const focusRing = cn(
  'focus:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-accent',
  'focus-visible:ring-offset-2',
  'focus-visible:ring-offset-bg-primary'
);

/**
 * Transition utility for smooth animations
 */
export function transition(properties: string[] = ['all'], duration: string = '150ms'): string {
  return cn(
    `transition-[${properties.join(',')}]`,
    `duration-[${duration}]`,
    'ease-linear'
  );
}

/**
 * Truncate text utility
 */
export const truncate = cn(
  'overflow-hidden',
  'text-ellipsis',
  'whitespace-nowrap'
);

/**
 * Screen reader only utility (accessible but visually hidden)
 */
export const srOnly = cn(
  'absolute',
  'w-px',
  'h-px',
  'p-0',
  'm-[-1px]',
  'overflow-hidden',
  'whitespace-nowrap',
  'border-0'
);
