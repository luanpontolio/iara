'use client';

import { useState } from 'react';
import { StatusBadge, type AgentStatus } from './StatusBadge';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Agent {
  id: number;
  name: string;
  foroId: string;
  fullAddress: string;
  score: string;
  tests: string;
  latency: string;
  block: string;
  status: AgentStatus;
  testFee?: string;     // "1.00 USDC" — shown on waiting cards
  elapsedTime?: string; // "2 min"    — shown on live cards
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number, status: AgentStatus): string {
  if (status === 'failed')  return '#F26B6B';
  if (status === 'pending') return '#3D3D47';
  if (score >= 0.95) return '#B8FF4F';
  if (score >= 0.80) return '#4ADE80';
  if (score >= 0.60) return '#E8A935';
  return '#F26B6B';
}

function scoreMeaning(score: number, status: AgentStatus): string {
  if (status === 'failed')  return 'Did not pass verification threshold.';
  if (status === 'pending') return 'No tests run yet.';
  if (score >= 0.95) return 'Consistently reliable across all tests.';
  if (score >= 0.88) return 'Strong performer with minor variance.';
  if (score >= 0.75) return 'Passes most tests with some inconsistency.';
  if (score >= 0.55) return 'Borderline — improvement needed.';
  return 'Significant failures detected.';
}

// ── Shared gauge SVG ──────────────────────────────────────────────────────────
// Arc: 200°→340° CW, 140° span through 270° (top). Both endpoints below cy.
// overrideColor bypasses the score-based color (used for live/blue fill).
// showFill=false renders track only — no fill, needle parked at left.

interface GaugeProps {
  score: number;
  status: AgentStatus;
  overrideColor?: string | undefined;
  showFill?: boolean | undefined;
}

