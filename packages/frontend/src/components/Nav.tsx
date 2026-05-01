'use client';

export type NavPage = 'dashboard' | 'agents' | 'proofs' | 'logs' | 'settings';

interface NavProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
}

const NAV_ITEMS: { id: NavPage; label: string; icon: string }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: '⊞' },
  { id: 'agents',    label: 'Agents',    icon: '◈' },
  { id: 'proofs',    label: 'Proofs',    icon: '◉' },
  { id: 'logs',      label: 'Logs',      icon: '≡' },
  { id: 'settings',  label: 'Settings',  icon: '⚙' },
];

export function Nav({ activePage, onNavigate }: NavProps) {
  return (
    <nav
      style={{
        width: 200,
        flexShrink: 0,
        background: '#111113',
        borderRight: '1px solid #1E1E24',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: '16px 0',
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: '0 16px 20px',
          borderBottom: '1px solid #1E1E24',
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: 'var(--font-serif), Georgia, serif',
            fontSize: 20,
            fontWeight: 700,
            fontStyle: 'italic',
            color: '#F4F4F8',
            letterSpacing: '0em',
            textTransform: 'uppercase',
          }}
        >
          FORO
        </span>
      </div>

      {/* Nav items */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          gap: 1,
          padding: '4px 8px',
        }}
      >
        {NAV_ITEMS.map(item => {
          const active = activePage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '7px 10px',
                borderRadius: 3,
                cursor: 'pointer',
                transition: 'background 150ms linear',
                background: active ? '#1A1A1E' : 'transparent',
                border: 'none',
                width: '100%',
                textAlign: 'left',
              }}
            >
              <span
                style={{
                  fontSize: 13,
                  color: active ? '#F4F4F8' : '#52525E',
                  flexShrink: 0,
                  lineHeight: 1,
                }}
              >
                {item.icon}
              </span>
              <span
                style={{
                  fontFamily: 'var(--font-sans), sans-serif',
                  fontSize: 13,
                  color: active ? '#F4F4F8' : '#72727E',
                  fontWeight: active ? 500 : 400,
                }}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* Bottom — API key hint */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #1E1E24',
          marginTop: 'auto',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--font-mono), monospace',
            fontSize: 10,
            color: '#52525E',
            letterSpacing: '0.02em',
          }}
        >
          foro_sk_•••••a4f2
        </div>
      </div>
    </nav>
  );
}
