import type { Metadata } from 'next';
import { EB_Garamond } from 'next/font/google';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
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
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${ebGaramond.variable}`}
      suppressHydrationWarning
    >
      <body style={{ margin: 0, height: '100%', overflow: 'hidden' }}>{children}</body>
    </html>
  );
}
