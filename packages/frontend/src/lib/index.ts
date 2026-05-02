/**
 * Library - Main Export
 * 
 * Central export for utilities, hooks, and constants.
 */

// Theme
export { tokens, useTheme, ThemeProvider } from './theme';
export type { Tokens, Colors, Spacing, Typography } from './theme';

// Utils
export {
  cn,
  createVariants,
  responsive,
  focusRing,
  transition,
  truncate,
  srOnly,
} from './utils/styles';

export {
  formatAddress,
  formatScore,
  formatLatency,
  formatCurrency,
  formatBlock,
  formatTimeElapsed,
  formatPercentage,
  formatTestCount,
  pluralize,
  formatForoId,
} from './utils/formatters';

// Constants
export {
  MONO,
  SANS,
  SERIF,
  STATUS_CONFIG,
  SCORE_THRESHOLDS,
  getScoreColor,
  getScoreMeaning,
  FEE_DISTRIBUTION,
  STAKE_MULTIPLIER,
  TIMEOUTS,
  NAV_ITEMS,
  GAUGE_CONFIG,
  ANIMATION_DURATION,
  LAYOUT,
  BREAKPOINTS,
} from './constants';

export type {
  AgentStatus,
  NavPage,
  ForoPhase,
  TabId,
  Agent,
  TestCase,
  TestRound,
  Contestation,
} from './constants/types';
