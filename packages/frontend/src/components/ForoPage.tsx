'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { StatusBadge, type AgentStatus } from './StatusBadge';
import { Gauge } from './AgentCard';

// ── Style constants ───────────────────────────────────────────────────────────

const MONO: React.CSSProperties = { fontFamily: 'var(--font-mono), Menlo, Consolas, monospace' };
const SANS: React.CSSProperties = { fontFamily: 'var(--font-sans), sans-serif' };
const SERIF: React.CSSProperties = { fontFamily: 'var(--font-serif), Georgia, serif' };

// ── Types ─────────────────────────────────────────────────────────────────────

type ForoPhase = 'queued' | 'running' | 'settled';
type TabId = 'tests' | 'proof' | 'rewards';

interface TestCase { id: string; description: string; criteria: string[] }
interface TestRound { n: string; score: string; latency: string; passed: boolean }

interface Agent {
  id: number; name: string; foroId: string;
  badgeStatus: AgentStatus; phase: ForoPhase;
  creator?: string; txHash?: string;
  testFee?: string; stakeRequired?: string;
  requestedAt?: string;
  testCases?: TestCase[];
  keeper?: string; startedAt?: string;
  step?: 'committed' | 'revealed' | 'submitted';
  progress?: [number, number];
  score?: string;
  rounds?: TestRound[];
  chatId?: string; block?: string;
  keeperEarned?: string; stakeReturned?: string;
}

// ── Mock data ─────────────────────────────────────────────────────────────────

const TC: TestCase[] = [
  { id: '01', description: 'Summarize a news article URL',   criteria: ['Concise (< 100 words)', 'Captures headline and key facts', 'No hallucination'] },
  { id: '02', description: 'Summarize a product page URL',   criteria: ['Includes price and features', 'Neutral tone', 'Accurate to source'] },
  { id: '03', description: 'Summarize a technical docs URL', criteria: ['Identifies purpose of tool', 'Mentions key API or config', 'Under 150 words'] },
];

