import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Lock, FlaskConical, Globe2, ChevronDown } from 'lucide-react';
import { listMarketRollout, setMarketStatus, type MarketStatus, type MarketRolloutRow } from '../services/market-rollout-service';
import { useBackofficeAuth } from '../rbac/useBackofficeAuth';
import { PERMISSIONS } from '../rbac/permissions';

const STATUS_TONE: Record<MarketStatus, { bg: string; text: string; icon: typeof Lock; label: string }> = {
  locked: { bg: 'bg-slate-100',   text: 'text-slate-700',   icon: Lock,          label: 'Locked' },
  pilot:  { bg: 'bg-amber-50',    text: 'text-amber-800',   icon: FlaskConical,  label: 'Pilot' },
  live:   { bg: 'bg-emerald-50',  text: 'text-emerald-700', icon: Globe2,        label: 'Live' },
};

export default function MarketRolloutPage() {
  const auth = useBackofficeAuth();
  const qc = useQueryClient();
  const canUnlock = auth.hasPermission(PERMISSIONS.MARKETS_UNLOCK);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bos', 'markets', 'all'],
    queryFn:  () => listMarketRollout(),
  });

  return (
    <div className="space-y-6">
      <header>
        <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em] mb-1">Rollout control</p>
        <h1 className="text-3xl font-extrabold tracking-tight">Market rollout</h1>
        <p className="text-slate-600 mt-1 text-sm">
          Country / city status. Promotion cycle: <strong>locked → pilot → live</strong>.
          Only Super Admins and operators with <code className="bg-slate-100 px-1 rounded text-xs">markets.unlock</code> can change status.
        </p>
      </header>

      {isLoading && <p className="text-sm text-slate-500">Loading rollout state…</p>}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
            <tr>
              <th className="text-left px-5 py-3 font-bold">Country</th>
              <th className="text-left px-5 py-3 font-bold">City</th>
              <th className="text-left px-5 py-3 font-bold">Status</th>
              <th className="text-left px-5 py-3 font-bold">Notes</th>
              <th className="text-right px-5 py-3 font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {(data ?? []).map(row => (
              <RolloutRow
                key={row.id}
                row={row}
                canUnlock={canUnlock}
                onChanged={async () => { await qc.invalidateQueries({ queryKey: ['bos', 'markets'] }); await refetch(); }}
              />
            ))}
            {(data ?? []).length === 0 && !isLoading && (
              <tr>
                <td colSpan={5} className="text-center text-sm text-slate-500 py-8">
                  No markets registered. Run <code className="bg-slate-100 px-1 rounded text-xs">install-backoffice-schema.sql</code> to seed the 16-market default state.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function RolloutRow({ row, canUnlock, onChanged }: { row: MarketRolloutRow; canUnlock: boolean; onChanged: () => void }) {
  const [open, setOpen]       = useState(false);
  const [busy, setBusy]       = useState(false);
  const [error, setError]     = useState('');
  const tone = STATUS_TONE[row.status];
  const ToneIcon = tone.icon;

  async function setStatus(next: MarketStatus) {
    setOpen(false);
    setBusy(true);
    setError('');
    try {
      await setMarketStatus({ id: row.id, status: next });
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed');
    }
    setBusy(false);
  }

  return (
    <tr>
      <td className="px-5 py-3 font-bold text-slate-900 uppercase">{row.country_code}</td>
      <td className="px-5 py-3 text-slate-700">{row.city_slug ?? <span className="text-slate-400">—</span>}</td>
      <td className="px-5 py-3">
        <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider ${tone.bg} ${tone.text}`}>
          <ToneIcon size={11} /> {tone.label}
        </span>
      </td>
      <td className="px-5 py-3 text-xs text-slate-500 max-w-md">
        {row.notes ?? <span className="text-slate-400">—</span>}
        {error && <span className="block text-rose-600 mt-1">{error}</span>}
      </td>
      <td className="px-5 py-3 text-right relative">
        {!canUnlock ? (
          <span className="text-xs text-slate-400">View only</span>
        ) : (
          <div className="relative inline-block text-left">
            <button
              type="button"
              disabled={busy}
              onClick={() => setOpen(o => !o)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Change'} <ChevronDown size={12} />
            </button>
            {open && (
              <div className="absolute right-0 mt-1 w-36 bg-white border border-slate-200 rounded-lg shadow-lg z-10 py-1">
                {(['locked', 'pilot', 'live'] as MarketStatus[]).map(s => {
                  const t = STATUS_TONE[s];
                  const Tone = t.icon;
                  return (
                    <button
                      key={s}
                      onClick={() => setStatus(s)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-slate-50 text-left"
                    >
                      <Tone size={11} className="text-slate-500" />
                      Set {t.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}
