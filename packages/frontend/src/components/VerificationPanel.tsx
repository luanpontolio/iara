'use client';

import { useState } from 'react';
import { StatusBadge } from './StatusBadge';
import type { Agent } from './AgentCard';

interface VerificationPanelProps {
  agent: Agent;
  onClose: () => void;
}

type PanelTab = 'tests' | 'proof' | 'metadata';

const MOCK_ROUNDS = [
  { n: '01', score: '0.99', status: 'verified' as const, latency: '112ms' },
  { n: '02', score: '0.97', status: 'verified' as const, latency: '134ms' },
  { n: '03', score: '0.94', status: 'verified' as const, latency: '128ms' },
  { n: '04', score: '0.98', status: 'verified' as const, latency: '141ms' },
  { n: '05', score: '0.96', status: 'verified' as const, latency: '119ms' },
  { n: '06', score: '0.31', status: 'failed'   as const, latency: '831ms' },
  { n: '07', score: '0.95', status: 'verified' as const, latency: '122ms' },
  { n: '08', score: '0.97', status: 'verified' as const, latency: '138ms' },
];

const MONO: React.CSSProperties = {
  fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
};

function ProofRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <div
        style={{
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: '#52525E',
        }}
      >
        {label}
      </div>
      <div
        style={{
          ...MONO,
          fontSize: 11,
          color: '#9393A0',
          wordBreak: 'break-all',
          lineHeight: 1.6,
        }}
      >
        {value}
      </div>
    </div>
  );
}

export function VerificationPanel({ agent, onClose }: VerificationPanelProps) {
  const [tab, setTab]             = useState<PanelTab>('tests');
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  const scoreColor =
    agent.status === 'elite'    ? '#B8FF4F' :
    agent.status === 'verified' ? '#4ADE80' :
    agent.status === 'failed'   ? '#F26B6B' : '#F4F4F8';

  return (
    <div
      style={{
        flex: 1,
        background: '#111113',
        borderLeft: '1px solid #1E1E24',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '16px 20px',
          borderBottom: '1px solid #1E1E24',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexShrink: 0,
        }}
      >
        <div>
          <div
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 15,
              fontWeight: 500,
              color: '#F4F4F8',
            }}
          >
            {agent.name}
          </div>
          <div style={{ ...MONO, fontSize: 11, color: '#52525E', marginTop: 3 }}>
            {agent.foroId}
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: '1px solid #1E1E24',
            borderRadius: 3,
            padding: '4px 10px',
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: 12,
            color: '#72727E',
            cursor: 'pointer',
          }}
        >
          close
        </button>
      </div>

      {/* Score bar */}
      <div
        style={{
          padding: '20px',
          borderBottom: '1px solid #1E1E24',
          display: 'flex',
          gap: 32,
          flexShrink: 0,
        }}
      >
        {[
          { value: agent.score,   color: scoreColor, label: 'score'   },
          { value: agent.tests,   color: '#F4F4F8',  label: 'tests'   },
          { value: agent.latency, color: '#9393A0',  label: 'latency' },
        ].map(({ value, color, label }) => (
          <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                ...MONO,
                fontSize: 32,
                lineHeight: 1,
                letterSpacing: '-0.025em',
                color,
              }}
            >
              {value}
            </div>
            <div
              style={{
                ...MONO,
                fontSize: 10,
                color: '#52525E',
                letterSpacing: '0.04em',
                textTransform: 'uppercase',
              }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid #1E1E24',
          padding: '0 20px',
          flexShrink: 0,
        }}
      >
        {(['tests', 'proof', 'metadata'] as PanelTab[]).map(t => (
          <div
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 0',
              marginRight: 20,
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 12,
              color: tab === t ? '#F4F4F8' : '#52525E',
              cursor: 'pointer',
              borderBottom: tab === t ? '1px solid #F4F4F8' : '1px solid transparent',
              fontWeight: tab === t ? 500 : 400,
              transition: 'color 150ms',
            }}
          >
            {t}
          </div>
        ))}
      </div>

      {/* Body */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        {tab === 'tests' && (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '60px 1fr 1fr auto',
                gap: 12,
                padding: '8px 20px',
                borderBottom: '1px solid #1E1E24',
              }}
            >
              {['Round', 'Score', 'Latency', 'Status'].map(h => (
                <div
                  key={h}
                  style={{
                    fontFamily: 'var(--font-sans), sans-serif',
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#52525E',
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            {MOCK_ROUNDS.map((r, i) => (
              <div
                key={r.n}
                onMouseEnter={() => setHoveredRow(i)}
                onMouseLeave={() => setHoveredRow(null)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '60px 1fr 1fr auto',
                  gap: 12,
                  padding: '9px 20px',
                  borderBottom: '1px solid #1E1E24',
                  alignItems: 'center',
                  background: hoveredRow === i ? '#161618' : 'transparent',
                  transition: 'background 150ms',
                }}
              >
                <span style={{ ...MONO, fontSize: 12, color: '#52525E' }}>{r.n}</span>
                <span
                  style={{
                    ...MONO,
                    fontSize: 12,
                    color: r.status === 'failed' ? '#F26B6B' : '#F4F4F8',
                  }}
                >
                  {r.score}
                </span>
                <span style={{ ...MONO, fontSize: 12, color: '#9393A0' }}>{r.latency}</span>
                <StatusBadge status={r.status} size="xs" />
              </div>
            ))}
          </>
        )}

        {tab === 'proof' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProofRow label="Proof hash"  value="0x7c4d8f2a1b9e3c6d5f0a2b4c8e1d3f6a9b2c5e8f1d4a7b0c3e6f9a2b5c8e1d4" />
            <ProofRow label="Anchor block" value="#21,304,991" />
            <ProofRow label="Transaction"  value="0x4a3f8c2d1e9b7f6a5c3d2e1f0a9b8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f2a1b" />
            <ProofRow label="Network"      value="mainnet" />
            <ProofRow label="Protocol"     value="ERC-8004 v2.1" />
          </div>
        )}

        {tab === 'metadata' && (
          <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <ProofRow label="foroId"             value={agent.fullAddress} />
            <ProofRow label="Created"            value="2026-04-14T08:22:01Z" />
            <ProofRow label="Last verified"      value="2026-04-30T11:04:17Z" />
            <ProofRow label="Verification count" value="47" />
          </div>
        )}
      </div>
    </div>
  );
}
