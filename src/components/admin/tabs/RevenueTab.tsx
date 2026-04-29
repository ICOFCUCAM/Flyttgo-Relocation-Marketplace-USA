import React from 'react';
import { Card } from '../Card';
import type { RevenueStats } from '../../../services/admin';

export function RevenueTab({ stats }: { stats: RevenueStats }) {
  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Revenue</h1>
      <div className="grid grid-cols-3 gap-4">
        <Card title="Today" value={stats.today} />
        <Card title="This Week" value={stats.week} />
        <Card title="This Month" value={stats.month} />
        <Card title="Total Commission" value={stats.totalCommission} />
        <Card title="Pending Escrow" value={stats.pendingEscrow} />
        <Card title="Released to Drivers" value={stats.releasedToDrivers} />
      </div>
    </div>
  );
}
