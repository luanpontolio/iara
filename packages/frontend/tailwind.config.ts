import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:      'var(--color-bg)',
        surface: {
          DEFAULT: 'var(--color-surface)',
          raised:  'var(--color-surface-raised)',
          hover:   'var(--color-surface-hover)',
        },
        border: {
          DEFAULT: 'var(--color-border)',
          strong:  'var(--color-border-strong)',
          focus:   'var(--color-border-focus)',
        },
        fg: {
          1: 'var(--color-fg-1)',
          2: 'var(--color-fg-2)',
          3: 'var(--color-fg-3)',
          4: 'var(--color-fg-4)',
          5: 'var(--color-fg-5)',
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          muted:   'var(--color-accent-muted)',
          dim:     'var(--color-accent-dim)',
        },
        green: {
          DEFAULT: 'var(--color-green)',
          dim:     'var(--color-green-dim)',
        },
        red: {
          DEFAULT: 'var(--color-red)',
          dim:     'var(--color-red-dim)',
        },
        amber: {
          DEFAULT: 'var(--color-amber)',
          dim:     'var(--color-amber-dim)',
        },
        blue: {
          DEFAULT: 'var(--color-blue)',
          dim:     'var(--color-blue-dim)',
        },
        purple: {
          DEFAULT: 'var(--color-purple)',
          dim:     'var(--color-purple-dim)',
        },
      },
      fontFamily: {
        mono:  ['var(--font-mono)', 'Menlo', 'Consolas', 'monospace'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-sans)', 'Helvetica Neue', 'sans-serif'],
      },
      fontSize: {
        'xs':   ['11px', { lineHeight: '1.4' }],
        'sm':   ['12px', { lineHeight: '1.5' }],
        'base': ['14px', { lineHeight: '1.6' }],
        'md':   ['15px', { lineHeight: '1.5' }],
        'lg':   ['16px', { lineHeight: '1.4' }],
        'xl':   ['20px', { lineHeight: '1.3' }],
        '2xl':  ['24px', { lineHeight: '1.2' }],
        '3xl':  ['32px', { lineHeight: '1.1' }],
        '4xl':  ['48px', { lineHeight: '1.05' }],
        '5xl':  ['72px', { lineHeight: '1' }],
      },
      spacing: {
        '1':  '4px',
        '2':  '8px',
        '3':  '12px',
        '4':  '16px',
        '5':  '20px',
        '6':  '24px',
        '8':  '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
        '20': '80px',
        '24': '96px',
      },
      borderRadius: {
        'none': '0px',
        'sm':   '2px',
        'DEFAULT': '4px',
        'md':   '4px',
        'lg':   '6px',
        'pill': '999px',
      },
      boxShadow: {
        'border':  '0 0 0 1px var(--color-border)',
        'raised':  '0 0 0 1px var(--color-border), 0 2px 8px rgba(0,0,0,0.4)',
        'modal':   '0 0 0 1px var(--color-border), 0 8px 32px rgba(0,0,0,0.6)',
        'focus':   '0 0 0 2px var(--color-accent)',
      },
      transitionDuration: {
        'fast': '150ms',
        'base': '200ms',
        'slow': '300ms',
      },
      letterSpacing: {
        'tighter': '-0.03em',
        'tight':   '-0.015em',
        'normal':  '0em',
        'wide':    '0.05em',
        'wider':   '0.1em',
        'widest':  '0.15em',
      },
    },
  },
  plugins: [],
};

export default config;
