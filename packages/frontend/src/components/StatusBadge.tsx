export type AgentStatus = 'pending' | 'probation' | 'verified' | 'elite' | 'failed' | 'live';

interface StatusBadgeProps {
  status: AgentStatus;
  size?: 'xs' | 'sm' | 'md';
}

const CONFIGS: Record<AgentStatus, { bg: string; color: string; label: string }> = {
  pending:   { bg: 'rgba(114,114,126,0.12)', color: '#72727E', label: 'pending'   },
  probation: { bg: '#1F1400',                color: '#E8A935', label: 'probation' },
  verified:  { bg: '#0A1F10',                color: '#4ADE80', label: 'verified'  },
  elite:     { bg: '#182800',                color: '#B8FF4F', label: 'elite'     },
  failed:    { bg: '#210A0A',                color: '#F26B6B', label: 'failed'    },
  live:      { bg: '#080F1F',                color: '#5C9EE8', label: 'live'      },
};

export function StatusBadge({ status, size = 'sm' }: StatusBadgeProps) {
  const c = CONFIGS[status] ?? CONFIGS.pending;
  const fontSize  = size === 'xs' ? 9  : size === 'sm' ? 10 : 11;
  const padding   = size === 'xs' ? '1px 6px' : '2px 8px';
  const dotSize   = size === 'xs' ? 4  : 5;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontFamily: 'var(--font-mono), Menlo, Consolas, monospace',
        fontSize,
        fontWeight: 500,
        padding,
        borderRadius: 999,
        background: c.bg,
        color: c.color,
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        width: 'fit-content',
        alignSelf: 'flex-start',
      }}
    >
      <span
        style={{
          width: dotSize,
          height: dotSize,
          borderRadius: '50%',
          background: c.color,
          flexShrink: 0,
          display: 'block',
        }}
      />
      {c.label}
    </span>
  );
}
