import React, { useEffect, useState } from 'react';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  useMyOrganizations,
  useMyOrgMemberships,
} from '../hooks/queries/useCorporateDashboard';
import { Sidebar }         from '../components/corporate/Sidebar';
import { TopBar }          from '../components/corporate/TopBar';
import { PlaceholderTab }  from '../components/corporate/PlaceholderTab';
import { OverviewTab }     from '../components/corporate/tabs/OverviewTab';
import { RelocationsTab }  from '../components/corporate/tabs/RelocationsTab';
import { RegionsTab }      from '../components/corporate/tabs/RegionsTab';
import { ContractsTab }    from '../components/corporate/tabs/ContractsTab';
import { InvoicesTab }     from '../components/corporate/tabs/InvoicesTab';
import { ComplianceTab }   from '../components/corporate/tabs/ComplianceTab';
import { MembersTab }      from '../components/corporate/tabs/MembersTab';
import { ShipmentsTab }    from '../components/corporate/tabs/ShipmentsTab';
import { RecurringTab }    from '../components/corporate/tabs/RecurringTab';
import { ApiTab }          from '../components/corporate/tabs/ApiTab';
import { TeamTab }         from '../components/corporate/tabs/TeamTab';
import { PLACEHOLDER_TABS, type DashTab } from '../components/corporate/types';

/**
 * CorporateDashboard — orchestration shell.
 *
 * Owns: tab selection + active org id. Delegates: data fetching to
 * React Query hooks (useMyOrganizations / useOrgRelocationRequests /
 * etc.) which wrap organizations-store; per-tab UI to the components
 * under /corporate/tabs.
 */
export default function CorporateDashboard() {
  const { setShowAuthModal, setAuthMode } = useApp();
  const { user } = useAuth();

  const [tab, setTab] = useState<DashTab>('overview');
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);

  const { data: orgs = [] }        = useMyOrganizations(user?.id);
  const { data: memberships = [] } = useMyOrgMemberships(user?.id);

  /* Default the active org to the first one as soon as it loads. */
  useEffect(() => {
    if (!activeOrgId && orgs.length > 0) setActiveOrgId(orgs[0].id);
  }, [orgs, activeOrgId]);

  function openSignup() {
    setShowAuthModal(true);
    setAuthMode('signup');
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar current={tab} onSelect={setTab} />
      <div className="flex-1 flex flex-col min-w-0">
        <TopBar tab={tab} onActivate={openSignup} />
        <main className="flex-1 p-6 overflow-auto">
          {tab === 'overview'    && <OverviewTab />}
          {tab === 'relocations' && (
            <RelocationsTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} userId={user?.id} />
          )}
          {tab === 'regions'     && (
            <RegionsTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} />
          )}
          {tab === 'contracts'   && (
            <ContractsTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} />
          )}
          {tab === 'invoices'    && (
            <InvoicesTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} />
          )}
          {tab === 'compliance'  && (
            <ComplianceTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} memberships={memberships} />
          )}
          {tab === 'members'     && (
            <MembersTab orgs={orgs} activeOrgId={activeOrgId} onSelectOrg={setActiveOrgId} />
          )}
          {tab === 'shipments'   && <ShipmentsTab />}
          {tab === 'recurring'   && <RecurringTab />}
          {tab === 'api'         && <ApiTab />}
          {tab === 'team'        && <TeamTab />}
          {PLACEHOLDER_TABS.includes(tab) && (
            <PlaceholderTab tab={tab} onActivate={openSignup} />
          )}
        </main>
      </div>
    </div>
  );
}
