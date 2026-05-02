/**
 * useAgentStatus Hook
 * 
 * Encapsulates agent status logic and color calculations.
 */

'use client';

import { useMemo } from 'react';
import { getScoreColor, getScoreMeaning } from '@/lib/constants';
import type { AgentStatus } from '@/lib/constants/types';

export interface UseAgentStatusOptions {
  status: AgentStatus;
  score?: string | number;
}

export interface UseAgentStatusReturn {
  color: string;
  meaning: string;
  scoreNum: number;
  isVerified: boolean;
  isElite: boolean;
  isFailed: boolean;
  isPending: boolean;
  isLive: boolean;
}

/**
 * Hook for agent status calculations
 * 
 * @example
 * ```tsx
 * const { color, meaning, isVerified } = useAgentStatus({
 *   status: 'verified',
 *   score: 0.89
 * });
 * ```
 */
export function useAgentStatus({
  status,
  score = 0,
}: UseAgentStatusOptions): UseAgentStatusReturn {
  const scoreNum = useMemo(() => {
    if (typeof score === 'number') return score;
    const parsed = parseFloat(score);
    return isNaN(parsed) ? 0 : parsed;
  }, [score]);

  const color = useMemo(
    () => getScoreColor(scoreNum, status),
    [scoreNum, status]
  );

  const meaning = useMemo(
    () => getScoreMeaning(scoreNum, status),
    [scoreNum, status]
  );

  return {
    color,
    meaning,
    scoreNum,
    isVerified: status === 'verified',
    isElite: status === 'elite',
    isFailed: status === 'failed',
    isPending: status === 'pending',
    isLive: status === 'live',
  };
}
