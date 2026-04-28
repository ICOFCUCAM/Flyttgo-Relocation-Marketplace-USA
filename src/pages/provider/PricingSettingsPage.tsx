import React, { useEffect, useMemo, useState } from 'react';
import {
  DollarSign, Truck, Package, Boxes, Save, Calculator,
  AlertTriangle, ArrowLeft, Loader2, type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { useApp } from '../../lib/store';
import { useAuth } from '../../lib/auth';
import {
  loadProviderPricing, saveProviderPricing,
  PROVIDER_PRICING_DEFAULTS, type ProviderPricingRow,
} from '../../lib/provider-pricing-store';
import {
  calculateQuote, COUNTRY_BASELINES, COMMISSION_DEFAULT,
} from '../../lib/pricing-engine';
import type { PricingCountry } from '../../lib/pricing-engine';
import { COUNTRY_PROFILES } from '../../lib/country-profiles';
import { Section, Eyebrow, Pill } from '../../components/ds';
import EarningsSimulator from '../../components/global/EarningsSimulator';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <PricingSettingsPage> — /driver/pricing
 *
 * Provider-facing dashboard that controls how the platform's
 * 9-layer pricing engine behaves for this provider:
 *
 *   • Capacity     — service radius, crew sizes available, truck /
 *                    packing / storage availability
 *   • Rate floor   — optional per-hour override (null → inherit from
 *                    country baseline × city multiplier)
 *   • Adjustments  — weekend multiplier override (null → 1.12 default)
 *   • Service rates— truck / packing per-hour overrides
 *
 * Live preview: a sample-quote panel runs the engine against a
 * representative scenario for every edit, showing the customer
 * total, marketplace fee, and provider payout in real time.
 * ───────────────────────────────────────────────────────────────── */

export default function PricingSettingsPage() {
  const { setPage } = useApp();
  const { user } = useAuth();

  const [row,         setRow]         = useState<ProviderPricingRow | null>(null);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [loadError,   setLoadError]   = useState<string | null>(null);

  /* Sample-quote inputs that drive the live preview panel. */
  const [previewCountry, setPreviewCountry] = useState<PricingCountry>('us');
  const [previewWeekend, setPreviewWeekend] = useState(true);

  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    loadProviderPricing(user.id)
      .then(r => { setRow(r); setLoadError(null); })
      .catch(err => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [user?.id]);

  /* Derived: the engine's preview total + payout. Recomputes on
   * every edit; calculateQuote is pure + synchronous. */
  const preview = useMemo(() => {
    if (!row) return null;
    return calculateQuote({
      country:        previewCountry,
      /* Pick a representative metropolitan city per country so the
       * preview never reads as country-baseline-only. */
      city:           ({
        us: 'Dallas',     ca: 'Toronto',  gb: 'London',
        de: 'Berlin',     fr: 'Paris',    no: 'Oslo',
        ng: 'Lagos',      ke: 'Nairobi',  ae: 'Dubai',
      } as const)[previewCountry],
      crewSize:       row.available_crew_sizes[0] ?? 2,
      serviceType:    row.truck_available ? 'movers-truck' : 'labor-only',
      estimatedHours: 4,
      timing:         { weekend: previewWeekend },
      commissionPct:  COMMISSION_DEFAULT,
      insurance:      'basic',
    });
  }, [row, previewCountry, previewWeekend]);

  function patch<K extends keyof ProviderPricingRow>(key: K, value: ProviderPricingRow[K]) {
    setRow(r => r ? { ...r, [key]: value } : r);
  }

  function toggleCrewSize(n: 2 | 3 | 4 | 5) {
    if (!row) return;
    const has = row.available_crew_sizes.includes(n);
    const next = has
      ? row.available_crew_sizes.filter(x => x !== n)
      : [...row.available_crew_sizes, n].sort((a, b) => a - b) as (2 | 3 | 4 | 5)[];
    /* Always keep at least one size selected — the engine needs
     * a crew multiplier to compute a quote. */
    if (next.length === 0) {
      toast.error('Pick at least one crew size', {
        description: 'Customers see this as your offered crew sizes.',
      });
      return;
    }
    patch('available_crew_sizes', next);
  }

  async function handleSave() {
    if (!user?.id || !row) return;
    setSaving(true);
    try {
      const saved = await saveProviderPricing(user.id, row);
      setRow(saved);
      track('provider_pricing_saved', {
        radius: saved.service_radius_km,
        crews:  saved.available_crew_sizes.length,
        truck:  saved.truck_available,
        pack:   saved.packing_available,
      });
      toast.success('Pricing settings saved', {
        description: 'Live across the marketplace immediately.',
      });
    } catch (err) {
      toast.error('Save failed', {
        description: err instanceof Error ? err.message : 'Try again in a moment.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (!user) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <AlertTriangle size={32} className="text-amber-500 mx-auto mb-3" />
          <h1 className="text-xl font-extrabold text-ink-900 mb-2">Sign in to manage pricing</h1>
          <p className="text-slate-600 mb-5">Pricing settings are restricted to verified providers.</p>
          <button
            onClick={() => setPage('driver-portal')}
            className="px-5 py-2.5 bg-ink-900 text-white rounded-xl font-bold hover:bg-slate-800 transition"
          >
            Driver portal
          </button>
        </div>
      </Section>
    );
  }

  if (loading) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <div className="flex items-center justify-center gap-3 text-slate-500 py-20">
          <Loader2 size={20} className="animate-spin" />
          Loading your pricing settings…
        </div>
      </Section>
    );
  }

  if (loadError || !row) {
    return (
      <Section tone="canvas" size="lg" containerSize="narrow">
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6">
          <p className="text-sm font-bold text-rose-700 mb-1">Couldn't load pricing settings</p>
          <p className="text-xs text-rose-600">{loadError ?? 'Unknown error.'}</p>
        </div>
      </Section>
    );
  }

  const baseline = COUNTRY_BASELINES[previewCountry];

  return (
    <main className="bg-white text-ink-900">
      {/* HERO */}
      <Section tone="ink" size="default">
        <button
          onClick={() => setPage('driver-portal')}
          className="inline-flex items-center gap-1.5 text-amber-300 hover:text-amber-200 text-xs font-bold uppercase tracking-wider mb-6 transition"
        >
          <ArrowLeft size={12} /> Driver portal
        </button>
        <Pill tone="brand" className="mb-3"><DollarSign size={12} /> Pricing settings</Pill>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-[1.05] mb-3">
          How customers see your rates.
        </h1>
        <p className="text-white/75 max-w-2xl">
          The platform's 9-layer pricing engine takes your country baseline,
          your city's metro multiplier, your crew sizes, and your service
          mix to compute the customer's total. The settings below let you
          override defaults where it makes sense — e.g. set a higher
          per-hour floor in a premium metro, or a tighter service radius
          while you grow.
        </p>
      </Section>

      <Section tone="soft" size="default">
        <div className="grid lg:grid-cols-12 gap-6">
          {/* CONTROLS */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
            {/* Capacity */}
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              1. Capacity
            </h2>

            <Field label={`Service radius · ${row.service_radius_km} km`}>
              <input
                type="range"
                min={1}
                max={200}
                step={1}
                value={row.service_radius_km}
                onChange={e => patch('service_radius_km', Number(e.target.value))}
                className="w-full accent-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                Bookings outside this radius from your home city won't appear
                in your dispatch queue.
              </p>
            </Field>

            <Field label="Crew sizes you offer">
              <div className="flex gap-1.5">
                {([2, 3, 4, 5] as const).map(n => (
                  <Chip
                    key={n}
                    active={row.available_crew_sizes.includes(n)}
                    onClick={() => toggleCrewSize(n)}
                  >
                    {n} movers
                  </Chip>
                ))}
              </div>
            </Field>

            <Field label="Service availability">
              <div className="flex flex-wrap gap-1.5">
                <Toggle
                  active={row.truck_available}
                  onClick={() => patch('truck_available', !row.truck_available)}
                  icon={Truck}
                >
                  Truck included
                </Toggle>
                <Toggle
                  active={row.packing_available}
                  onClick={() => patch('packing_available', !row.packing_available)}
                  icon={Package}
                >
                  Packing crew
                </Toggle>
                <Toggle
                  active={row.storage_available}
                  onClick={() => patch('storage_available', !row.storage_available)}
                  icon={Boxes}
                >
                  Storage staging
                </Toggle>
              </div>
            </Field>

            {/* Rate floor */}
            <h2 className="mt-8 text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              2. Rate overrides
            </h2>

            <Field label="Hourly base override (optional)">
              <div className="flex items-center gap-2">
                <span className="text-sm text-slate-500 w-8">{baseline.symbol}</span>
                <input
                  type="number"
                  min={0}
                  step={5}
                  placeholder={`Inherit (${baseline.symbol}${baseline.baseHourly}/hr per mover)`}
                  value={row.hourly_base_override ?? ''}
                  onChange={e => patch('hourly_base_override', e.target.value === '' ? null : Number(e.target.value))}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                {row.hourly_base_override != null && (
                  <button
                    type="button"
                    onClick={() => patch('hourly_base_override', null)}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Leave blank to inherit the country baseline × city multiplier.
                Set higher to floor your rate in a premium metro.
              </p>
            </Field>

            <Field label="Weekend multiplier override (optional)">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1.0}
                  max={2.0}
                  step={0.01}
                  placeholder="Inherit (1.12 default)"
                  value={row.weekend_multiplier_override ?? ''}
                  onChange={e => patch('weekend_multiplier_override', e.target.value === '' ? null : Number(e.target.value))}
                  className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                />
                {row.weekend_multiplier_override != null && (
                  <button
                    type="button"
                    onClick={() => patch('weekend_multiplier_override', null)}
                    className="text-[11px] text-slate-500 hover:text-rose-600 underline"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                1.0 = no uplift, 1.12 = +12% (platform default), 1.20 = +20%.
              </p>
            </Field>

            {row.truck_available && (
              <Field label="Truck per-hour adder override (optional)">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-8">{baseline.symbol}</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    placeholder="Inherit (60 default)"
                    value={row.truck_per_hour_override ?? ''}
                    onChange={e => patch('truck_per_hour_override', e.target.value === '' ? null : Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </Field>
            )}

            {row.packing_available && (
              <Field label="Packing per-hour adder override (optional)" last>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-slate-500 w-8">{baseline.symbol}</span>
                  <input
                    type="number"
                    min={0}
                    step={5}
                    placeholder="Inherit (25 default)"
                    value={row.packing_per_hour_override ?? ''}
                    onChange={e => patch('packing_per_hour_override', e.target.value === '' ? null : Number(e.target.value))}
                    className="flex-1 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  />
                </div>
              </Field>
            )}

            <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setRow({ ...PROVIDER_PRICING_DEFAULTS, user_id: user.id })}
                className="text-xs text-slate-500 hover:text-rose-600 underline underline-offset-2"
              >
                Reset to platform defaults
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:opacity-50 disabled:cursor-not-allowed text-ink-900 font-bold rounded-xl shadow-medium transition"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {saving ? 'Saving…' : 'Save settings'}
              </button>
            </div>
          </div>

          {/* PREVIEW */}
          <aside className="lg:col-span-5 bg-ink-900 text-white rounded-2xl p-6 self-start sticky top-6">
            <div className="flex items-center gap-2 mb-5">
              <Calculator size={16} className="text-amber-300" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
                Sample customer quote · live
              </p>
            </div>

            <div className="mb-5 space-y-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1.5">Country</p>
                <select
                  value={previewCountry}
                  onChange={e => setPreviewCountry(e.target.value as PricingCountry)}
                  className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {COUNTRY_PROFILES.map(p => (
                    <option key={p.code} value={p.code}>{p.flag} {p.name}</option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-xs text-white/80">
                <input
                  type="checkbox"
                  checked={previewWeekend}
                  onChange={e => setPreviewWeekend(e.target.checked)}
                  className="accent-amber-400"
                />
                Weekend booking (+12%)
              </label>
            </div>

            {preview && (
              <>
                <p className="text-[10px] font-bold uppercase tracking-wider text-white/50 mb-1">
                  Customer pays
                </p>
                <p className="text-4xl font-extrabold text-white mb-1">
                  {baseline.symbol}{preview.customerTotal.toLocaleString('en-US')}
                </p>
                <p className="text-xs text-white/70 mb-5">
                  {baseline.symbol}{preview.hourlyEffective.toFixed(0)}/hr effective · {preview.billedHours}h billed
                </p>

                <div className="space-y-2 mb-5">
                  <Bar label="You receive"      value={preview.providerPayout} symbol={baseline.symbol} fill="emerald" total={preview.customerTotal} />
                  <Bar label="Marketplace fee"  value={preview.platformMargin} symbol={baseline.symbol} fill="amber"   total={preview.customerTotal} />
                </div>

                <div className="bg-white/5 rounded-lg p-3 text-[11px] text-white/70 leading-relaxed">
                  Crew of {row.available_crew_sizes[0] ?? 2} ·{' '}
                  {row.truck_available ? 'Movers + truck' : 'Labor-only'} ·
                  {' '}4 hours · basic insurance.<br/>
                  Your overrides apply to <strong className="text-white">every</strong> booking
                  customers in the matching market see.
                </div>
              </>
            )}
          </aside>
        </div>
      </Section>

      {/* EARNINGS SIMULATOR — anchored on the provider's current capacity */}
      <Section tone="canvas" size="default">
        <Eyebrow tone="brand" className="mb-1">Earnings projection</Eyebrow>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink-900 mb-2">
          What you could earn at this configuration.
        </h2>
        <p className="text-slate-600 max-w-2xl mb-6">
          Anchored on the capacity + service mix you've set above. Tweak the
          inputs to model different weekly hours, weekend mixes, or
          relocation corridors.
        </p>
        <EarningsSimulator
          initial={{
            crewSize:           row.available_crew_sizes[0] ?? 2,
            truckAvailable:     row.truck_available,
            packingAvailable:   row.packing_available,
            storageAvailable:   row.storage_available,
            hoursPerWeek:       30,
            weekendShare:       0.3,
            corridor:           'local',
          }}
        />
      </Section>
    </main>
  );
}

/* ── Local UI helpers ─────────────────────────────────────────── */

function Field({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-4 pb-4 border-b border-slate-100'}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2">{label}</p>
      {children}
    </div>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition ${
        active ? 'bg-ink-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
      }`}
    >
      {children}
    </button>
  );
}

function Toggle({ active, onClick, icon: Icon, children }: {
  active: boolean; onClick: () => void; icon: LucideIcon; children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${
        active
          ? 'bg-amber-50 text-amber-700 border-amber-300'
          : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'
      }`}
    >
      <Icon size={11} />
      {children}
    </button>
  );
}

function Bar({ label, value, symbol, fill, total }: {
  label: string; value: number; symbol: string; fill: 'emerald' | 'amber'; total: number;
}) {
  const pct = total > 0 ? (value / total) * 100 : 0;
  const fillClass = fill === 'emerald' ? 'bg-emerald-500' : 'bg-amber-400';
  return (
    <div>
      <div className="flex items-baseline justify-between text-xs mb-1">
        <span className="text-white/80">{label}</span>
        <span className="font-bold text-white">
          {symbol}{value.toLocaleString('en-US')}
          <span className="text-white/50 font-normal ml-1">({pct.toFixed(0)}%)</span>
        </span>
      </div>
      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${fillClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