const AGENTS: Record<string, Agent> = {
  '10': { id:10, name:'theta-agent-4',  foroId:'foro_0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d', badgeStatus:'pending',  phase:'queued',  testFee:'1.00 0G',  stakeRequired:'2.00 0G',  requestedAt:'2 min ago',  creator:'vitalik.eth',  txHash:'0x1a2b…3c4d', testCases:TC },
  '11': { id:11, name:'iota-agent-1',   foroId:'foro_0x5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b', badgeStatus:'pending',  phase:'queued',  testFee:'2.00 0G',  stakeRequired:'4.00 0G',  requestedAt:'5 min ago',  creator:'nakamoto.eth', txHash:'0x5e6f…9a0b', testCases:TC },
  '12': { id:12, name:'kappa-agent-9',  foroId:'foro_0x9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f', badgeStatus:'pending',  phase:'queued',  testFee:'0.80 0G',  stakeRequired:'1.60 0G',  requestedAt:'8 min ago',  creator:'buterin.eth',  txHash:'0x9c0d…3e4f', testCases:TC },
  '13': { id:13, name:'lambda-agent-3', foroId:'foro_0x3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d', badgeStatus:'pending',  phase:'queued',  testFee:'10.00 0G', stakeRequired:'20.00 0G', requestedAt:'12 min ago', creator:'0xdead…beef', txHash:'0x3a4b…7c8d', testCases:TC },
  '20': { id:20, name:'mu-agent-7',     foroId:'foro_0x7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b', badgeStatus:'live',     phase:'running', testFee:'1.00 0G',  stakeRequired:'2.00 0G',  requestedAt:'2 min ago',  creator:'vitalik.eth',  txHash:'0x7e8f…1a2b', keeper:'satoshi.eth',  startedAt:'2 min ago', step:'revealed',  progress:[10,14], testCases:TC },
  '21': { id:21, name:'nu-agent-2',     foroId:'foro_0xb1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6', badgeStatus:'live',     phase:'running', testFee:'2.00 0G',  stakeRequired:'4.00 0G',  requestedAt:'5 min ago',  creator:'0xcafe…f00d', txHash:'0xb1c2…d5e6', keeper:'0xb1c2…d3e4', startedAt:'5 min ago', step:'committed', progress:[0,14],  testCases:TC },
  '22': { id:22, name:'xi-agent-5',     foroId:'foro_0xe5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0', badgeStatus:'live',     phase:'running', testFee:'0.80 0G',  stakeRequired:'1.60 0G',  requestedAt:'8 min ago',  creator:'0xface…b00c', txHash:'0xe5f6…a9b0', keeper:'0xe5f6…a7b8', startedAt:'6 min ago', step:'submitted', progress:[14,14], testCases:TC },
  '1':  { id:1,  name:'alpha-agent-7',  foroId:'foro_0x4a3f8c2d1e9b7f6a5c3d2e1f0a9b8c7d', badgeStatus:'elite',    phase:'settled', testFee:'1.00 0G',  requestedAt:'3 days ago',  creator:'vitalik.eth',  txHash:'0x4a3f…8c7d', keeper:'satoshi.eth',  startedAt:'3 days ago', progress:[14,14], score:'0.97', rounds:[{n:'01',score:'0.99',latency:'112ms',passed:true},{n:'02',score:'0.97',latency:'134ms',passed:true},{n:'03',score:'0.94',latency:'128ms',passed:true},{n:'04',score:'0.98',latency:'141ms',passed:true},{n:'05',score:'0.96',latency:'119ms',passed:true}],  chatId:'0x7c4d8f2a1b9e3c6d…', block:'#21,304,991' },
  '2':  { id:2,  name:'beta-agent-2',   foroId:'foro_0x9b1ef3024c7d8a5b6e2f1a0c3d9e7f8a', badgeStatus:'failed',   phase:'settled', testFee:'1.00 0G',  requestedAt:'2 days ago',  creator:'0xcafe…f00d', txHash:'0x9b1e…7f8a', keeper:'0xb1c2…d3e4', startedAt:'2 days ago', progress:[14,14], score:'0.41', rounds:[{n:'01',score:'0.42',latency:'801ms',passed:false},{n:'02',score:'0.39',latency:'856ms',passed:false},{n:'03',score:'0.31',latency:'831ms',passed:false}],                                                                                              chatId:'0x9b1ef3024c7d8a5b…', block:'#21,304,990' },
  '3':  { id:3,  name:'gamma-agent-1',  foroId:'foro_0x2c8a3f1b9e4d7c6a5b2e1f0d3c8a7d40', badgeStatus:'verified', phase:'settled', testFee:'1.00 0G',  requestedAt:'1 day ago',   creator:'nakamoto.eth', txHash:'0x2c8a…7d40', keeper:'satoshi.eth',  startedAt:'1 day ago',  progress:[14,14], score:'0.89', rounds:[{n:'01',score:'0.91',latency:'198ms',passed:true},{n:'02',score:'0.87',latency:'212ms',passed:true},{n:'03',score:'0.88',latency:'205ms',passed:true}],                                                                                                chatId:'0x2c8a3f1b9e4d7c6a…', block:'#21,304,988' },
};

// ── Header ────────────────────────────────────────────────────────────────────

function HeaderCenter({ agent }: { agent: Agent }) {
  if (agent.phase === 'queued') {
    return <span style={{ ...SANS, fontSize: 14, color: '#9393A0', display: 'block', textAlign: 'center' }}>Waiting for a Keeper</span>;
  }
  if (agent.phase === 'running') {
    return <span style={{ ...SANS, fontSize: 14, color: '#5C9EE8', display: 'block', textAlign: 'center' }}>Started {agent.startedAt}</span>;
  }
  // Wrap in flex div — StatusBadge has alignSelf: flex-start which overrides
  // the grid's alignItems: center when the badge is a direct grid child.
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <StatusBadge status={agent.badgeStatus} size="md" />
    </div>
  );
}

function HeaderCTA({ agent }: { agent: Agent }) {
  if (agent.phase !== 'queued') return null;
  return (
    <button style={{ ...SANS, fontSize: 13, fontWeight: 500, color: '#0A0A0B', background: '#B8FF4F', border: 'none', borderRadius: 4, padding: '9px 18px', cursor: 'pointer' }}>
      Register a Keeper
    </button>
  );
}

function ProgressBar({ agent }: { agent: Agent }) {
  let color = '#4ADE80';
  let pct = '0%';

  if (agent.phase === 'running') {
    const [done, total] = agent.progress ?? [0, 14];
    pct = `${(done / total) * 100}%`;
    color = '#5C9EE8';
  } else if (agent.phase === 'settled') {
    pct = '100%';
    color = agent.badgeStatus === 'failed' ? '#F26B6B'
          : agent.badgeStatus === 'elite'  ? '#B8FF4F'
          : '#4ADE80';
  }

  return (
    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#1A1A1E' }}>
      <div style={{ height: '100%', width: pct, background: color }} />
    </div>
  );
}

