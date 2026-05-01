'use client';

import { useState } from 'react';
import { Nav, type NavPage } from './Nav';
import { AgentCard, type Agent } from './AgentCard';
import { StatusBadge } from './StatusBadge';
import { VerificationPanel } from './VerificationPanel';

const AGENTS: Agent[] = [
  { id: 1, name: 'alpha-agent-7',   foroId: 'foro_0x4a3f…c91b', fullAddress: '0x4a3f8c2d1e9b7f6a5c3d2e1f0a9b8c7d', score: '0.97', tests: '14/14', latency: '142ms', block: '#21,304,991', status: 'elite'     },
  { id: 2, name: 'beta-agent-2',    foroId: 'foro_0x9b1e…f302', fullAddress: '0x9b1ef3024c7d8a5b6e2f1a0c3d9e7f8a', score: '0.41', tests: '6/14',  latency: '831ms', block: '#21,304,990', status: 'failed'    },
  { id: 3, name: 'gamma-agent-1',   foroId: 'foro_0x2c8a…7d40', fullAddress: '0x2c8a3f1b9e4d7c6a5b2e1f0d3c8a7d40', score: '0.89', tests: '12/14', latency: '205ms', block: '#21,304,988', status: 'verified'  },
  { id: 4, name: 'delta-agent-9',   foroId: 'foro_0xf10c…8b3a', fullAddress: '0xf10c2d4e6a8b0c1d3e5f7a9b2c4d6e8a', score: '—',    tests: '0/14',  latency: '—',     block: '—',           status: 'pending'   },
  { id: 5, name: 'epsilon-agent-3', foroId: 'foro_0x3e7b…a290', fullAddress: '0x3e7ba2904f1c5d8b2a6e9c3f7d1a8b4e', score: '0.62', tests: '8/14',  latency: '310ms', block: '#21,304,985', status: 'probation' },
];

const DASHBOARD_STATS = [
  { label: 'verified agents', value: '2',    sub: 'of 5 total'    },
  { label: 'avg score',       value: '0.94', sub: 'verified only' },
  { label: 'avg latency',     value: '148ms', sub: 'last 24h'     },
  { label: 'proofs anchored', value: '47',   sub: 'on mainnet'    },
];

const PROOFS = [
  { id: '0x7c4d…1d4', agent: 'alpha-agent-7',   block: '#21,304,991', network: 'mainnet', ts: '2026-04-30' },
  { id: '0x2f8a…9c1', agent: 'gamma-agent-1',   block: '#21,304,988', network: 'mainnet', ts: '2026-04-29' },
  { id: '0xb3e2…5f7', agent: 'epsilon-agent-3', block: '#21,304,985', network: 'mainnet', ts: '2026-04-28' },
];

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), Menlo, Consolas, monospace' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-sans), sans-serif' };

function TopBar({ page, children }: { page: string; children?: React.ReactNode }) {
  return (
    <div
      style={{
        height: 48,
        borderBottom: '1px solid #1E1E24',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        flexShrink: 0,
      }}
    >
      <div style={{ ...SANS, fontSize: 13, fontWeight: 500, color: '#9393A0', letterSpacing: '0.01em' }}>
        {page}
      </div>
      {children && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>{children}</div>
      )}
    </div>
  );
}

