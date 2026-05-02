/**
 * Theme Provider and Hook
 * 
 * Provides access to design tokens throughout the application.
 */

'use client';

import React, { createContext, useContext } from 'react';
import { tokens, type Tokens } from './tokens';

const ThemeContext = createContext<Tokens>(tokens);

export interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: Partial<Tokens>;
}

/**
 * ThemeProvider - Wraps the app to provide design tokens
 * 
 * @example
 * ```tsx
 * <ThemeProvider>
 *   <App />
 * </ThemeProvider>
 * ```
 */
export function ThemeProvider({ children, theme }: ThemeProviderProps) {
  const mergedTheme = theme ? { ...tokens, ...theme } : tokens;
  
  return (
    <ThemeContext.Provider value={mergedTheme}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * useTheme - Hook to access design tokens
 * 
 * @example
 * ```tsx
 * const { colors, spacing } = useTheme();
 * 
 * <div style={{ 
 *   color: colors.text.primary,
 *   padding: spacing[4]
 * }} />
 * ```
 */
export function useTheme(): Tokens {
  const context = useContext(ThemeContext);
  
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  
  return context;
}

// Re-export tokens for direct imports
export { tokens } from './tokens';
export type { Tokens, Colors, Spacing, Typography } from './tokens';