// ── Info grid ─────────────────────────────────────────────────────────────────

function InfoCol({ label, value, highlight }: { label: string; value?: string | undefined; highlight?: boolean | undefined }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 7 }}>
      <span style={{ ...SANS, fontSize: 10, fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', color: '#52525E' }}>
        {label}
      </span>
      <span style={{ ...MONO, fontSize: 13, color: highlight ? '#F4F4F8' : '#72727E' }}>
        {value ?? '—'}
      </span>
    </div>
  );
}

function InfoGrid({ agent }: { agent: Agent }) {
  const [done, total] = agent.progress ?? [0, 0];
  const hasKeeper = !!agent.keeper;

  return (
    <div style={{ width: '100%' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
        <InfoCol label="Requested" value={agent.requestedAt} />
        <InfoCol label="Creator"   value={agent.creator}     highlight />
        <InfoCol label="TX Hash"   value={agent.txHash} />
      </div>

      {hasKeeper && (
        <>
          <div style={{ height: 1, background: '#1E1E24', margin: '22px 0' }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr' }}>
            <InfoCol label="Started"    value={agent.startedAt} />
            <InfoCol label="Keeper"     value={agent.keeper}    highlight />
            <InfoCol label="Tests Done" value={`${done}/${total}`} />
          </div>
        </>
      )}
    </div>
  );
}

// ── Tests tab ─────────────────────────────────────────────────────────────────

function TestsTab({ agent }: { agent: Agent }) {
  if (agent.phase === 'settled') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {agent.rounds?.map(r => (
          <div key={r.n} style={{ display: 'grid', gridTemplateColumns: '32px 1fr 80px 80px', alignItems: 'center', gap: 12, padding: '12px 16px', background: '#111113', border: '1px solid #1E1E24', borderRadius: 4 }}>
            <span style={{ ...MONO, fontSize: 11, color: '#52525E' }}>{r.n}</span>
            <span style={{ ...MONO, fontSize: 12, color: r.passed ? '#C4C4CE' : '#F26B6B' }}>{r.score}</span>
            <span style={{ ...MONO, fontSize: 12, color: '#72727E' }}>{r.latency}</span>
            <StatusBadge status={r.passed ? 'verified' : 'failed'} size="xs" />
          </div>
        ))}
      </div>
    );
  }

  if (agent.phase === 'running') {
    const [done, total] = agent.progress ?? [0, 14];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {Array.from({ length: total }, (_, i) => {
          const isDone   = i < done;
          const isActive = i === done;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', background: isActive ? 'rgba(92,158,232,0.05)' : '#111113', border: `1px solid ${isActive ? '#1D3144' : '#1E1E24'}`, borderRadius: 4 }}>
              <span style={{ ...MONO, fontSize: 10, color: isDone ? '#4ADE80' : isActive ? '#5C9EE8' : '#2A2A32', flexShrink: 0 }}>
                {isDone ? '✓' : isActive ? '·' : '○'}
              </span>
              <span style={{ ...SANS, fontSize: 12, color: isDone ? '#72727E' : isActive ? '#C4C4CE' : '#3D3D47' }}>
                Test case {String(i + 1).padStart(2, '0')}
              </span>
              {isActive && <span style={{ ...MONO, fontSize: 10, color: '#5C9EE8', marginLeft: 'auto' }}>running…</span>}
            </div>
          );
        })}
      </div>
    );
  }

  // Queued — show what will be tested
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {agent.testCases?.map(tc => (
        <div key={tc.id} style={{ padding: 14, background: '#111113', border: '1px solid #1E1E24', borderRadius: 4 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'baseline', marginBottom: 8 }}>
            <span style={{ ...MONO, fontSize: 10, color: '#52525E' }}>{tc.id}</span>
            <span style={{ ...SANS, fontSize: 12, color: '#C4C4CE' }}>{tc.description}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {tc.criteria.map((c, i) => (
              <span key={i} style={{ ...SANS, fontSize: 11, color: '#52525E' }}>· {c}</span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Proof tab ─────────────────────────────────────────────────────────────────

function ProofTab({ agent }: { agent: Agent }) {
  if (agent.phase !== 'settled') {
    return (
      <div style={{ padding: '40px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
        <span style={{ ...SANS, fontSize: 13, color: '#52525E' }}>
          TEE proof will appear here once the test settles.
        </span>
        <span style={{ ...MONO, fontSize: 11, color: '#3D3D47' }}>
          chatId · enclave signature · block anchor
        </span>
      </div>
    );
  }

  const rows = [
    { label: 'chatId (0G Compute)', value: agent.chatId },
    { label: 'Block',               value: agent.block },
    { label: 'Network',             value: '0G-Galileo-Testnet' },
    { label: 'Verified off-chain',  value: 'true' },
  ];

  return (
    <div>
      {rows.map(r => (
        <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #1E1E24' }}>
          <span style={{ ...SANS, fontSize: 12, color: '#52525E' }}>{r.label}</span>
          <span style={{ ...MONO, fontSize: 12, color: '#9393A0' }}>{r.value ?? '—'}</span>
        </div>
      ))}
    </div>
  );
}

// ── Rewards tab ───────────────────────────────────────────────────────────────

function RewardsTab({ agent }: { agent: Agent }) {
  const rawFee  = parseFloat((agent.testFee ?? '0').replace(/[^0-9.]/g, ''));
  const stake   = rawFee * 2;
  const earned  = rawFee * 0.7;
  const currency = (agent.testFee ?? '').split(' ').pop() || '0G';
  const fmt     = (n: number) => `${n.toFixed(2)} ${currency}`;

  const isSettled = agent.phase === 'settled';
  const isFailed  = agent.badgeStatus === 'failed';

  const dist = [
    { label: 'Keeper', pct: '70%', color: '#4ADE80',  amt: fmt(rawFee * 0.7) },
    { label: 'Creator', pct: '20%', color: '#9393A0', amt: fmt(rawFee * 0.2) },
    { label: 'Protocol',      pct: '10%', color: '#52525E', amt: fmt(rawFee * 0.1) },
  ];

  return (
    <div>
      {/* Stake */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #1E1E24' }}>
        <span style={{ ...SANS, fontSize: 12, color: '#52525E' }}>
          Stake {isSettled ? 'returned' : 'required (2×)'}
        </span>
        <span style={{ ...MONO, fontSize: 12, color: isSettled ? '#4ADE80' : '#C4C4CE' }}>
          {fmt(stake)}{isSettled ? ' ✓' : ''}
        </span>
      </div>

      {/* Fee */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '10px 0', borderBottom: '1px solid #1E1E24' }}>
        <span style={{ ...SANS, fontSize: 12, color: '#52525E' }}>
          {isSettled ? 'Fee earned (70%)' : 'Expected rewards'}
        </span>
        <span style={{ ...MONO, fontSize: 12, color: isSettled ? '#4ADE80' : '#9393A0' }}>
          {fmt(earned)}{isSettled ? ' ✓' : ''}
        </span>
      </div>

      {/* Net */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', padding: '12px 0', borderBottom: '1px solid #1E1E24' }}>
        <span style={{ ...SANS, fontSize: 12, color: '#52525E' }}>Net P&L</span>
        <span style={{ ...MONO, fontSize: 14, fontWeight: 500, color: '#4ADE80' }}>+{fmt(earned)}</span>
      </div>

      {/* Distribution breakdown */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5, padding: '14px 0', borderBottom: '1px solid #1E1E24' }}>
        {dist.map(d => (
          <div key={d.label} style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ ...SANS, fontSize: 11, color: '#52525E' }}>{d.label} · {d.pct}</span>
            <span style={{ ...MONO, fontSize: 11, color: d.color }}>{d.amt}</span>
          </div>
        ))}
      </div>

      {/* Failed notice */}
      {isSettled && isFailed && (
        <div style={{ marginTop: 14, padding: '10px 12px', background: 'rgba(242,107,107,0.06)', border: '1px solid rgba(242,107,107,0.15)', borderRadius: 4 }}>
          <div style={{ ...SANS, fontSize: 12, color: '#F26B6B' }}>Agent failed verification</div>
          <div style={{ ...SANS, fontSize: 11, color: '#72727E', marginTop: 3, lineHeight: 1.5 }}>
            Your stake is returned and fee earned. The agent bears the reputation cost.
          </div>
        </div>
      )}

      {/* Claim button */}
      {isSettled && (
        <div style={{ marginTop: 18 }}>
          <button style={{ ...SANS, fontSize: 13, fontWeight: 500, color: '#0A0A0B', background: '#B8FF4F', border: 'none', borderRadius: 4, padding: '10px 20px', cursor: 'pointer' }}>
            Claim Rewards
          </button>
        </div>
      )}
    </div>
  );
}

// ── ForoPage ──────────────────────────────────────────────────────────────────

export function ForoPage() {
  const params = useParams();
  const router = useRouter();
  const id    = typeof params.foroId === 'string' ? params.foroId : '';
  const agent = AGENTS[id];

  const defaultTab: TabId = agent?.phase === 'settled' ? 'proof' : 'tests';
  const [tab, setTab] = useState<TabId>(defaultTab);

  if (!agent) {
    return (
      <div style={{ display: 'flex', height: '100vh', background: '#0A0A0B', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ ...MONO, fontSize: 13, color: '#52525E' }}>foro not found · id: {id}</span>
      </div>
    );
  }

  const scoreNum   = agent.score ? parseFloat(agent.score) : 0;
  const [done, total] = agent.progress ?? [0, 14];

  const gaugeProps =
    agent.phase === 'queued'  ? { score: 0,            status: agent.badgeStatus, showFill: false as const } :
    agent.phase === 'running' ? { score: done / total,  status: agent.badgeStatus, overrideColor: '#5C9EE8' } :
    /* settled */               { score: scoreNum,       status: agent.badgeStatus };

  const tabs: { id: TabId; label: string }[] = [
    { id: 'tests',   label: 'Tests' },
    { id: 'proof',   label: 'Proof' },
    { id: 'rewards', label: 'Rewards' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#0A0A0B', overflow: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header style={{ position: 'relative', flexShrink: 0 }}>
        {/* grid: logo pinned left, status truly centered, CTA pinned right */}
        <div style={{ height: 60, display: 'grid', gridTemplateColumns: '1fr auto 1fr', alignItems: 'center', padding: '0 32px' }}>
          <button
            onClick={() => router.push('/')}
            style={{ ...SERIF, fontSize: 22, fontWeight: 700, fontStyle: 'italic', textTransform: 'uppercase', color: '#F4F4F8', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: 0, padding: 0, lineHeight: 1, justifySelf: 'start' }}
          >
            FORO
          </button>

          <HeaderCenter agent={agent} />

          <div style={{ justifySelf: 'end' }}>
            <HeaderCTA agent={agent} />
          </div>
        </div>

        <ProgressBar agent={agent} />
      </header>

      {/* ── Fixed: escrow + gauge + name + info + tab nav ──────────────── */}
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '28px 24px 0' }}>

        {/* Escrow */}
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ ...MONO, fontSize: 32, letterSpacing: '-0.02em', color: '#F4F4F8', lineHeight: 1 }}>
            {agent.testFee ?? '—'}
          </div>
          <div style={{ ...SANS, fontSize: 13, color: '#72727E', marginTop: 8 }}>
            {agent.phase === 'settled' ? 'Available to claim' : 'Locked in escrow'}
          </div>
        </div>

        {/* Gauge */}
        <Gauge {...gaugeProps} svgWidth={200} svgHeight={120} />

        {/* Agent name */}
        <div style={{ ...SANS, fontSize: 16, fontWeight: 500, color: '#F4F4F8', marginTop: 4, marginBottom: 20 }}>
          {agent.name}
        </div>

        {/* Info grid */}
        <div style={{ width: '100%', maxWidth: 540, marginBottom: 24 }}>
          <InfoGrid agent={agent} />
        </div>

        {/* Tab nav — bottom border is the scroll breakpoint */}
        <div style={{ width: '100%', maxWidth: 540 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 36, paddingBottom: 14 }}>
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                style={{
                  ...SANS, fontSize: 14,
                  color: tab === t.id ? '#F4F4F8' : '#52525E',
                  fontWeight: tab === t.id ? 500 : 400,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '0 0 6px',
                  borderBottom: `1px solid ${tab === t.id ? '#F4F4F8' : 'transparent'}`,
                  transition: 'color 150ms',
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scrollable tab content ──────────────────────────────────────── */}
      <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {/* Gradient mask — fades content in from the bg color */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 28,
          background: 'linear-gradient(to bottom, #0A0A0B, transparent)',
          zIndex: 1, pointerEvents: 'none',
        }} />
        <div style={{ height: '100%', overflowY: 'auto', padding: '12px 24px 48px' }}>
          <div style={{ maxWidth: 540, margin: '0 auto' }}>
            {tab === 'tests'   && <TestsTab   agent={agent} />}
            {tab === 'proof'   && <ProofTab   agent={agent} />}
            {tab === 'rewards' && <RewardsTab agent={agent} />}
          </div>
        </div>
      </div>
    </div>
  );
}