function BtnSmall({ children, primary, onClick }: { children: React.ReactNode; primary?: boolean; onClick?: () => void }) {
  const [hovered, setHovered] = useState(false);
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: primary ? (hovered ? '#c9ff6e' : '#B8FF4F') : (hovered ? '#1A1A1E' : '#161618'),
        color: primary ? '#0A0A0B' : '#C4C4CE',
        border: primary ? 'none' : '1px solid #2A2A32',
        borderRadius: 3,
        padding: '6px 12px',
        ...SANS,
        fontSize: 12,
        fontWeight: 500,
        cursor: 'pointer',
        transition: 'all 150ms linear',
      }}
    >
      {children}
    </button>
  );
}

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div
      style={{
        background: '#111113',
        border: '1px solid #1E1E24',
        borderRadius: 4,
        padding: '14px 16px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div style={{ ...MONO, fontSize: 28, lineHeight: 1, letterSpacing: '-0.02em', color: '#F4F4F8' }}>
        {value}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <div style={{ ...MONO, fontSize: 10, color: '#72727E', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          {label}
        </div>
        <div style={{ ...MONO, fontSize: 10, color: '#52525E' }}>{sub}</div>
      </div>
    </div>
  );
}

const TABLE_COLS = '1fr 90px 90px 90px 100px';
const TABLE_HEADERS = [
  { label: 'Agent',   align: 'left'  as const },
  { label: 'Score',   align: 'right' as const },
  { label: 'Tests',   align: 'right' as const },
  { label: 'Latency', align: 'right' as const },
  { label: 'Status',  align: 'right' as const },
];

function TableRow({ agent, last }: { agent: Agent; last: boolean }) {
  const [hovered, setHovered] = useState(false);
  const scoreColor =
    agent.status === 'elite'    ? '#B8FF4F' :
    agent.status === 'verified' ? '#4ADE80' :
    agent.status === 'failed'   ? '#F26B6B' : '#52525E';

  return (
    <div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'grid',
        gridTemplateColumns: TABLE_COLS,
        padding: '10px 16px',
        borderBottom: last ? 'none' : '1px solid #1E1E24',
        background: hovered ? '#161618' : 'transparent',
        transition: 'background 150ms',
        cursor: 'default',
        alignItems: 'center',
      }}
    >
      <div>
        <div style={{ ...SANS, fontSize: 13, color: '#F4F4F8', fontWeight: 500 }}>{agent.name}</div>
        <div style={{ ...MONO, fontSize: 10, color: '#72727E', marginTop: 1 }}>{agent.foroId}</div>
      </div>
      <div style={{ ...MONO, fontSize: 13, color: scoreColor, textAlign: 'right' }}>{agent.score}</div>
      <div style={{ ...MONO, fontSize: 12, color: '#9393A0', textAlign: 'right' }}>{agent.tests}</div>
      <div style={{ ...MONO, fontSize: 12, color: '#9393A0', textAlign: 'right' }}>{agent.latency}</div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <StatusBadge status={agent.status} size="xs" />
      </div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <TopBar page="Dashboard">
        <BtnSmall primary>+ New verification</BtnSmall>
      </TopBar>
      <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {DASHBOARD_STATS.map(s => <StatCard key={s.label} {...s} />)}
        </div>
        <div>
          <div
            style={{
              ...SANS,
              fontSize: 10,
              fontWeight: 500,
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: '#52525E',
              marginBottom: 10,
            }}
          >
            Recent verifications
          </div>
          <div
            style={{
              background: '#111113',
              border: '1px solid #1E1E24',
              borderRadius: 4,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: TABLE_COLS,
                padding: '8px 16px',
                borderBottom: '1px solid #1E1E24',
                alignItems: 'center',
              }}
            >
              {TABLE_HEADERS.map(({ label, align }) => (
                <div
                  key={label}
                  style={{
                    ...SANS,
                    fontSize: 10,
                    fontWeight: 500,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                    color: '#52525E',
                    textAlign: align,
                  }}
                >
                  {label}
                </div>
              ))}
            </div>
            {AGENTS.map((a, i) => (
              <TableRow key={a.id} agent={a} last={i === AGENTS.length - 1} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentsPage() {
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const agent = AGENTS.find(a => a.id === selectedId) ?? null;

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <div
        style={{
          width: 260,
          flexShrink: 0,
          borderRight: '1px solid #1E1E24',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <TopBar page="Agents">
          <BtnSmall primary>+</BtnSmall>
        </TopBar>
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
          }}
        >
          {AGENTS.map(a => (
            <AgentCard
              key={a.id}
              agent={a}
              selected={selectedId === a.id}
              onClick={() => setSelectedId(a.id)}
            />
          ))}
        </div>
      </div>
      {agent ? (
        <VerificationPanel agent={agent} onClose={() => setSelectedId(null)} />
      ) : (
        <div
          style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div style={{ ...MONO, fontSize: 12, color: '#52525E' }}>
            select an agent to inspect
          </div>
        </div>
      )}
    </div>
  );
}

function ProofsPage() {
  const [hoveredRow, setHoveredRow] = useState<number | null>(null);

  return (
    <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
      <TopBar page="Proofs" />
      <div style={{ padding: 20 }}>
        <div
          style={{
            background: '#111113',
            border: '1px solid #1E1E24',
            borderRadius: 4,
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1.5fr 1fr 1fr 80px 100px',
              gap: 12,
              padding: '8px 16px',
              borderBottom: '1px solid #1E1E24',
            }}
          >
            {['Proof ID', 'Agent', 'Block', 'Network', 'Anchored'].map(h => (
              <div
                key={h}
                style={{
                  ...SANS,
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
          {PROOFS.map((r, i) => (
            <div
              key={r.id}
              onMouseEnter={() => setHoveredRow(i)}
              onMouseLeave={() => setHoveredRow(null)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1.5fr 1fr 1fr 80px 100px',
                gap: 12,
                padding: '10px 16px',
                borderBottom: i < PROOFS.length - 1 ? '1px solid #1E1E24' : 'none',
                background: hoveredRow === i ? '#161618' : 'transparent',
                transition: 'background 150ms',
                alignItems: 'center',
              }}
            >
              <div style={{ ...MONO, fontSize: 12, color: '#9393A0' }}>{r.id}</div>
              <div style={{ ...SANS, fontSize: 13, color: '#F4F4F8' }}>{r.agent}</div>
              <div style={{ ...MONO, fontSize: 12, color: '#9393A0' }}>{r.block}</div>
              <div style={{ ...MONO, fontSize: 11, color: '#72727E' }}>{r.network}</div>
              <StatusBadge status="verified" size="xs" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PlaceholderPage({ title }: { title: string }) {
  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
      <TopBar page={title} />
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ ...MONO, fontSize: 12, color: '#52525E' }}>coming soon</div>
      </div>
    </div>
  );
}

export function Dashboard() {
  const [page, setPage] = useState<NavPage>('dashboard');

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#0A0A0B', overflow: 'hidden' }}>
      <Nav activePage={page} onNavigate={setPage} />
      {page === 'dashboard' && <DashboardPage />}
      {page === 'agents'    && <AgentsPage />}
      {page === 'proofs'    && <ProofsPage />}
      {page === 'logs'      && <PlaceholderPage title="Logs" />}
      {page === 'settings'  && <PlaceholderPage title="Settings" />}
    </div>
  );
}
