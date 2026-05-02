/**
 * Application Constants
 * 
 * Centralized constants used throughout the application.
 */

import type React from 'react';
import { colors } from '../theme/tokens';
import type { AgentStatus } from './types';

/**
 * Font style constants for inline styles (legacy support)
 */
export const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono)',
} as const;

export const SANS: React.CSSProperties = {
  fontFamily: 'var(--font-sans)',
} as const;

export const SERIF: React.CSSProperties = {
  fontFamily: 'var(--font-serif), "EB Garamond", Georgia, serif',
} as const;

/**
 * Status badge configurations
 */
export const STATUS_CONFIG: Record<
  AgentStatus,
  { bg: string; color: string; label: string }
> = {
  pending: {
    bg: colors.status.pendingBg,
    color: colors.status.pending,
    label: 'pending',
  },
  probation: {
    bg: colors.status.probationBg,
    color: colors.status.probation,
    label: 'probation',
  },
  verified: {
    bg: colors.status.verifiedBg,
    color: colors.status.verified,
    label: 'verified',
  },
  elite: {
    bg: colors.status.eliteBg,
    color: colors.status.elite,
    label: 'elite',
  },
  failed: {
    bg: colors.status.failedBg,
    color: colors.status.failed,
    label: 'failed',
  },
  live: {
    bg: colors.status.liveBg,
    color: colors.status.live,
    label: 'live',
  },
} as const;

/**
 * Score color thresholds
 */
export const SCORE_THRESHOLDS = {
  ELITE: 0.95,
  VERIFIED: 0.80,
  PROBATION: 0.60,
  FAILED: 0.40,
} as const;

/**
 * Score color mapping
 */
export function getScoreColor(score: number, status: AgentStatus): string {
  if (status === 'failed') return colors.status.failed;
  if (status === 'pending') return colors.border.strong;
  
  if (score >= SCORE_THRESHOLDS.ELITE) return colors.status.elite;
  if (score >= SCORE_THRESHOLDS.VERIFIED) return colors.status.verified;
  if (score >= SCORE_THRESHOLDS.PROBATION) return colors.status.probation;
  return colors.status.failed;
}

/**
 * Score meaning descriptions
 */
export function getScoreMeaning(score: number, status: AgentStatus): string {
  if (status === 'failed') return 'Did not pass verification threshold.';
  if (status === 'pending') return 'No tests run yet.';
  
  if (score >= 0.95) return 'Consistently reliable across all tests.';
  if (score >= 0.88) return 'Strong performer with minor variance.';
  if (score >= 0.75) return 'Passes most tests with some inconsistency.';
  if (score >= 0.55) return 'Borderline — improvement needed.';
  return 'Significant failures detected.';
}

/**
 * Test fee distribution split
 */
export const FEE_DISTRIBUTION = {
  KEEPER: 0.7,  // 70%
  CREATOR: 0.2, // 20%
  PROTOCOL: 0.1, // 10%
} as const;

/**
 * Stake multiplier
 */
export const STAKE_MULTIPLIER = 2; // Keeper stakes 2x test fee

/**
 * Default timeouts
 */
export const TIMEOUTS = {
  REVEAL: 3600, // 1 hour in seconds
  CONTESTATION: 3600, // 1 hour in seconds
} as const;

/**
 * Navigation items
 */
export const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'agents', label: 'Agents', icon: '◈' },
  { id: 'proofs', label: 'Proofs', icon: '◉' },
  { id: 'logs', label: 'Logs', icon: '≡' },
  { id: 'settings', label: 'Settings', icon: '⚙' },
] as const;

/**
 * Gauge chart configuration
 */
export const GAUGE_CONFIG = {
  START_ANGLE: 200, // degrees
  END_ANGLE: 340,   // degrees
  SPAN: 140,        // degrees
  RADIUS: 54,
  CENTER: { x: 64, y: 74 },
  NEEDLE_LENGTH_RATIO: 0.72,
  TICK_MARKS: [0, 0.25, 0.5, 0.75, 1.0],
} as const;

/**
 * Animation durations
 */
export const ANIMATION_DURATION = {
  FAST: 150,
  BASE: 200,
  SLOW: 300,
  PROGRESS_BAR: 300,
} as const;

/**
 * Grid layout constants
 */
export const LAYOUT = {
  HEADER_HEIGHT: 60,
  NAV_WIDTH: 200,
  SIDEBAR_WIDTH: 260,
  MAX_CONTENT_WIDTH: 920,
  COLUMN_COUNT_HEIGHT: 56, // HEADER_H in IndexPage
} as const;

/**
 * Breakpoints (matches tokens.ts)
 */
export const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
  '2xl': 1536,
} as const;
