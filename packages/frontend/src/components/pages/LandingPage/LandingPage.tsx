'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { FaXTwitter, FaGithub } from 'react-icons/fa6';
import { Button } from '@/components/atoms';

function lcg(seed: number) {
  let s = seed;
  return () => { s = (Math.imul(1664525, s) + 1013904223) >>> 0; return s / 0x100000000; };
}

const FOOTER_H = 176; // h-44 = 11rem

// The footer grid is scroll-aware: footerTop in viewport = H - scrollTop.
// When not scrolled, footerTop = H (grid entirely below viewport — invisible).
// Scrolling reveals it from the bottom, like lifting a curtain.
// Escaped dots float upward through the full viewport independently of scroll.
function DotCanvas({ scrollTop }: { scrollTop: React.RefObject<number> }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const c = ref.current;
    if (!c) return;
    c.width = window.innerWidth;
    c.height = window.innerHeight;
    const onResize = () => { c.width = window.innerWidth; c.height = window.innerHeight; };
    window.addEventListener('resize', onResize);

    const ctx = c.getContext('2d')!;
    const S = 10, R = 1;
    const rand = lcg(42);
    const MAX = 400;

    const off = Array.from({ length: MAX }, () => rand() * S);
    const spd = Array.from({ length: MAX }, () => 0.25 + rand() * 0.35);

    // Escaped dots pre-scattered across the full viewport height
    const ey  = Array.from({ length: MAX }, () => rand() * c.height);
    const esp = Array.from({ length: MAX }, () => 0.4 + rand() * 0.35);

    let raf: number;
    const draw = () => {
      const W = c.width, H = c.height;
      // Footer document top = H (upper 50vh + lower 50vh).
      // In viewport coords: H - scrollTop → clamped to [0, H].
      const footerTop = Math.max(0, H - (scrollTop.current ?? 0));
      ctx.clearRect(0, 0, W, H);
      const cols = Math.min(Math.floor(W / S), MAX);

      for (let i = 0; i < cols; i++) {
        const oi = off[i] ?? 0;
        const si = spd[i] ?? 0;
        off[i] = ((oi - si) % S + S) % S;
        const cx = S / 2 + i * S;
        const ef = Math.min(1, Math.min(cx, W - cx) / (W * 0.06));

        // Footer grid — only drawn when footerTop < H (i.e. user has scrolled)
        if (footerTop < H) {
          const colOff = off[i] ?? 0;
          for (let y = colOff - S; y <= H; y += S) {
            if (y < footerTop || y > H) continue;
            const t = (y - footerTop) / FOOTER_H;
            const a = 0.45 * ef * Math.max(0, t);
            if (a < 0.015) continue;
            ctx.beginPath();
            ctx.arc(cx, y, R, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147,147,160,${a.toFixed(2)})`;
            ctx.fill();
          }
        }

        // Escaped dot (every 6th column) — always floats upward regardless of scroll
        if (i % 6 !== 0) continue;
        const ei = (ey[i] ?? H) - (esp[i] ?? 0.5);
        ey[i] = ei < 0 ? H : ei;

        const dotY = ey[i] ?? H;
        const a = 0.35 * ef * (dotY / H); // brightest near bottom, fades toward top
        if (a >= 0.015) {
          ctx.beginPath();
          ctx.arc(cx, dotY, R, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(147,147,160,${a.toFixed(2)})`;
          ctx.fill();
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', onResize); };
  }, [scrollTop]);

  return <canvas ref={ref} className="pointer-events-none fixed inset-0 w-screen h-screen" style={{ zIndex: 0 }} />;
}

export function LandingPage() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollTop = useRef<number>(0);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => { scrollTop.current = el.scrollTop; };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div ref={containerRef} className="h-screen overflow-y-auto flex flex-col bg-bg-primary">

      <DotCanvas scrollTop={scrollTop} />

      {/* Upper half */}
      <div className="relative flex h-[50vh] flex-shrink-0 flex-col items-center justify-center text-center px-6" style={{ zIndex: 1 }}>
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

        <div className="flex items-center gap-4">
          <Button variant="primary" size="xl" onClick={() => router.push('/agent/new')}>
            Request a Foro
          </Button>
          <Button variant="ghost" size="xl" onClick={() => router.push('/app')}>
            Open app
          </Button>
        </div>
      </div>

      {/* Lower half */}
      <div className="relative flex h-[50vh] flex-shrink-0 flex-col items-center justify-center gap-6 text-center px-6" style={{ zIndex: 1 }}>
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

      {/* Footer — social icons sit on top of the dot canvas */}
      <footer className="relative h-44 w-full flex-shrink-0" style={{ zIndex: 1 }}>
        <div className="flex h-full items-center justify-center gap-8">
          <a
            href="https://x.com/forolat"
            target="_blank"
            rel="noreferrer"
            className="text-text-tertiary transition-colors hover:text-text-primary"
            aria-label="X"
          >
            <FaXTwitter size={22} />
          </a>
          <a
            href="https://github.com/luanpontolio/foro"
            target="_blank"
            rel="noreferrer"
            className="text-text-tertiary transition-colors hover:text-text-primary"
            aria-label="GitHub"
          >
            <FaGithub size={22} />
          </a>
        </div>
      </footer>

    </div>
  );
}
