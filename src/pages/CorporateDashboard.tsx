import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useApp } from '../lib/store';
import { useAuth } from '../lib/auth';
import {
  listMyOrganizations, listRelocationRequests,
  approveRelocationRequest, rejectRelocationRequest,
  dispatchRelocationRequest,
  createOrgInvite, listOrgInvites, revokeOrgInvite,
  type OrganizationRow, type RelocationRequestRow,
  type OrganizationInviteRow, type OrganizationRole,
} from '../lib/organizations-store';

type DashTab = 'overview' | 'shipments' | 'recurring' | 'invoices' | 'drivers' | 'analytics' | 'api' | 'team' | 'documents' | 'support' | 'relocations' | 'members';

function StatCard({ icon, label, value, sub, color = 'emerald' }: { icon: string; label: string; value: string; sub?: string; color?: string }) {
  const colors: Record<string, string> = { emerald: 'bg-emerald-50 text-emerald-600', blue: 'bg-blue-50 text-blue-600', purple: 'bg-purple-50 text-purple-600', orange: 'bg-orange-50 text-orange-600' };
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className={`w-10 h-10 ${colors[color] || colors.emerald} rounded-xl flex items-center justify-center text-lg mb-3`}>{icon}</div>
      <div className="text-2xl font-extrabold text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

const SHIPMENTS = [
  { id: 'SHP-10482', from: 'New York Warehouse', to: 'Los Angeles Distribution', status: 'In Transit', driver: 'Erik Andersen', eta: '14:30', value: '3,420 USD' },
  { id: 'SHP-10481', from: 'Chicago Store', to: 'Ålesund Office', status: 'Delivered', driver: 'Maja Larsen', eta: 'Completed', value: '1,850 USD' },
  { id: 'SHP-10480', from: 'Los Angeles Hub', to: 'Houston Client', status: 'Scheduled', driver: 'Unassigned', eta: '09:00 Tomorrow', value: '2,100 USD' },
  { id: 'SHP-10479', from: 'New York Central', to: 'Phoenix Depot', status: 'In Transit', driver: 'Lars Nilsen', eta: '16:45', value: '980 USD' },
  { id: 'SHP-10478', from: 'Philadelphia Port', to: 'New York Logistics Hub', status: 'Exception', driver: 'Ingrid Berg', eta: 'Delayed', value: '5,200 USD' },
];

const STATUS_COLORS: Record<string, string> = {
  'In Transit': 'bg-blue-100 text-blue-700',
  'Delivered':  'bg-emerald-100 text-emerald-700',
  'Scheduled':  'bg-gray-100 text-gray-600',
  'Exception':  'bg-red-100 text-red-700',
};

const NAV_ITEMS: { id: DashTab; icon: string; label: string }[] = [
  { id: 'overview',    icon: '📊', label: 'Overview' },
  { id: 'relocations', icon: '🏢', label: 'Relocations' },
  { id: 'members',     icon: '👥', label: 'Members' },
  { id: 'shipments',   icon: '🚚', label: 'Shipments' },
  { id: 'recurring',   icon: '🔁', label: 'Recurring' },
  { id: 'invoices',    icon: '💳', label: 'Invoices' },
  { id: 'drivers',     icon: '👤', label: 'Drivers' },
  { id: 'analytics',   icon: '📈', label: 'Analytics' },
  { id: 'api',         icon: '🔗', label: 'API & Webhooks' },
  { id: 'team',       icon: '👥', label: 'Team' },
  { id: 'documents',  icon: '📄', label: 'Documents' },
  { id: 'support',    icon: '🎧', label: 'Support' },
];

export default function CorporateDashboard() {
  const { setPage, setShowAuthModal, setAuthMode } = useApp();
  const { user } = useAuth();
  const [tab, setTab] = useState<DashTab>('overview');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  /* Real institutional data — only loaded when the user opens the
   * Relocations or Members tab to keep the existing demo tabs zero-
   * latency. */
  const [orgs, setOrgs] = useState<OrganizationRow[]>([]);
  const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
  const [requests, setRequests] = useState<RelocationRequestRow[]>([]);
  const [invites, setInvites] = useState<OrganizationInviteRow[]>([]);
  const [busy, setBusy] = useState(false);

  /* Lazy-load orgs whenever the user lands on a real-data tab. */
  useEffect(() => {
    if (!user?.id) return;
    if (tab !== 'relocations' && tab !== 'members') return;
    if (orgs.length > 0) return;
    listMyOrganizations(user.id)
      .then(rows => {
        setOrgs(rows);
        if (rows.length > 0 && !activeOrgId) setActiveOrgId(rows[0].id);
      })
      .catch(err => toast.error('Failed to load organizations', { description: err.message }));
  }, [tab, user?.id, orgs.length, activeOrgId]);

  useEffect(() => {
    if (!activeOrgId) return;
    if (tab === 'relocations') {
      listRelocationRequests(activeOrgId)
        .then(setRequests)
        .catch(err => toast.error('Failed to load requests', { description: err.message }));
    } else if (tab === 'members') {
      listOrgInvites(activeOrgId)
        .then(setInvites)
        .catch(err => toast.error('Failed to load invites', { description: err.message }));
    }
  }, [tab, activeOrgId]);

  async function handleApprove(req: RelocationRequestRow) {
    if (!user?.id) return;
    setBusy(true);
    try {
      await approveRelocationRequest(req.id, user.id);
      toast.success('Approved · auto-dispatching to provider');
      const fresh = await listRelocationRequests(activeOrgId!);
      setRequests(fresh);
    } catch (err) {
      toast.error('Approve failed', { description: err instanceof Error ? err.message : '' });
    } finally { setBusy(false); }
  }

  async function handleReject(req: RelocationRequestRow) {
    if (!user?.id) return;
    const comment = prompt('Reason for rejecting?') ?? '';
    if (!comment.trim()) return;
    setBusy(true);
    try {
      await rejectRelocationRequest(req.id, user.id, comment);
      toast.success('Rejected');
      const fresh = await listRelocationRequests(activeOrgId!);
      setRequests(fresh);
    } catch (err) {
      toast.error('Reject failed', { description: err instanceof Error ? err.message : '' });
    } finally { setBusy(false); }
  }

  async function handleDispatch(req: RelocationRequestRow) {
    setBusy(true);
    try {
      const bookingId = await dispatchRelocationRequest(req.id);
      if (bookingId) toast.success('Dispatched', { description: `Booking ${bookingId.slice(0, 8)}…` });
      else toast.warning('No eligible provider yet — admin will retry');
      const fresh = await listRelocationRequests(activeOrgId!);
      setRequests(fresh);
    } catch (err) {
      toast.error('Dispatch failed', { description: err instanceof Error ? err.message : '' });
    } finally { setBusy(false); }
  }

  async function handleInvite() {
    if (!activeOrgId) return;
    const email = prompt('Email of the person to invite?') ?? '';
    if (!email.trim()) return;
    const role = (prompt('Role? (owner / approver / requester / viewer)') ?? '').trim();
    if (!['owner','approver','requester','viewer'].includes(role)) {
      toast.error('Invalid role'); return;
    }
    setBusy(true);
    try {
      const token = await createOrgInvite(activeOrgId, email, role as OrganizationRole);
      const link = `${window.location.origin}/invite?token=${token}`;
      await navigator.clipboard.writeText(link).catch(() => {});
      toast.success('Invite created · link copied to clipboard', {
        description: link,
      });
      const fresh = await listOrgInvites(activeOrgId);
      setInvites(fresh);
    } catch (err) {
      toast.error('Invite failed', { description: err instanceof Error ? err.message : '' });
    } finally { setBusy(false); }
  }

  async function handleRevokeInvite(invite: OrganizationInviteRow) {
    setBusy(true);
    try {
      await revokeOrgInvite(invite.id);
      const fresh = await listOrgInvites(activeOrgId!);
      setInvites(fresh);
      toast.success('Invite revoked');
    } catch (err) {
      toast.error('Revoke failed', { description: err instanceof Error ? err.message : '' });
    } finally { setBusy(false); }
  }

  const filteredShipments = SHIPMENTS.filter(s => {
    const matchSearch = s.id.toLowerCase().includes(search.toLowerCase()) || s.from.toLowerCase().includes(search.toLowerCase()) || s.to.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || s.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="min-h-screen bg-gray-50 flex">

      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0B2E59] text-white flex-shrink-0 flex flex-col hidden lg:flex">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-sm font-bold">F</div>
            <span className="font-bold text-lg">FlyttGo</span>
          </div>
          <div className="text-xs text-white/50">Corporate Dashboard</div>
        </div>

        <nav className="flex-1 py-4">
          {NAV_ITEMS.map(item => (
            <button key={item.id} onClick={() => setTab(item.id)}
              className={`w-full flex items-center gap-3 px-5 py-3 text-sm transition ${tab === item.id ? 'bg-white/10 text-white font-semibold' : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
              <span>{item.icon}</span>{item.label}
            </button>
          ))}
        </nav>

        <div className="p-5 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center text-xs font-bold">AB</div>
            <div>
              <div className="text-xs font-medium">Acme Logistics AS</div>
              <div className="text-xs text-white/50">Enterprise Plan</div>
            </div>
          </div>
        </div>
      </aside>

      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOP BAR */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-xl font-bold text-gray-900 capitalize">{NAV_ITEMS.find(n => n.id === tab)?.label || 'Overview'}</h1>
            <p className="text-xs text-gray-400">FlyttGo Corporate · Enterprise Dashboard Preview</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:block text-xs bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-full font-medium">⚡ Live Mode</span>
            <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
              className="px-4 py-2 bg-[#0B2E59] text-white rounded-xl text-sm font-semibold hover:bg-[#1a4a8a] transition">
              Activate Account
            </button>
          </div>
        </header>

        <main className="flex-1 p-6 overflow-auto">

          {/* ── OVERVIEW ── */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard icon="🚚" label="Active Shipments" value="24" sub="↑ 3 from yesterday" color="blue"/>
                <StatCard icon="📅" label="Scheduled Today" value="47" sub="Next: 09:30 New York Hub" color="emerald"/>
                <StatCard icon="🏎️" label="Fleet Utilization" value="78%" sub="19 of 24 drivers active" color="purple"/>
                <StatCard icon="💰" label="Monthly Spend" value="142,400 USD" sub="↓ 8% vs last month" color="orange"/>
              </div>
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard icon="🌱" label="Carbon Footprint" value="2.4 tCO₂" sub="This month · -12% YoY" color="emerald"/>
                <StatCard icon="⭐" label="Avg Driver Rating" value="4.8 / 5" sub="Based on 312 deliveries" color="blue"/>
                <StatCard icon="✅" label="On-Time Delivery" value="96.2%" sub="Target: 95%" color="purple"/>
              </div>

              {/* Activity timeline */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Live Activity Feed</h3>
                <div className="space-y-3">
                  {[
                    { time: '13:42', msg: '🚚 SHP-10482 departed New York Warehouse — ETA Los Angeles 14:30', color: 'text-blue-600' },
                    { time: '13:15', msg: '✅ SHP-10481 delivered to Ålesund Office · Confirmed by Erik A.', color: 'text-emerald-600' },
                    { time: '12:58', msg: '⚠️ SHP-10478 delayed — traffic incident on E6 · Driver notified', color: 'text-red-600' },
                    { time: '12:30', msg: '📋 Recurring schedule "Los Angeles Weekly" executed — 3 orders created', color: 'text-gray-600' },
                    { time: '11:45', msg: '💳 Invoice INV-2026-04 generated · 47 deliveries · 89,200 USD', color: 'text-gray-600' },
                  ].map((item, i) => (
                    <div key={i} className="flex gap-3 items-start text-sm border-b border-gray-50 pb-3 last:border-0">
                      <span className="text-xs text-gray-400 font-mono w-12 flex-shrink-0 pt-0.5">{item.time}</span>
                      <span className={item.color}>{item.msg}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* City performance */}
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">City Performance</h3>
                <div className="space-y-3">
                  {[
                    { city: 'New York', jobs: 156, util: 82, spend: '64,200' },
                    { city: 'Los Angeles', jobs: 89, util: 71, spend: '38,100' },
                    { city: 'Chicago', jobs: 54, util: 68, spend: '22,800' },
                    { city: 'Houston', jobs: 43, util: 75, spend: '17,300' },
                  ].map(r => (
                    <div key={r.city} className="flex items-center gap-4 text-sm">
                      <span className="w-24 font-medium text-gray-700">{r.city}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div className="bg-emerald-500 h-2 rounded-full" style={{ width: `${r.util}%` }}/>
                      </div>
                      <span className="text-gray-500 w-8">{r.util}%</span>
                      <span className="text-gray-700 font-medium w-28 text-right">{r.spend} USD</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── SHIPMENTS ── */}
          {tab === 'relocations' && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h1 className="text-xl font-bold text-gray-900">Relocation requests</h1>
                {orgs.length > 1 && (
                  <select
                    value={activeOrgId ?? ''}
                    onChange={e => setActiveOrgId(e.target.value)}
                    className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                  >
                    {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                )}
              </div>
              {orgs.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
                  You're not yet a member of an organization. Reach out to
                  partnerships@flyttgo.com to onboard your team.
                </div>
              ) : requests.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
                  No relocation requests yet for {orgs.find(o => o.id === activeOrgId)?.name}.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                      <tr>
                        <th className="p-3 text-left">Filed</th>
                        <th className="p-3 text-left">Segment · country</th>
                        <th className="p-3 text-left">Brief</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requests.map(r => (
                        <tr key={r.id} className="border-t align-top">
                          <td className="p-3 text-xs text-gray-500 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            <div className="font-bold capitalize">{r.segment}</div>
                            <div className="text-xs text-gray-500 uppercase">{r.country}{r.city ? ` · ${r.city}` : ''}</div>
                          </td>
                          <td className="p-3 text-xs text-gray-600 max-w-xs truncate">
                            {(r.brief?.summary as string) ?? (r.brief?.inventoryNote as string) ?? '—'}
                          </td>
                          <td className="p-3">
                            <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                              r.status === 'submitted'   ? 'bg-amber-100 text-amber-700' :
                              r.status === 'approved'    ? 'bg-blue-100 text-blue-700' :
                              r.status === 'dispatched'  ? 'bg-emerald-100 text-emerald-700' :
                              r.status === 'completed'   ? 'bg-gray-100 text-gray-600' :
                              r.status === 'rejected' || r.status === 'cancelled' ? 'bg-rose-100 text-rose-700' :
                                                          'bg-slate-100 text-slate-500'
                            }`}>{r.status}</span>
                          </td>
                          <td className="p-3">
                            {r.status === 'submitted' ? (
                              <div className="flex gap-1.5">
                                <button disabled={busy} onClick={() => handleApprove(r)}
                                  className="text-[10px] font-bold uppercase tracking-wider bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded disabled:opacity-50">Approve</button>
                                <button disabled={busy} onClick={() => handleReject(r)}
                                  className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded disabled:opacity-50">Reject</button>
                              </div>
                            ) : r.status === 'approved' ? (
                              <button disabled={busy} onClick={() => handleDispatch(r)}
                                className="text-[10px] font-bold uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded disabled:opacity-50">Re-dispatch</button>
                            ) : (
                              <span className="text-xs text-gray-400">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'members' && (
            <div>
              <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
                <h1 className="text-xl font-bold text-gray-900">Members & invites</h1>
                <div className="flex items-center gap-3">
                  {orgs.length > 1 && (
                    <select
                      value={activeOrgId ?? ''}
                      onChange={e => setActiveOrgId(e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
                    >
                      {orgs.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}
                    </select>
                  )}
                  <button
                    disabled={busy || !activeOrgId}
                    onClick={handleInvite}
                    className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-bold rounded-lg"
                  >Invite member</button>
                </div>
              </div>
              {orgs.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
                  Join an organization first.
                </div>
              ) : invites.length === 0 ? (
                <div className="bg-white rounded-2xl p-6 border border-gray-100 text-sm text-gray-500">
                  No outstanding invites. The "Invite member" button copies a
                  signed link you can share via your usual channel.
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
                      <tr>
                        <th className="p-3 text-left">Email</th>
                        <th className="p-3 text-left">Role</th>
                        <th className="p-3 text-left">Status</th>
                        <th className="p-3 text-left">Expires</th>
                        <th className="p-3 text-left">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invites.map(i => {
                        const expired = new Date(i.expires_at) < new Date();
                        return (
                          <tr key={i.id} className="border-t">
                            <td className="p-3">{i.invited_email}</td>
                            <td className="p-3 text-xs uppercase tracking-wider">{i.role}</td>
                            <td className="p-3">
                              {i.accepted_at ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-md">Accepted</span>
                              ) : i.revoked_at ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-md">Revoked</span>
                              ) : expired ? (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded-md">Expired</span>
                              ) : (
                                <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-md">Pending</span>
                              )}
                            </td>
                            <td className="p-3 text-xs text-gray-500">
                              {new Date(i.expires_at).toLocaleDateString()}
                            </td>
                            <td className="p-3">
                              {!i.accepted_at && !i.revoked_at && (
                                <button disabled={busy} onClick={() => handleRevokeInvite(i)}
                                  className="text-[10px] font-bold uppercase tracking-wider bg-rose-600 hover:bg-rose-700 text-white px-2 py-1 rounded disabled:opacity-50">Revoke</button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {tab === 'shipments' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search shipment ID, origin, or destination..."
                  className="flex-1 border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none"/>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                  className="border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-emerald-500 outline-none bg-white">
                  <option value="all">All Status</option>
                  <option>In Transit</option>
                  <option>Delivered</option>
                  <option>Scheduled</option>
                  <option>Exception</option>
                </select>
                <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition">+ New Shipment</button>
              </div>

              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Shipment ID','From','To','Status','Driver','ETA','Value',''].map(h => (
                        <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filteredShipments.map(s => (
                      <tr key={s.id} className="hover:bg-gray-50 transition">
                        <td className="py-3.5 px-4 font-mono text-xs text-gray-600">{s.id}</td>
                        <td className="py-3.5 px-4 text-gray-700">{s.from}</td>
                        <td className="py-3.5 px-4 text-gray-700">{s.to}</td>
                        <td className="py-3.5 px-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[s.status] || 'bg-gray-100 text-gray-600'}`}>{s.status}</span></td>
                        <td className="py-3.5 px-4 text-gray-600">{s.driver}</td>
                        <td className="py-3.5 px-4 text-gray-600">{s.eta}</td>
                        <td className="py-3.5 px-4 font-medium text-gray-900">{s.value}</td>
                        <td className="py-3.5 px-4"><button className="text-xs text-emerald-600 hover:underline">Track →</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredShipments.length === 0 && (
                  <div className="py-12 text-center text-gray-400">No shipments match your search.</div>
                )}
              </div>
            </div>
          )}

          {/* ── RECURRING ── */}
          {tab === 'recurring' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-gray-500 text-sm">3 active schedules · Next run: Today 16:00</p>
                <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">+ New Schedule</button>
              </div>
              {[
                { name: 'Los Angeles Weekly Supply', freq: 'Every Monday 07:00', route: 'New York → Los Angeles', status: 'Active', nextRun: 'Mon 07:00' },
                { name: 'Daily Houston Run', freq: 'Daily 06:30', route: 'New York Central → Houston Depot', status: 'Active', nextRun: 'Tomorrow 06:30' },
                { name: 'Monthly Archive Pickup', freq: '1st of month 14:00', route: 'Multiple → New York Warehouse', status: 'Paused', nextRun: '1 May 14:00' },
              ].map(s => (
                <div key={s.name} className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center justify-between">
                  <div>
                    <div className="font-bold text-gray-900">{s.name}</div>
                    <div className="text-sm text-gray-500 mt-1">{s.route} · {s.freq}</div>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-right">
                      <div className="text-gray-400 text-xs">Next run</div>
                      <div className="font-medium text-gray-700">{s.nextRun}</div>
                    </div>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${s.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>{s.status}</span>
                    <button className="text-emerald-600 text-xs hover:underline">Edit</button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── INVOICES ── */}
          {tab === 'invoices' && (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard icon="💰" label="Outstanding Balance" value="89,200 USD" color="orange"/>
                <StatCard icon="✅" label="Paid This Year" value="412,800 USD" color="emerald"/>
                <StatCard icon="📄" label="Total Invoices" value="18" sub="Since Jan 2026" color="blue"/>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Invoice','Period','Deliveries','Amount','Status',''].map(h => <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { id: 'INV-2026-04', period: 'Apr 2026', count: 47, amount: '89,200 USD', status: 'Due 01 May' },
                      { id: 'INV-2026-03', period: 'Mar 2026', count: 52, amount: '97,400 USD', status: 'Paid' },
                      { id: 'INV-2026-02', period: 'Feb 2026', count: 38, amount: '74,600 USD', status: 'Paid' },
                      { id: 'INV-2026-01', period: 'Jan 2026', count: 41, amount: '81,200 USD', status: 'Paid' },
                    ].map(inv => (
                      <tr key={inv.id} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-mono text-xs">{inv.id}</td>
                        <td className="py-3.5 px-4">{inv.period}</td>
                        <td className="py-3.5 px-4">{inv.count} deliveries</td>
                        <td className="py-3.5 px-4 font-medium">{inv.amount}</td>
                        <td className="py-3.5 px-4">
                          <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${inv.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>{inv.status}</span>
                        </td>
                        <td className="py-3.5 px-4 flex gap-3">
                          <button className="text-xs text-emerald-600 hover:underline">PDF</button>
                          <button className="text-xs text-gray-400 hover:underline">CSV</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── API ── */}
          {tab === 'api' && (
            <div className="space-y-6">
              <div className="grid sm:grid-cols-3 gap-4">
                <StatCard icon="⚡" label="API Calls Today" value="12,482" sub="↑ 8% vs yesterday" color="blue"/>
                <StatCard icon="✅" label="Success Rate" value="99.8%" sub="Last 30 days" color="emerald"/>
                <StatCard icon="🔔" label="Webhooks Fired" value="1,247" sub="24 failed (retrying)" color="purple"/>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">API Credentials</h3>
                <div className="space-y-3">
                  {[
                    { label: 'API Key', value: 'fgo_live_••••••••••••••••4f2a', copy: true },
                    { label: 'Webhook Secret', value: 'whsec_••••••••••••••••9b1c', copy: true },
                    { label: 'Base URL', value: 'https://api.flyttgo.com/v1', copy: false },
                    { label: 'Environment', value: 'Production', copy: false },
                  ].map(item => (
                    <div key={item.label} className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
                      <div>
                        <div className="text-xs text-gray-400 font-medium">{item.label}</div>
                        <div className="font-mono text-sm text-gray-700 mt-0.5">{item.value}</div>
                      </div>
                      {item.copy && <button className="text-xs text-emerald-600 border border-emerald-200 px-3 py-1 rounded-lg hover:bg-emerald-50">Copy</button>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 p-6">
                <h3 className="font-bold text-gray-900 mb-4">Webhook Endpoints</h3>
                {[
                  { url: 'https://erp.acme.no/webhooks/flyttgo', events: 'delivery.completed, delivery.failed', status: 'Active' },
                  { url: 'https://wms.acme.no/hooks/inbound', events: 'booking.created, booking.cancelled', status: 'Active' },
                ].map((wh, i) => (
                  <div key={i} className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
                    <div>
                      <div className="font-mono text-xs text-gray-700">{wh.url}</div>
                      <div className="text-xs text-gray-400 mt-0.5">{wh.events}</div>
                    </div>
                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">{wh.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── TEAM ── */}
          {tab === 'team' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500">4 team members · 2 pending invites</p>
                <button className="px-5 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-semibold">+ Invite Member</button>
              </div>
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>{['Member','Role','Department','Status','Last Active',''].map(h => <th key={h} className="text-left py-3 px-4 font-semibold text-gray-600 text-xs uppercase tracking-wide">{h}</th>)}</tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {[
                      { name: 'Ola Nordmann', role: 'Admin', dept: 'Operations', status: 'Active', last: 'Now' },
                      { name: 'Kari Hansen', role: 'Booker', dept: 'Logistics', status: 'Active', last: '2h ago' },
                      { name: 'Per Eriksen', role: 'Finance', dept: 'Accounts', status: 'Active', last: 'Yesterday' },
                      { name: 'Ingrid Berg', role: 'Viewer', dept: 'Procurement', status: 'Pending', last: 'Never' },
                    ].map(m => (
                      <tr key={m.name} className="hover:bg-gray-50">
                        <td className="py-3.5 px-4 font-medium">{m.name}</td>
                        <td className="py-3.5 px-4"><span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{m.role}</span></td>
                        <td className="py-3.5 px-4 text-gray-500">{m.dept}</td>
                        <td className="py-3.5 px-4"><span className={`px-2 py-0.5 rounded text-xs ${m.status === 'Active' ? 'bg-emerald-100 text-emerald-700' : 'bg-yellow-100 text-yellow-700'}`}>{m.status}</span></td>
                        <td className="py-3.5 px-4 text-gray-400">{m.last}</td>
                        <td className="py-3.5 px-4"><button className="text-xs text-gray-400 hover:text-red-500">Remove</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── OTHER TABS ── */}
          {['drivers','analytics','documents','support'].includes(tab) && (
            <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center">
              <div className="text-5xl mb-4">{NAV_ITEMS.find(n => n.id === tab)?.icon}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{NAV_ITEMS.find(n => n.id === tab)?.label}</h3>
              <p className="text-gray-500 mb-6 max-w-sm mx-auto">This module is available on the Enterprise plan. Activate your account to unlock full access.</p>
              <button onClick={() => { setShowAuthModal(true); setAuthMode('signup'); }}
                className="px-8 py-3 bg-[#0B2E59] text-white rounded-xl font-semibold hover:bg-[#1a4a8a] transition">
                Activate Corporate Account
              </button>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