function Gauge({ score, status, overrideColor, showFill = true }: GaugeProps) {
  const color       = overrideColor ?? scoreColor(score, status);
  const isPending   = status === 'pending' && !overrideColor;
  const needleColor = isPending ? '#3D3D47' : color;

  const cx = 64, cy = 74, r = 54;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const px = (d: number) => cx + r * Math.cos(toRad(d));
  const py = (d: number) => cy + r * Math.sin(toRad(d));

  const s    = Math.max(0, Math.min(1, score));
  const nDeg = 200 + s * 140;

  const trackPath = `M ${px(200).toFixed(2)} ${py(200).toFixed(2)} A ${r} ${r} 0 0 1 ${px(340).toFixed(2)} ${py(340).toFixed(2)}`;
  const fillPath  = `M ${px(200).toFixed(2)} ${py(200).toFixed(2)} A ${r} ${r} 0 0 1 ${px(nDeg).toFixed(2)} ${py(nDeg).toFixed(2)}`;
  const nx = cx + r * 0.72 * Math.cos(toRad(nDeg));
  const ny = cy + r * 0.72 * Math.sin(toRad(nDeg));

  return (
    <svg width={104} height={62} viewBox="0 0 128 80" style={{ display: 'block' }}>
      <path d={trackPath} stroke="#1E1E24" strokeWidth={5} fill="none" strokeLinecap="round" />
      {showFill && s > 0 && (
        <path d={fillPath} stroke={color} strokeWidth={5} fill="none" strokeLinecap="round" />
      )}
      {[0, 0.25, 0.5, 0.75, 1.0].map(v => {
        const td = 200 + v * 140;
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
      <line
        x1={cx} y1={cy}
        x2={nx.toFixed(2)} y2={ny.toFixed(2)}
        stroke={needleColor}
        strokeWidth={1.5}
        strokeLinecap="round"
      />
      <circle cx={cx} cy={cy} r={3.5} fill={needleColor} />
    </svg>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function CardShell({
  hovered,
  selected,
  accentColor,
  onClick,
  onMouseEnter,
  onMouseLeave,
  children,
}: {
  hovered: boolean;
  selected?: boolean | undefined;
  accentColor?: string | undefined;
  onClick?: (() => void) | undefined;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={{
        background: selected ? '#1A1A1E' : hovered ? '#161618' : '#111113',
        border: `1px solid ${selected ? '#2A2A32' : '#1E1E24'}`,
        borderLeft: accentColor ? `2px solid ${accentColor}` : undefined,
        borderRadius: 4,
        cursor: 'pointer',
        transition: 'all 150ms linear',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  );
}

function GaugeRow({ score, status, overrideColor, showFill }: GaugeProps) {
  return (
    <div style={{ padding: '6px 12px 0', display: 'flex', justifyContent: 'center' }}>
      <Gauge score={score} status={status} overrideColor={overrideColor} showFill={showFill} />
    </div>
  );
}

function Divider() {
  return <div style={{ height: 1, background: '#1E1E24', margin: '10px 0 0' }} />;
}

function AgentName({ name }: { name: string }) {
  return (
    <div style={{ padding: '8px 12px', textAlign: 'center' }}>
      <div
        style={{
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 12,
          fontWeight: 500,
          color: '#9393A0',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </div>
    </div>
  );
}

// ── 1. AgentCardWaiting ───────────────────────────────────────────────────────
// Pending agents queued for testing.
// Top: test fee. Gauge: empty track, needle parked at left. No score.

export function AgentCardWaiting({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);

  return (
    <CardShell
      hovered={hovered}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ padding: '10px 12px 0', display: 'flex', justifyContent: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
            fontSize: 13,
            fontWeight: 400,
            color: '#C4C4CE',
            letterSpacing: '0.02em',
          }}
        >
          {agent.testFee ?? '—'}
        </span>
      </div>

      <GaugeRow score={0} status="pending" showFill={false} />
      <Divider />
      <AgentName name={agent.name} />
    </CardShell>
  );
}

// ── 2. AgentCardLive ──────────────────────────────────────────────────────────
// Agents currently under test.
// Top: elapsed time. Gauge: partial blue fill = tests completed so far.
// Left accent border in live blue signals active state at a glance.

export function AgentCardLive({ agent, onClick }: { agent: Agent; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  const scoreNum = parseFloat(agent.score) || 0;

  const parts = agent.tests.split('/');
  const done  = Number(parts[0] ?? 0);
  const total = Number(parts[1] ?? 0);
  const progress = total > 0 ? done / total : 0;

  return (
    <CardShell
      hovered={hovered}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Progress bar */}
      <div style={{ height: 2, background: '#1E1E24', borderRadius: '2px 2px 0 0', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${progress * 100}%`, background: '#5C9EE8', transition: 'width 300ms ease' }} />
      </div>

        <div style={{ padding: '10px 12px 0', display: 'flex', justifyContent: 'center' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
              fontSize: 11,
              color: '#5C9EE8',
              letterSpacing: '0.01em',
            }}
          >
            Started {agent.elapsedTime ?? '—'} ago
          </span>
        </div>

        <GaugeRow score={scoreNum} status="live" overrideColor="#5C9EE8" />

        <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 12px 0' }}>
          <span
            style={{
              fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
              fontSize: 10,
              color: '#52525E',
              letterSpacing: '0.02em',
            }}
          >
            {agent.tests} tests
          </span>
        </div>

        <Divider />
        <AgentName name={agent.name} />
      </CardShell>
  );
}

// ── 3. AgentCardResult ────────────────────────────────────────────────────────
// Settled agents — verified, elite, probation, or failed.
// Top: status badge. Gauge: final score with color scale. Score caption + tooltip.

export function AgentCardResult({
  agent,
  selected = false,
  onClick,
}: {
  agent: Agent;
  selected?: boolean;
  onClick?: () => void;
}) {
  const [hovered,    setHovered]    = useState(false);
  const [tipVisible, setTipVisible] = useState(false);

  const scoreNum = parseFloat(agent.score) || 0;
  const color    = scoreColor(scoreNum, agent.status);
  const meaning  = scoreMeaning(scoreNum, agent.status);

  return (
    <CardShell
      selected={selected}
      hovered={hovered}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{ padding: '10px 12px 0' }}>
        <StatusBadge status={agent.status} size="xs" />
      </div>

      <GaugeRow score={scoreNum} status={agent.status} />

      {/* Score + tooltip */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 4,
          padding: '6px 12px 0',
          position: 'relative',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
            fontSize: 11,
            fontWeight: 500,
            color,
            letterSpacing: '0.02em',
          }}
        >
          {agent.score}
        </span>
        <div
          onMouseEnter={() => setTipVisible(true)}
          onMouseLeave={() => setTipVisible(false)}
          style={{
            width: 13,
            height: 13,
            borderRadius: '50%',
            border: '1px solid #2A2A32',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'default',
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 8,
            color: '#52525E',
            flexShrink: 0,
            position: 'relative',
          }}
        >
          i
          {tipVisible && (
            <div
              style={{
                position: 'absolute',
                bottom: 'calc(100% + 6px)',
                left: '50%',
                transform: 'translateX(-50%)',
                background: '#161618',
                border: '1px solid #2A2A32',
                borderRadius: 4,
                padding: '7px 9px',
                width: 150,
                fontFamily: 'var(--font-sans), sans-serif',
                fontSize: 11,
                color: '#C4C4CE',
                lineHeight: 1.5,
                whiteSpace: 'normal',
                zIndex: 10,
                boxShadow: '0 4px 16px rgba(0,0,0,0.5)',
                textAlign: 'left',
                pointerEvents: 'none',
              }}
            >
              {meaning}
            </div>
          )}
        </div>
      </div>

      <Divider />
      <AgentName name={agent.name} />
    </CardShell>
  );
}

// Backwards-compat alias — used by Dashboard and VerificationPanel
export { AgentCardResult as AgentCard };
