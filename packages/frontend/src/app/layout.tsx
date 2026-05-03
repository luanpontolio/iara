import type { Metadata } from 'next';
import { EB_Garamond } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { GeistPixelGrid } from 'geist/font/pixel';
import { headers } from 'next/headers';
import { cookieToInitialState } from 'wagmi';
import { Providers } from '@/components/providers/Providers';
import { wagmiConfig } from '@/lib/wagmi';
import '../styles/globals.css';

const ebGaramond = EB_Garamond({
  subsets: ['latin'],
  weight: ['400', '700'],
  style: ['normal', 'italic'],
  variable: '--font-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Foro — Agent Verification Protocol',
  description: 'Verify AI agent capabilities through economic staking and TEE-based evaluation',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const initialState = cookieToInitialState(wagmiConfig, headers().get('cookie'));

  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${ebGaramond.variable} ${GeistPixelGrid.variable}`}
      suppressHydrationWarning
    >
      <body style={{ margin: 0, height: '100%', overflow: 'hidden' }}>
        <Providers initialState={initialState}>{children}</Providers>
      </body>
    </html>
  );
}
