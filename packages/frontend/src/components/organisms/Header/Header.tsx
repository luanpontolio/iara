/**
 * Header Component
 *
 * Page header with logo, actions, and a persistent wallet connect button.
 */

'use client';

import React from 'react';
import { useAccount, useConnect, useDisconnect, useConfig, useSwitchChain } from 'wagmi';
import { zgNewtonTestnet } from '@/lib/wagmi';
import { cn, transition } from '@/lib/utils/styles';
import { Text } from '@/components/atoms';

export interface HeaderProps {
  logo?: React.ReactNode;
  title?: string;
  centerAction?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  onLogoClick?: () => void;
}

/**
 * Header component for page top
 * 
 * @example
 * ```tsx
 * <Header
 *   title="FORO"
 *   actions={<Button variant="primary">Verify my agent</Button>}
 * />
 * ```
 */
function WalletButton() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const config = useConfig();

  const supportedChainIds = config.chains.map(c => c.id);
  const isWrongNetwork = isConnected && chainId != null && !supportedChainIds.includes(chainId);

  if (!isConnected) {
    return (
      <button
        onClick={() => connectors[0] && connect({ connector: connectors[0] })}
        className={cn(
          'rounded-md border border-border-default bg-bg-secondary',
          'px-3 py-1.5 font-mono text-xs text-text-secondary',
          'hover:border-accent hover:text-text-primary transition-colors'
        )}
      >
        Connect Wallet
      </button>
    );
  }

  if (isWrongNetwork) {
    return (
      <button
        onClick={() => switchChain({ chainId: zgNewtonTestnet.id })}
        className={cn(
          'rounded-md border border-error/50 bg-error/10',
          'px-3 py-1.5 font-mono text-xs text-error',
          'hover:border-error transition-colors'
        )}
      >
        Switch to 0G Testnet
      </button>
    );
  }

  const displayAddress = address
    ? `${address.slice(0, 6)}…${address.slice(-4)}`
    : '';

  return (
    <button
      onClick={() => disconnect()}
      className={cn(
        'rounded-md border border-border-default bg-bg-secondary',
        'px-3 py-1.5 font-mono text-xs text-text-secondary',
        'hover:border-accent hover:text-text-primary transition-colors'
      )}
    >
      {displayAddress}
    </button>
  );
}

export function Header({
  logo,
  title = 'FORO',
  centerAction,
  actions,
  className,
  onLogoClick,
}: HeaderProps) {
  return (
    <header
      className={cn(
        'grid grid-cols-3 items-center',
        'px-8 h-[60px]',
        'flex-shrink-0',
        className
      )}
    >
      <div>
        {logo || (
          <button
            onClick={onLogoClick}
            className={cn(
              'bg-transparent border-none cursor-pointer',
              'p-0 leading-none',
              onLogoClick && transition(['opacity']),
              onLogoClick && 'hover:opacity-80'
            )}
          >
            <Text variant="title" color="primary" className="text-[22px]">
              {title}
            </Text>
          </button>
        )}
      </div>

      <div className="flex justify-center">
        {centerAction}
      </div>

      {actions && (
        <div className="flex items-center gap-3 justify-end">
          {actions}
        </div>
      )}
    </header>
  );
}

Header.displayName = 'Header';
