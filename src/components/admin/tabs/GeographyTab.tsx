import { useEffect, useState } from 'react';
import { supabase } from '../../../lib/supabase';
import { DOCUMENT_TYPE_LABELS } from '../utils';

/**
 * GeographyTab — country-level aggregations across drivers,
 * applications, documents, compliance, expiry, and bookings.
 *
 * Backed by the SQL views installed in
 * docs/install-admin-geography-views.sql:
 *   - admin_country_driver_stats
 *   - admin_country_application_stats
 *   - admin_country_document_stats
 *   - admin_country_compliance
 *   - admin_country_document_expiry
 *   - admin_country_booking_stats
 *
 * Each view runs with security_invoker = true so the existing admin
 * RLS policies on the underlying tables decide visibility. Non-admins
 * get empty aggregations — no PII leak.
 */
export function GeographyTab() {
  const [drivers,      setDrivers]      = useState<any[]>([]);
  const [applications, setApplications] = useState<any[]>([]);
  const [documents,    setDocuments]    = useState<any[]>([]);
  const [compliance,   setCompliance]   = useState<any[]>([]);
  const [docExpiry,    setDocExpiry]    = useState<any[]>([]);
  const [bookings,     setBookings]     = useState<any[]>([]);
  const [pricing,      setPricing]      = useState<any[]>([]);
  const [loading,      setLoading]      = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const [d, a, doc, c, e, b, p] = await Promise.all([
        supabase.from('admin_country_driver_stats').select('*'),
        supabase.from('admin_country_application_stats').select('*'),
        supabase.from('admin_country_document_stats').select('*'),
        supabase.from('admin_country_compliance').select('*'),
        supabase.from('admin_country_document_expiry').select('*'),
        supabase.from('admin_country_booking_stats').select('*'),
        supabase.from('subscription_tier_pricing_by_country').select('tier_slug, display_name, country_code, currency, local_price, baseline_usd, price_source, position'),
      ]);
      if (cancelled) return;
      setDrivers(d.data ?? []);
      setApplications(a.data ?? []);
      setDocuments(doc.data ?? []);
      setCompliance(c.data ?? []);
      setDocExpiry(e.data ?? []);
      setBookings(b.data ?? []);
      setPricing(p.data ?? []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const totalRevenue = bookings.reduce(
    (sum, r) => sum + Number(r.gross_revenue ?? 0),
    0,
  );

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">Geography</h1>
      <p className="text-sm text-slate-500 mb-6">
        Aggregations grouped by country, sourced from the
        <code className="mx-1 px-1 bg-slate-100 rounded">admin_country_*</code> views.
        Numbers refresh on every visit to this tab.
      </p>

      {loading && <div className="text-sm text-slate-500 mb-4">Loading…</div>}

      <Section title="Drivers">
        <Table head={['Country', 'Total', 'Online', 'Approved', 'Suspended', 'Subscribed', 'Avg Rating', 'Avg Acceptance']}>
          {drivers.length === 0 ? (
            <Empty colSpan={8}>No drivers yet.</Empty>
          ) : drivers.map(r => (
            <tr key={r.country} className="border-t border-slate-100">
              <Td bold>{r.country}</Td>
              <Td right>{r.drivers_total}</Td>
              <Td right className="text-emerald-700">{r.drivers_online}</Td>
              <Td right>{r.drivers_approved}</Td>
              <Td right className="text-rose-700">{r.drivers_suspended}</Td>
              <Td right>{r.drivers_subscribed}</Td>
              <Td right>{r.avg_rating ?? '—'}</Td>
              <Td right>{r.avg_acceptance_rate ?? '—'}</Td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Applications">
        <Table head={['Country', 'Total', 'Pending', 'Approved', 'Rejected', 'Last 30d', 'Approval %']}>
          {applications.length === 0 ? (
            <Empty colSpan={7}>No applications yet.</Empty>
          ) : applications.map(r => {
            const decided = (r.approved ?? 0) + (r.rejected ?? 0);
            const pct     = decided > 0 ? Math.round(((r.approved ?? 0) / decided) * 100) : null;
            return (
              <tr key={r.country} className="border-t border-slate-100">
                <Td bold>{r.country}</Td>
                <Td right>{r.applications_total}</Td>
                <Td right className="text-amber-700">{r.pending}</Td>
                <Td right className="text-emerald-700">{r.approved}</Td>
                <Td right className="text-rose-700">{r.rejected}</Td>
                <Td right>{r.last_30d}</Td>
                <Td right>{pct == null ? '—' : `${pct}%`}</Td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title="Compliance health" subtitle="Per-country fill rate across 5 axes: license number, license expiry, vehicle registration, provider category, and the country's regulatory column (USDOT for US, GUKG for DE, etc.).">
        <Table head={['Country', 'Apps', 'Licence', 'Expiry', 'Vehicle Reg', 'Category', 'Country-specific', 'Compliance %']}>
          {compliance.length === 0 ? (
            <Empty colSpan={8}>No applications yet.</Empty>
          ) : compliance.map(r => {
            const pct = Number(r.compliance_pct ?? 0);
            const bar = pct >= 80 ? 'bg-emerald-500' : pct >= 50 ? 'bg-amber-500' : 'bg-rose-500';
            return (
              <tr key={r.country} className="border-t border-slate-100">
                <Td bold>{r.country}</Td>
                <Td right>{r.applications_total}</Td>
                <Td right>{r.with_license}</Td>
                <Td right>{r.with_license_expiry}</Td>
                <Td right>{r.with_vehicle_reg}</Td>
                <Td right>{r.with_provider_category}</Td>
                <Td right>{r.with_country_specific}</Td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded h-2 overflow-hidden">
                      <div className={`h-full ${bar}`} style={{ width: `${Math.min(100, Math.max(0, pct))}%` }} />
                    </div>
                    <span className="text-xs text-slate-600 w-12 text-right">{pct.toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title="Documents">
        <Table head={['Country', 'Type', 'Total', 'Approved', 'Pending', 'Rejected', 'Approval %']}>
          {documents.length === 0 ? (
            <Empty colSpan={7}>No documents yet.</Empty>
          ) : documents.map((r, i) => {
            const decided = (r.approved ?? 0) + (r.rejected ?? 0);
            const pct     = decided > 0 ? Math.round(((r.approved ?? 0) / decided) * 100) : null;
            return (
              <tr key={`${r.country}-${r.document_type}-${i}`} className="border-t border-slate-100">
                <Td bold>{r.country}</Td>
                <Td>{DOCUMENT_TYPE_LABELS[r.document_type] ?? r.document_type}</Td>
                <Td right>{r.docs_total}</Td>
                <Td right className="text-emerald-700">{r.approved}</Td>
                <Td right className="text-amber-700">{r.pending}</Td>
                <Td right className="text-rose-700">{r.rejected}</Td>
                <Td right>{pct == null ? '—' : `${pct}%`}</Td>
              </tr>
            );
          })}
        </Table>
      </Section>

      <Section title="Document expiry" subtitle="Counts of expired and expiring-within-30-days documents by country and type. tracked shows how many docs have an expires_at recorded — the rest aren't being monitored at all.">
        <Table head={['Country', 'Type', 'Total', 'Tracked', 'Expiring 30d', 'Expired']}>
          {docExpiry.length === 0 ? (
            <Empty colSpan={6}>No documents tracked yet.</Empty>
          ) : docExpiry.map((r, i) => (
            <tr key={`${r.country}-${r.document_type}-${i}`} className="border-t border-slate-100">
              <Td bold>{r.country}</Td>
              <Td>{DOCUMENT_TYPE_LABELS[r.document_type] ?? r.document_type}</Td>
              <Td right>{r.docs_total}</Td>
              <Td right>{r.tracked}</Td>
              <td className={`px-4 py-2 text-right ${r.expiring_30d > 0 ? 'text-amber-700 font-semibold' : ''}`}>{r.expiring_30d}</td>
              <td className={`px-4 py-2 text-right ${r.expired > 0 ? 'text-rose-700 font-semibold' : ''}`}>{r.expired}</td>
            </tr>
          ))}
        </Table>
      </Section>

      <Section title="Bookings & Revenue">
        <Table head={['Country', 'Total', 'In flight', 'Completed', 'Cancelled', 'Last 30d', 'Gross Revenue', 'Commission', 'Driver Payouts', 'Revenue Share']}>
          {bookings.length === 0 ? (
            <Empty colSpan={10}>No bookings yet.</Empty>
          ) : bookings.map(r => {
            const share = totalRevenue > 0 ? (Number(r.gross_revenue ?? 0) / totalRevenue) * 100 : 0;
            return (
              <tr key={r.country} className="border-t border-slate-100">
                <Td bold>{r.country}</Td>
                <Td right>{r.bookings_total}</Td>
                <Td right>{r.in_flight}</Td>
                <Td right className="text-emerald-700">{r.completed}</Td>
                <Td right className="text-rose-700">{r.cancelled}</Td>
                <Td right>{r.last_30d}</Td>
                <Td right>{fmtMoney(r.gross_revenue)}</Td>
                <Td right>{fmtMoney(r.platform_commission)}</Td>
                <Td right>{fmtMoney(r.driver_payouts)}</Td>
                <td className="px-4 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-slate-200 rounded h-2 overflow-hidden">
                      <div className="h-full bg-blue-500" style={{ width: `${Math.min(100, share)}%` }} />
                    </div>
                    <span className="text-xs text-slate-600 w-10 text-right">{share.toFixed(0)}%</span>
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      </Section>

      {/* Subscription pricing per country — sourced from the
       *  subscription_tier_pricing_by_country view. Lets ops verify
       *  the global rollout spec is applied: every cell should show
       *  price_source='override' for the 16 spec'd markets.
       *  Multiplier-derived rows mean the explicit USD wasn't set
       *  for that country and the engine fell back to the baseline. */}
      <Section title="Subscription pricing — per country" subtitle="Verifies the explicit per-country USD spec is in effect. price_source='override' = explicit; 'multiplier' = legacy fallback (baseline × country multiplier).">
        <Table head={['Country', 'Silver', 'Silver Plus', 'Gold', 'Gold Pro', 'Infrastructure', 'Source']}>
          {pricing.length === 0 ? (
            <Empty colSpan={7}>No pricing rows.</Empty>
          ) : (() => {
            type Row = { tier_slug: string; country_code: string; currency: string; local_price: string | number; price_source: string };
            const byCountry = (pricing as Row[]).reduce<Record<string, { ccy: string; tiers: Record<string, number>; sources: Set<string> }>>((acc, r) => {
              const key = r.country_code;
              acc[key] ??= { ccy: r.currency, tiers: {}, sources: new Set() };
              acc[key].tiers[r.tier_slug] = Number(r.local_price);
              acc[key].sources.add(r.price_source);
              return acc;
            }, {});
            const rows = Object.entries(byCountry).sort(([a],[b]) => a.localeCompare(b));
            return rows.map(([country, row]) => {
              const fmt = (n: number | undefined) => n == null ? '—' : `${row.ccy} ${Number(n).toLocaleString()}`;
              const allOverride = row.sources.size === 1 && row.sources.has('override');
              return (
                <tr key={country} className="border-t border-slate-100">
                  <Td bold>{country.toUpperCase()}</Td>
                  <Td right>{fmt(row.tiers.silver)}</Td>
                  <Td right>{fmt(row.tiers.silver_plus)}</Td>
                  <Td right>{fmt(row.tiers.gold)}</Td>
                  <Td right>{fmt(row.tiers.gold_pro)}</Td>
                  <Td right>{fmt(row.tiers.elite)}</Td>
                  <Td>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${allOverride ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                      {allOverride ? 'override' : 'mixed / multiplier'}
                    </span>
                  </Td>
                </tr>
              );
            });
          })()}
        </Table>
      </Section>
    </div>
  );
}

/* ── Tiny presentational helpers (kept local; nothing reusable elsewhere) ── */

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="font-bold text-slate-700 mb-1">{title}</h2>
      {subtitle && <p className="text-xs text-slate-500 mb-2">{subtitle}</p>}
      <div className="bg-white rounded shadow-sm overflow-x-auto">{children}</div>
    </div>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="w-full text-sm">
      <thead className="bg-slate-50 text-slate-600 text-xs uppercase">
        <tr>
          {head.map((h, i) => (
            <th key={i} className={`px-4 py-2 ${i === 0 || (h === 'Type') ? 'text-left' : i === head.length - 1 && (h === 'Compliance %' || h === 'Revenue Share') ? 'text-left w-48' : 'text-right'}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Td({ children, right, bold, className = '' }: { children: React.ReactNode; right?: boolean; bold?: boolean; className?: string }) {
  return (
    <td className={`px-4 py-2 ${right ? 'text-right' : ''} ${bold ? 'font-medium' : ''} ${className}`}>
      {children}
    </td>
  );
}

function Empty({ colSpan, children }: { colSpan: number; children: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-6 text-center text-slate-400">{children}</td>
    </tr>
  );
}

function fmtMoney(v: any): string {
  return Number(v ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
