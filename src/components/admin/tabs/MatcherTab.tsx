import React, { useState } from 'react';
import { toast } from 'sonner';
import {
  matchProviders,
  type MatchedProviderRow, type MatchingMode, type SpecializationTag,
} from '../../../lib/matching-engine-store';
import { COUNTRY_PROFILES } from '../../../lib/country-profiles';
import type { PricingCountry } from '../../../lib/pricing-engine';

const SPECIALIZATION_TAGS: SpecializationTag[] = [
  'apartment-relocation','office-relocation','corporate-relocation',
  'international-relocation','student-relocation','equipment-relocation',
  'long-distance','local-moves','packing-only','labor-only',
  'storage-staging','last-mile-freight','climate-controlled',
  'fragile-handling','piano-or-art','corporate-it-decommission',
];

export function MatcherTab() {
  const [country,    setCountry]    = useState<PricingCountry>('us');
  const [crewSize,   setCrewSize]   = useState<2 | 3 | 4 | 5>(3);
  const [needsTruck, setNeedsTruck] = useState(true);
  const [needsPack,  setNeedsPack]  = useState(false);
  const [tags,       setTags]       = useState<SpecializationTag[]>([]);
  const [mode,       setMode]       = useState<MatchingMode>('instant');
  const [results,    setResults]    = useState<MatchedProviderRow[] | null>(null);
  const [loading,    setLoading]    = useState(false);

  async function run() {
    setLoading(true);
    try {
      const rows = await matchProviders({
        country,
        crewSize,
        needsTruck,
        needsPacking:       needsPack,
        specializationTags: tags,
      }, mode);
      setResults(rows);
    } catch (err) {
      toast.error('Matcher failed', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold mb-1">Smart matcher console</h1>
      <p className="text-sm text-gray-500 mb-4">
        Type a hypothetical request, run the matcher, see who'd dispatch and why. Read-only — does not create a booking.
      </p>

      <div className="bg-white rounded-2xl border border-gray-100 p-5 mb-5 space-y-4">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="match-country" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Country</label>
            <select
              id="match-country"
              value={country}
              onChange={e => setCountry(e.target.value as PricingCountry)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              {COUNTRY_PROFILES.map(p => (
                <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="match-crew" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Crew size</label>
            <select
              id="match-crew"
              value={crewSize}
              onChange={e => setCrewSize(Number(e.target.value) as 2 | 3 | 4 | 5)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              {[2, 3, 4, 5].map(n => <option key={n} value={n}>{n} movers</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="match-mode" className="block text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">Mode</label>
            <select
              id="match-mode"
              value={mode}
              onChange={e => setMode(e.target.value as MatchingMode)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg bg-white"
            >
              <option value="instant">instant (top 1)</option>
              <option value="multi_quote">multi_quote (top 3)</option>
              <option value="enterprise">enterprise (top 5 · CIP first)</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={run}
              disabled={loading}
              className="w-full px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-lg disabled:opacity-50"
            >
              {loading ? 'Running…' : 'Run matcher'}
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={needsTruck}
              onChange={e => setNeedsTruck(e.target.checked)}
              className="accent-emerald-600" />
            needs truck
          </label>
          <label className="flex items-center gap-1.5 text-xs">
            <input type="checkbox" checked={needsPack}
              onChange={e => setNeedsPack(e.target.checked)}
              className="accent-emerald-600" />
            needs packing
          </label>
        </div>

        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Specialization tags</p>
          <div className="flex flex-wrap gap-1.5">
            {SPECIALIZATION_TAGS.map(tag => (
              <button
                key={tag}
                type="button"
                onClick={() => setTags(t => t.includes(tag) ? t.filter(x => x !== tag) : [...t, tag])}
                className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border transition ${
                  tags.includes(tag)
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {results === null ? (
        <p className="text-sm text-gray-500">Hit "Run matcher" to see candidates.</p>
      ) : results.length === 0 ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-800">
          No providers matched the filters. Try relaxing tier (switch to instant mode), removing tags, or toggling truck off.
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase tracking-wider text-gray-600">
              <tr>
                <th className="p-3 text-left">#</th>
                <th className="p-3 text-left">Provider</th>
                <th className="p-3 text-left">Score</th>
                <th className="p-3 text-left">Tier</th>
                <th className="p-3 text-left">Reliability</th>
                <th className="p-3 text-left">Distance</th>
                <th className="p-3 text-left">Reasons</th>
              </tr>
            </thead>
            <tbody>
              {results.map((r, i) => (
                <tr key={r.user_id} className="border-t align-top">
                  <td className="p-3 text-xs text-gray-500">{i + 1}</td>
                  <td className="p-3 font-mono text-xs">{r.user_id.slice(0, 8)}…</td>
                  <td className="p-3 font-bold">{r.match_score}</td>
                  <td className="p-3 text-xs uppercase tracking-wider">
                    {r.is_cip
                      ? <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">CIP</span>
                      : r.tier_slug ?? <span className="text-gray-400">none</span>}
                  </td>
                  <td className="p-3 text-xs">{r.rank_score ?? '—'}</td>
                  <td className="p-3 text-xs">{r.distance_km ? `${r.distance_km} km` : '—'}</td>
                  <td className="p-3 text-xs text-gray-600">
                    {r.reasons.length === 0
                      ? <span className="text-gray-400">—</span>
                      : <ul className="space-y-0.5">{r.reasons.map(x => <li key={x}>· {x}</li>)}</ul>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
