import type { Config } from 'tailwindcss';
import { tokens } from './src/lib/theme/tokens';

/**
 * Tailwind Configuration
 * 
 * Extends Tailwind with our design tokens for consistent theming.
 */
const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Colors from design tokens
      colors: {
        // Background colors
        'bg-primary': tokens.colors.bg.primary,
        'bg-secondary': tokens.colors.bg.secondary,
        'bg-tertiary': tokens.colors.bg.tertiary,
        'bg-elevated': tokens.colors.bg.elevated,

        // Border colors
        'border-subtle': tokens.colors.border.subtle,
        'border-default': tokens.colors.border.default,
        'border-strong': tokens.colors.border.strong,

        // Text colors
        'text-primary': tokens.colors.text.primary,
        'text-secondary': tokens.colors.text.secondary,
        'text-tertiary': tokens.colors.text.tertiary,
        'text-quaternary': tokens.colors.text.quaternary,
        'text-muted': tokens.colors.text.muted,
        'text-disabled': tokens.colors.text.disabled,

        // Semantic colors
        'accent': tokens.colors.accent,
        'accent-hover': tokens.colors.accentHover,
        'success': tokens.colors.success,
        'warning': tokens.colors.warning,
        'error': tokens.colors.error,
        'info': tokens.colors.info,

        // Status colors (for backward compatibility)
        'status-elite': tokens.colors.status.elite,
        'status-verified': tokens.colors.status.verified,
        'status-failed': tokens.colors.status.failed,
        'status-live': tokens.colors.status.live,
      },

      // Typography — one Tailwind entry per stack (do not split comma-separated CSS)
      fontFamily: {
        sans: [tokens.typography.fontFamily.sans],
        mono: [tokens.typography.fontFamily.mono],
        serif: [tokens.typography.fontFamily.serif],
      },

      fontSize: {
        xs: [tokens.typography.fontSize.xs, { lineHeight: `${tokens.typography.lineHeight.normal}` }],
        sm: [tokens.typography.fontSize.sm, { lineHeight: `${tokens.typography.lineHeight.normal}` }],
        base: [tokens.typography.fontSize.base, { lineHeight: `${tokens.typography.lineHeight.normal}` }],
        md: [tokens.typography.fontSize.md, { lineHeight: `${tokens.typography.lineHeight.normal}` }],
        lg: [tokens.typography.fontSize.lg, { lineHeight: `${tokens.typography.lineHeight.normal}` }],
        xl: [tokens.typography.fontSize.xl, { lineHeight: `${tokens.typography.lineHeight.snug}` }],
        '2xl': [tokens.typography.fontSize['2xl'], { lineHeight: `${tokens.typography.lineHeight.tight}` }],
        '3xl': [tokens.typography.fontSize['3xl'], { lineHeight: `${tokens.typography.lineHeight.tight}` }],
        '4xl': [tokens.typography.fontSize['4xl'], { lineHeight: `${tokens.typography.lineHeight.none}` }],
        '5xl': [tokens.typography.fontSize['5xl'], { lineHeight: `${tokens.typography.lineHeight.none}` }],
        '6xl': [tokens.typography.fontSize['6xl'], { lineHeight: `${tokens.typography.lineHeight.none}` }],
      },

      fontWeight: {
        normal: `${tokens.typography.fontWeight.normal}`,
        medium: `${tokens.typography.fontWeight.medium}`,
        semibold: `${tokens.typography.fontWeight.semibold}`,
        bold: `${tokens.typography.fontWeight.bold}`,
      },
      letterSpacing: tokens.typography.letterSpacing,

      // Spacing from design tokens
      spacing: tokens.spacing,

      // Border radius from design tokens
      borderRadius: {
        ...tokens.borderRadius,
        full: tokens.borderRadius.full,
      },

      // Shadows from design tokens
      boxShadow: tokens.shadows,

      // Transitions from design tokens
      transitionDuration: {
        fast: tokens.transitions.fast,
        base: tokens.transitions.base,
        slow: tokens.transitions.slow,
      },

      // Z-index from design tokens
      zIndex: {
        base: `${tokens.zIndex.base}`,
        dropdown: `${tokens.zIndex.dropdown}`,
        sticky: `${tokens.zIndex.sticky}`,
        fixed: `${tokens.zIndex.fixed}`,
        modal: `${tokens.zIndex.modal}`,
        popover: `${tokens.zIndex.popover}`,
        tooltip: `${tokens.zIndex.tooltip}`,
      },
    },
  },
  plugins: [],
};

export default config;
