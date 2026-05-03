/**
 * Text Component
 * 
 * Typography component with semantic HTML and consistent styling.
 */

'use client';

import React from 'react';
import { cn } from '@/lib/utils/styles';

type TextVariant =
  | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'
  | 'body' | 'bodyLarge' | 'bodySmall'
  | 'caption' | 'label' | 'code'
  | 'display' | 'title'
  | 'buttonXl';

type TextColor =
  | 'primary' | 'secondary' | 'tertiary' | 'quaternary' | 'muted' | 'disabled'
  | 'success' | 'warning' | 'error' | 'info' | 'accent'
  | 'inherit';

const variantStyles: Record<TextVariant, string> = {
  display: 'text-6xl font-serif font-bold italic uppercase leading-none',
  title: 'text-4xl font-serif font-bold italic uppercase',
  h1: 'text-5xl font-sans font-semibold leading-tight',
  h2: 'text-3xl font-sans font-semibold leading-tight',
  h3: 'text-2xl font-sans font-medium leading-snug',
  h4: 'text-xl font-sans font-medium leading-snug',
  h5: 'text-lg font-sans font-medium leading-normal',
  h6: 'text-md font-sans font-medium leading-normal',
  body: 'text-base font-sans leading-normal',
  bodyLarge: 'text-md font-sans leading-normal',
  bodySmall: 'text-sm font-sans leading-normal',
  caption: 'text-sm font-sans leading-normal',
  label: 'text-sm font-sans font-medium uppercase tracking-widest',
  code: 'text-base font-mono leading-relaxed',
  buttonXl: 'text-xl font-sans font-medium',
};

const colorStyles: Record<TextColor, string> = {
  primary: 'text-text-primary',
  secondary: 'text-text-secondary',
  tertiary: 'text-text-tertiary',
  quaternary: 'text-text-quaternary',
  muted: 'text-text-muted',
  disabled: 'text-text-disabled',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
  info: 'text-info',
  accent: 'text-accent',
  inherit: '',
};

const variantElements: Record<TextVariant, keyof JSX.IntrinsicElements> = {
  display: 'h1',
  title: 'h1',
  h1: 'h1',
  h2: 'h2',
  h3: 'h3',
  h4: 'h4',
  h5: 'h5',
  h6: 'h6',
  body: 'p',
  bodyLarge: 'p',
  bodySmall: 'p',
  caption: 'span',
  label: 'label',
  code: 'code',
  buttonXl: 'span',
};

export interface TextProps {
  variant?: TextVariant;
  color?: TextColor;
  as?: keyof JSX.IntrinsicElements;
  className?: string;
  children: React.ReactNode;
  [key: string]: any;
}

/**
 * Text component with semantic HTML and typography variants
 * 
 * @example
 * ```tsx
 * <Text variant="h1" color="primary">Heading</Text>
 * <Text variant="body" color="secondary">Body text</Text>
 * <Text variant="label" color="muted">Label</Text>
 * ```
 */
export function Text({
  variant = 'body',
  color = 'primary',
  as,
  className,
  children,
  ...props
}: TextProps) {
  const Component = as || variantElements[variant];
  
  const styles = cn(
    variantStyles[variant],
    colorStyles[color],
    className
  );

  return React.createElement(
    Component,
    { className: styles, ...props },
    children
  );
}

Text.displayName = 'Text';
