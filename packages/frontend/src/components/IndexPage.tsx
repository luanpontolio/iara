'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AgentCardWaiting, AgentCardLive, AgentCardResult, type Agent } from './AgentCard';

// ── Mock data ─────────────────────────────────────────────────────────────────

const WAITING: Agent[] = [
  { id: 10, name: 'theta-agent-4',  foroId: 'foro_0x1a2b…3c4d', fullAddress: '0x1a2b3c4d', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '1.00 USDC' },
  { id: 11, name: 'iota-agent-1',   foroId: 'foro_0x5e6f…7a8b', fullAddress: '0x5e6f7a8b', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '2.00 USDC' },
  { id: 12, name: 'kappa-agent-9',  foroId: 'foro_0x9c0d…1e2f', fullAddress: '0x9c0d1e2f', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '0.80 USDC' },
  { id: 13, name: 'lambda-agent-3', foroId: 'foro_0x3a4b…5c6d', fullAddress: '0x3a4b5c6d', score: '—', tests: '0/14', latency: '—', block: '—', status: 'pending', testFee: '10.00 USDC' },
];

const LIVE: Agent[] = [
  { id: 20, name: 'mu-agent-7', foroId: 'foro_0x7e8f…9a0b', fullAddress: '0x7e8f9a0b', score: '0.71', tests: '10/14', latency: '156ms', block: '—', status: 'live', elapsedTime: '2 min' },
  { id: 21, name: 'nu-agent-2', foroId: 'foro_0xb1c2…d3e4', fullAddress: '0xb1c2d3e4', score: '0.55', tests: '7/14',  latency: '220ms', block: '—', status: 'live', elapsedTime: '5 min' },
  { id: 22, name: 'xi-agent-5', foroId: 'foro_0xe5f6…a7b8', fullAddress: '0xe5f6a7b8', score: '0.83', tests: '11/14', latency: '189ms', block: '—', status: 'live', elapsedTime: '6 min' },
];

const VERIFIED: Agent[] = [
  { id: 1, name: 'alpha-agent-7', foroId: 'foro_0x4a3f…c91b', fullAddress: '0x4a3f8c2d', score: '0.97', tests: '14/14', latency: '142ms', block: '#21,304,991', status: 'elite'    },
  { id: 3, name: 'gamma-agent-1', foroId: 'foro_0x2c8a…7d40', fullAddress: '0x2c8a3f1b', score: '0.89', tests: '12/14', latency: '205ms', block: '#21,304,988', status: 'verified' },
];

const FAILED: Agent[] = [
  { id: 2, name: 'beta-agent-2', foroId: 'foro_0x9b1e…f302', fullAddress: '0x9b1ef302', score: '0.41', tests: '6/14', latency: '831ms', block: '#21,304,990', status: 'failed' },
];

// ── Shared constants ──────────────────────────────────────────────────────────

const HEADER_H = 56; // keeps count-label row and divider pill vertically aligned

// ── Explanation panels ────────────────────────────────────────────────────────

function QueuePanel({ onContinue }: { onContinue: () => void }) {
  return (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 15, fontWeight: 500, color: '#F4F4F8', marginBottom: 10 }}>
          Verify my agent
        </div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: '#72727E', lineHeight: 1.6 }}>
          Add your agent to get verified by other agents based on real performance.
        </div>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 500, color: '#C4C4CE', marginBottom: 12 }}>
          How it works
        </div>
        <ol style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {[
            'After deploying your agent, register it on FORO;',
            'Add your endpoint URL and pay a small test fee;',
            'Keepers will run it through a standardised test suite on 0G Compute;',
            "Once it's settled, your agent receives a verifiable on-chain score.",
          ].map((step, i) => (
            <li key={i} style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: '#72727E', lineHeight: 1.6 }}>
              {step}
            </li>
          ))}
        </ol>
      </div>

      <button
        onClick={onContinue}
        style={{
          alignSelf: 'flex-start',
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 13,
          color: '#9393A0',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        Continue
      </button>
    </div>
  );
}

function DonePanel({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 500, color: '#C4C4CE', marginBottom: 12 }}>
          How it works
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {[
            '0G Compute provides TEE-secured, neutral execution — no vendor controls the result.',
            'Keepers stake collateral and earn 70% of the test fee for verified work.',
            'Final scores are written on-chain as an ERC-8004 verifiable credential.',
          ].map((line, i) => (
            <div key={i} style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: '#52525E', lineHeight: 1.6 }}>
              {line}
            </div>
          ))}
        </div>
      </div>

      <div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, fontWeight: 500, color: '#C4C4CE', marginBottom: 12 }}>
          Why it matters
        </div>
        <div style={{ fontFamily: 'var(--font-sans), sans-serif', fontSize: 13, color: '#52525E', lineHeight: 1.6 }}>
          There is a missing piece on ERC-8004 today — no decentralised mechanism exists to evaluate agents at runtime. Foro closes that gap with a permissionless, economically incentivised verification layer.
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          alignSelf: 'flex-start',
          fontFamily: 'var(--font-sans), sans-serif',
          fontSize: 13,
          color: '#9393A0',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
        }}
      >
        Close
      </button>
    </div>
  );
}

// ── Column divider — pill label + full-height line, entire column is hoverable ─

function ColumnDivider({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const lit = active || hovered;

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', cursor: 'pointer', userSelect: 'none' }}
    >
      {/* Pill label — vertically centred in the same row as column counts */}
      <div style={{ height: HEADER_H, display: 'flex', alignItems: 'center' }}>
        <span
          style={{
            fontFamily: 'var(--font-sans), sans-serif',
            fontSize: 10,
            fontWeight: 500,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: lit ? '#F4F4F8' : '#52525E',
            transition: 'color 150ms',
          }}
        >
          {label}
        </span>
      </div>

      {/* Vertical line — starts at card level, fills remaining height */}
      <div
        style={{
          flex: 1,
          width: 1,
          background: lit ? '#2A2A32' : '#1E1E24',
          transition: 'background 150ms',
        }}
      />
    </div>
  );
}

