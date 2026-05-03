/**
 * Design Tokens
 * 
 * Central source of truth for all design values extracted from inline styles.
 * These tokens ensure consistency across the entire application.
 */

export const colors = {
  // Background colors
  bg: {
    primary: '#0A0A0B',
    secondary: '#111113',
    tertiary: '#161618',
    elevated: '#1A1A1E',
  },
  
  // Border colors
  border: {
    subtle: '#1E1E24',
    default: '#2A2A32',
    strong: '#3D3D47',
  },
  
  // Text colors
  text: {
    primary: '#F4F4F8',
    secondary: '#C4C4CE',
    tertiary: '#9393A0',
    quaternary: '#72727E',
    muted: '#52525E',
    disabled: '#3D3D47',
  },
  
  // Status colors
  status: {
    elite: '#B8FF4F',
    eliteHover: '#c9ff6e',
    eliteBg: '#182800',
    verified: '#4ADE80',
    verifiedBg: '#0A1F10',
    probation: '#E8A935',
    probationBg: '#1F1400',
    failed: '#F26B6B',
    failedBg: '#210A0A',
    pending: '#72727E',
    pendingBg: 'rgba(114,114,126,0.12)',
    live: '#5C9EE8',
    liveBg: '#080F1F',
    liveBorder: '#1D3144',
  },
  
  // Semantic colors
  success: '#4ADE80',
  warning: '#E8A935',
  error: '#F26B6B',
  info: '#5C9EE8',
  
  // Special colors
  accent: '#B8FF4F',
  accentHover: '#c9ff6e',
} as const;

export const spacing = {
  0: '0',
  1: '0.25rem',   // 4px
  2: '0.5rem',    // 8px
  3: '0.75rem',   // 12px
  4: '1rem',      // 16px
  5: '1.25rem',   // 20px
  6: '1.5rem',    // 24px
  7: '1.75rem',   // 28px
  8: '2rem',      // 32px
  9: '2.25rem',   // 36px
  10: '2.5rem',   // 40px
  12: '3rem',     // 48px
  14: '3.5rem',   // 56px
  16: '4rem',     // 64px
  20: '5rem',     // 80px
  24: '6rem',     // 96px
  28: '7rem',     // 112px
  32: '8rem',     // 128px
} as const;

export const typography = {
  fontFamily: {
    /** Full stacks defined in `src/styles/globals.css` (Geist + fallbacks) */
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
    serif: 'var(--font-serif), "EB Garamond", Georgia, serif',
  },
  
  fontSize: {
    xs: '0.625rem',   // 10px
    sm: '1rem',        // 16px
    base: '1.125rem', // 18px
    md: '0.8125rem',  // 13px
    lg: '0.875rem',   // 14px
    xl: '0.9375rem',  // 15px
    '2xl': '1rem',    // 16px
    '3xl': '1.25rem', // 20px
    '4xl': '1.375rem', // 22px
    '5xl': '1.75rem', // 28px
    '6xl': '2rem',    // 32px
  },
  
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  
  lineHeight: {
    none: 1,
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.6,
  },
  
  letterSpacing: {
    tighter: '-0.025em',
    tight: '-0.02em',
    normal: '0em',
    wide: '0.01em',
    wider: '0.02em',
    widest: '0.04em',
    ultraWide: '0.08em',
    superWide: '0.1em',
  },
} as const;

export const shadows = {
  sm: '0 1px 2px rgba(0, 0, 0, 0.05)',
  base: '0 1px 3px rgba(0, 0, 0, 0.1)',
  md: '0 4px 6px rgba(0, 0, 0, 0.1)',
  lg: '0 10px 15px rgba(0, 0, 0, 0.1)',
  xl: '0 20px 25px rgba(0, 0, 0, 0.1)',
  '2xl': '0 4px 16px rgba(0, 0, 0, 0.5)',
} as const;

export const borderRadius = {
  none: '0',
  sm: '2px',
  base: '3px',
  md: '4px',
  lg: '6px',
  xl: '8px',
  full: '9999px',
} as const;

export const transitions = {
  fast: '150ms',
  base: '200ms',
  slow: '300ms',
  slower: '500ms',
} as const;

export const zIndex = {
  base: 0,
  dropdown: 10,
  sticky: 20,
  fixed: 30,
  modal: 40,
  popover: 50,
  tooltip: 60,
} as const;

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// Export all tokens as a single object
export const tokens = {
  colors,
  spacing,
  typography,
  shadows,
  borderRadius,
  transitions,
  zIndex,
  breakpoints,
} as const;

export type Tokens = typeof tokens;
export type Colors = typeof colors;
export type Spacing = typeof spacing;
export type Typography = typeof typography;
