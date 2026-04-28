import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, Building2, Users } from 'lucide-react';
import { loadLiveOpsByCountry, type CountryActivityRow } from '../../lib/live-ops-store';

/* ─────────────────────────────────────────────────────────────────
 * <LiveOpsStrip>
 *
 * Persistent activity ribbon for the admin shell. Cycles through the
 * country rows that have any signal (active jobs, pending bookings,
 * enterprise pending, open disputes, providers onboarding) and
 * shows the most relevant headline per country so the operator
 * always has a sense of where the platform is moving.
 *
 * Pure read; refreshes every 30s. Hidden when there's nothing
 * to show so the admin shell stays clean during off-hours.
 * ───────────────────────────────────────────────────────────────── */

const REFRESH_MS = 30_000;

export default function LiveOpsStrip() {
  const [rows,   setRows]   = useState<CountryActivityRow[]>([]);
  const [error,  setError]  = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      try {
        const data = await loadLiveOpsByCountry();
        if (cancelled) return;
        /* Only show countries with at least one signal worth surfacing. */
        setRows(data.filter(r =>
          r.active_jobs > 0 || r.pending_bookings > 0
          || r.enterprise_pending > 0 || r.open_disputes > 0
          || r.providers_onboarding > 0
        ));
        setError(false);
      } catch {
        if (!cancelled) setError(true);
      }
    }
    run();
    const id = window.setInterval(run, REFRESH_MS);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  if (error || rows.length === 0) return null;

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 py-2 flex items-center gap-3 overflow-x-auto">
        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex-shrink-0">
          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
          Live ops
        </span>
        <div className="flex items-center gap-4 text-xs whitespace-nowrap">
          {rows.map(r => (
            <span key={r.country_code} className="inline-flex items-center gap-1.5">
              <span className="text-base leading-none">{r.flag}</span>
              <span className="font-semibold text-white">{r.display_name}:</span>
              <Headline row={r} />
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

/* Pick the single most relevant signal to surface for this country.
 * Order of priority mirrors the operator's response sequence:
 * disputes > enterprise pending > active jobs > pending bookings >
 * provider onboarding. */
function Headline({ row }: { row: CountryActivityRow }) {
  if (row.open_disputes > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-red-300">
        <AlertTriangle size={11} />
        {row.open_disputes} dispute{row.open_disputes === 1 ? '' : 's'} open
      </span>
    );
  }
  if (row.enterprise_pending > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-violet-300">
        <Building2 size={11} />
        {row.enterprise_pending} enterprise pending
      </span>
    );
  }
  if (row.active_jobs > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-300">
        <Activity size={11} />
        {row.active_jobs} active relocation{row.active_jobs === 1 ? '' : 's'}
      </span>
    );
  }
  if (row.pending_bookings > 0) {
    return (
      <span className="inline-flex items-center gap-1 text-amber-300">
        {row.pending_bookings} pending booking{row.pending_bookings === 1 ? '' : 's'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-blue-300">
      <Users size={11} />
      {row.providers_onboarding} provider{row.providers_onboarding === 1 ? '' : 's'} onboarding
    </span>
  );
}
