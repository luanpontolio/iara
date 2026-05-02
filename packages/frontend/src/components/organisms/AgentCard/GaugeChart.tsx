/**
 * GaugeChart Component
 * 
 * Circular gauge chart for displaying scores.
 */

'use client';

import React from 'react';
import { GAUGE_CONFIG } from '@/lib/constants';
import type { AgentStatus } from '@/lib/constants/types';

export interface GaugeChartProps {
  score: number; // 0-1
  status: AgentStatus;
  overrideColor?: string;
  showFill?: boolean;
  svgWidth?: number;
  svgHeight?: number;
}

/**
 * GaugeChart component for visualizing scores
 * 
 * @example
 * ```tsx
 * <GaugeChart score={0.97} status="elite" />
 * <GaugeChart score={0.5} status="live" overrideColor="#5C9EE8" />
 * ```
 */
export function GaugeChart({
  score,
  status,
  overrideColor,
  showFill = true,
  svgWidth = 104,
  svgHeight = 62,
}: GaugeChartProps) {
  const { START_ANGLE, SPAN, RADIUS, CENTER, NEEDLE_LENGTH_RATIO, TICK_MARKS } = GAUGE_CONFIG;

  // Determine color
  const getColor = () => {
    if (overrideColor) return overrideColor;
    if (status === 'pending') return '#3D3D47';
    if (status === 'failed') return '#F26B6B';
    if (score >= 0.95) return '#B8FF4F';
    if (score >= 0.80) return '#4ADE80';
    if (score >= 0.60) return '#E8A935';
    return '#F26B6B';
  };

  const color = getColor();
  const isPending = status === 'pending' && !overrideColor;
  const needleColor = isPending ? '#3D3D47' : color;

  const { x: cx, y: cy } = CENTER;
  const r = RADIUS;

  // Helper to convert degrees to radians and calculate positions
  const toRad = (d: number) => (d * Math.PI) / 180;
  const px = (d: number) => cx + r * Math.cos(toRad(d));
  const py = (d: number) => cy + r * Math.sin(toRad(d));

  // Clamp score to 0-1
  const s = Math.max(0, Math.min(1, score));
  const nDeg = START_ANGLE + s * SPAN;

  // Track path (from START_ANGLE to END_ANGLE)
  const trackPath = `M ${px(START_ANGLE).toFixed(2)} ${py(START_ANGLE).toFixed(2)} A ${r} ${r} 0 0 1 ${px(START_ANGLE + SPAN).toFixed(2)} ${py(START_ANGLE + SPAN).toFixed(2)}`;

  // Fill path (from START_ANGLE to needle position)
  const fillPath = `M ${px(START_ANGLE).toFixed(2)} ${py(START_ANGLE).toFixed(2)} A ${r} ${r} 0 0 1 ${px(nDeg).toFixed(2)} ${py(nDeg).toFixed(2)}`;

  // Needle position
  const nx = cx + r * NEEDLE_LENGTH_RATIO * Math.cos(toRad(nDeg));
  const ny = cy + r * NEEDLE_LENGTH_RATIO * Math.sin(toRad(nDeg));

  return (
    <svg width={svgWidth} height={svgHeight} viewBox="0 0 128 80" style={{ display: 'block' }}>
      {/* Track */}
      <path 
        d={trackPath} 
        stroke="#1E1E24" 
        strokeWidth={5} 
        fill="none" 
        strokeLinecap="round" 
      />

      {/* Fill (only if showFill and score > 0) */}
      {showFill && s > 0 && (
        <path 
          d={fillPath} 
          stroke={color} 
          strokeWidth={5} 
          fill="none" 
          strokeLinecap="round" 
        />
      )}

      {/* Tick marks */}
      {TICK_MARKS.map(v => {
        const td = START_ANGLE + v * SPAN;
        return (
          <line
            key={v}
            x1={(cx + 45 * Math.cos(toRad(td))).toFixed(2)}
            y1={(cy + 45 * Math.sin(toRad(td))).toFixed(2)}
            x2={(cx + 53 * Math.cos(toRad(td))).toFixed(2)}
            y2={(cy + 53 * Math.sin(toRad(td))).toFixed(2)}
            stroke="#2A2A32"
            strokeWidth={1.5}
            strokeLinecap="round"
          />
        );
      })}

      {/* Needle */}
      <line
        x1={cx}
        y1={cy}
        x2={nx.toFixed(2)}
        y2={ny.toFixed(2)}
        stroke={needleColor}
        strokeWidth={1.5}
        strokeLinecap="round"
      />

      {/* Center dot */}
      <circle cx={cx} cy={cy} r={3.5} fill={needleColor} />
    </svg>
  );
}

GaugeChart.displayName = 'GaugeChart';
