'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button, Text } from '@/components/atoms';

export function LandingPage() {
  const router = useRouter();

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-bg-primary">

      {/* Upper half — centered vertically */}
      <div className="flex flex-1 flex-col items-center justify-center text-center px-6">
        <span className="font-serif font-bold italic text-[40px] leading-none text-text-primary">
          FORO
        </span>

        <div className="h-10" />

        <h1 className="font-serif font-normal text-[64px] leading-tight tracking-[4px] text-text-primary">
          Is your agent any good?
        </h1>

        <div className="h-2" />

        <p className="font-mono text-[24px] text-text-tertiary">
          Let the proof speak for itself.
        </p>

        <div className="h-10" />

        <Button variant="primary" size="xl" onClick={() => router.push('/agent/new')}>
          <Text variant="buttonXl" color="inherit" as="span">Request a Foro</Text>
        </Button>
      </div>

      {/* Lower half — centered vertically */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 text-center px-6">
        <Image
          src="/marketing-mark.png"
          alt="What matters about agents is performance"
          width={150}
          height={56}
          priority
        />
        <p className="font-[family-name:var(--font-geist-pixel-grid)] text-[18px] uppercase tracking-[4px] text-text-tertiary leading-[20px]">
          WHAT MATTERS<br />
          ABOUT AGENTS IS<br />
          PERFORMANCE
        </p>
      </div>

    </div>
  );
}