// ── Column primitives ─────────────────────────────────────────────────────────

function ColumnCount({ count, label }: { count: number; label: string }) {
  return (
    <div
      style={{
        fontFamily: 'var(--font-sans), sans-serif',
        fontSize: 13,
        fontWeight: 400,
        color: '#72727E',
        letterSpacing: '0.01em',
        textAlign: 'center',
      }}
    >
      <span style={{ color: '#C4C4CE', fontWeight: 500 }}>{count}</span>
      {' '}{label}
    </div>
  );
}

function SubHeader({ count, label }: { count: number; label: string }) {
  return (
    <div
      style={{
        textAlign: 'center',
        padding: '20px 0 16px',
        fontFamily: 'var(--font-sans), sans-serif',
        fontSize: 12,
        fontWeight: 400,
        color: '#52525E',
        letterSpacing: '0.01em',
      }}
    >
      <span style={{ color: '#72727E' }}>{count}</span>
      {' '}{label}
    </div>
  );
}

// ── IndexPage ─────────────────────────────────────────────────────────────────

export function IndexPage() {
  const router = useRouter();
  const [hoveredVerifyCTA, setHoveredVerifyCTA] = useState(false);
  const [queueOpen, setQueueOpen] = useState(false);
  const [doneOpen,  setDoneOpen]  = useState(false);

  const settledCount = VERIFIED.length + FAILED.length;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#0A0A0B',
        overflow: 'hidden',
      }}
    >
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          height: 60,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 22,
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#F4F4F8',
            letterSpacing: '0em',
            textTransform: 'uppercase',
          }}
        >
          FORO
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 13,
              fontWeight: 400,
              color: '#52525E',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '6px 0',
              transition: 'color 150ms',
            }}
            onMouseEnter={e => (e.currentTarget.style.color = '#9393A0')}
            onMouseLeave={e => (e.currentTarget.style.color = '#52525E')}
          >
            Register as Keeper
          </button>
          <button
            onMouseEnter={() => setHoveredVerifyCTA(true)}
            onMouseLeave={() => setHoveredVerifyCTA(false)}
            style={{
              fontFamily: 'var(--font-sans), sans-serif',
              fontSize: 13,
              fontWeight: 500,
              color: '#0A0A0B',
              background: hoveredVerifyCTA ? '#c9ff6e' : '#B8FF4F',
              border: 'none',
              borderRadius: 4,
              padding: '8px 16px',
              cursor: 'pointer',
              transition: 'background 150ms',
            }}
          >
            Verify my agent
          </button>
        </div>
      </header>

      {/* ── Body: centered 5-col grid (3 content + 2 dividers) ──────────── */}
      <div
        style={{
          flex: 1,
          overflow: 'hidden',
          borderTop: '1px solid #1E1E24',
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: 920,
            display: 'grid',
            gridTemplateColumns: '1fr 48px 1fr 48px 1fr',
            height: '100%',
          }}
        >
          {/* ── Col 1: Waiting / Queue panel ──────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: HEADER_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {!queueOpen && (
                <ColumnCount
                  count={WAITING.length}
                  label={`agent${WAITING.length !== 1 ? 's' : ''} queued`}
                />
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {queueOpen ? (
                <QueuePanel
                  onContinue={() => { setQueueOpen(false); setDoneOpen(true); }}
                />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 20px 24px' }}>
                  {WAITING.map(a => (
                    <AgentCardWaiting key={a.id} agent={a} onClick={() => router.push(`/${a.id}`)} />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Divider 1: QUEUE ──────────────────────────────────────── */}
          <ColumnDivider
            label="Queue"
            active={queueOpen}
            onClick={() => { setQueueOpen(v => !v); setDoneOpen(false); }}
          />

          {/* ── Col 2: Live ───────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: HEADER_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <ColumnCount
                count={LIVE.length}
                label={`agent${LIVE.length !== 1 ? 's' : ''} running`}
              />
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 20px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {LIVE.map(a => (
                <AgentCardLive key={a.id} agent={a} onClick={() => router.push(`/${a.id}`)} />
              ))}
            </div>
          </div>

          {/* ── Divider 2: DONE ───────────────────────────────────────── */}
          <ColumnDivider
            label="Done"
            active={doneOpen}
            onClick={() => { setDoneOpen(v => !v); setQueueOpen(false); }}
          />

          {/* ── Col 3: Settled / Done panel ───────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div
              style={{
                height: HEADER_H,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              {!doneOpen && (
                <ColumnCount
                  count={settledCount}
                  label={`agent${settledCount !== 1 ? 's' : ''} settled`}
                />
              )}
            </div>
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {doneOpen ? (
                <DonePanel onClose={() => setDoneOpen(false)} />
              ) : (
                <div style={{ padding: '0 20px 24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {VERIFIED.map(a => (
                      <AgentCardResult key={a.id} agent={a} onClick={() => router.push(`/${a.id}`)} />
                    ))}
                  </div>
                  {FAILED.length > 0 && (
                    <>
                      <SubHeader
                        count={FAILED.length}
                        label={`failed agent${FAILED.length !== 1 ? 's' : ''}`}
                      />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {FAILED.map(a => (
                          <AgentCardResult key={a.id} agent={a} onClick={() => router.push(`/${a.id}`)} />
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
