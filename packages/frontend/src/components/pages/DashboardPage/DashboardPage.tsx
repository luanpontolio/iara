'use client';

import { useState } from 'react';
import { Navigation } from '@/components/organisms';
import type { NavPage } from '@/lib/constants/types';
import { AgentsView } from './AgentsView';
import { DashboardHomeView } from './DashboardHomeView';
import { PlaceholderView } from './PlaceholderView';
import { ProofsView } from './ProofsView';

export function DashboardPage() {
  const [page, setPage] = useState<NavPage>('dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-bg-primary">
      <Navigation activePage={page} onNavigate={setPage} />
      {page === 'dashboard' ? <DashboardHomeView /> : null}
      {page === 'agents' ? <AgentsView /> : null}
      {page === 'proofs' ? <ProofsView /> : null}
      {page === 'logs' ? <PlaceholderView title="Logs" /> : null}
      {page === 'settings' ? <PlaceholderView title="Settings" /> : null}
    </div>
  );
}
