'use client';

import { Button } from '@/components/atoms';
import { StatCard } from '@/components/molecules';
import { AgentTable } from '@/components/organisms';
import { Text } from '@/components/atoms';
import { DashboardMain, DashboardTopBar } from './layout';
import { DASHBOARD_AGENTS, DASHBOARD_STATS } from './data';

export function DashboardHomeView() {
  return (
    <DashboardMain>
      <DashboardTopBar page="Dashboard">
        <Button variant="primary" size="sm">
          + New verification
        </Button>
      </DashboardTopBar>
      <div className="flex flex-col gap-5 p-5">
        <div className="grid grid-cols-4 gap-2.5">
          {DASHBOARD_STATS.map(s => (
            <StatCard key={s.label} value={s.value} label={s.label} subtitle={s.sub} />
          ))}
        </div>
        <div>
          <Text variant="label" color="muted" className="mb-2.5 text-[10px]">
            Recent verifications
          </Text>
          <AgentTable agents={DASHBOARD_AGENTS} />
        </div>
      </div>
    </DashboardMain>
  );
}
