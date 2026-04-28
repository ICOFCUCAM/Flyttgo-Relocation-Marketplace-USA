import React, { useEffect, useMemo, useState } from 'react';
import {
  TrendingUp, Users, Truck, Package, Boxes, MapPin,
  CalendarDays, ArrowRight, Sparkles, type LucideIcon,
} from 'lucide-react';
import {
  simulateEarnings, CORRIDOR_MULTIPLIERS,
  type EarningsInput, type RelocationCorridor,
} from '../../lib/earnings-simulator';
import { CITY_MULTIPLIERS } from '../../lib/pricing-engine';
import type { BookingCountry } from '../../lib/store';
import { useApp } from '../../lib/store';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <EarningsSimulator> — provider acquisition tool.
 *
 * Answers "how much can I earn on FlyttGo?" before the prospect
 * commits to applying. Mirrors the conversion lever Uber + DoorDash
 * use on their driver landing pages.
 *
 * Mounts on:
 *   - /providers (For Providers acquisition page) — public hero
 *   - /driver/pricing (signed-in dashboard) — strategy lever
 *
 * Reuses the 9-layer pricing engine's data so projections stay in
 * sync with what customers actually pay. Pure + synchronous —
 * recomputes on every keystroke.
 *
 * `compact` variant tightens padding for embedding inside the
 * provider dashboard (where vertical space is at a premium).
 * ───────────────────────────────────────────────────────────────── */

const COUNTRIES: { code: BookingCountry; flag: string; label: string }[] = [
  { code: 'us', flag: '🇺🇸', label: 'United States' },
  { code: 'ca', flag: '🇨🇦', label: 'Canada' },
  { code: 'gb', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'de', flag: '🇩🇪', label: 'Germany' },
  { code: 'fr', flag: '🇫🇷', label: 'France' },
  { code: 'no', flag: '🇳🇴', label: 'Norway' },
];

const CORRIDORS: { value: RelocationCorridor; label: string; detail: string }[] = [
  { value: 'local',         label: 'Local',         detail: 'intra-city only' },
  { value: 'regional',      label: 'Regional',      detail: 'up to ~200 km' },
  { value: 'interstate',    label: 'Interstate',    detail: 'multi-day cross-state' },
  { value: 'international', label: 'International', detail: 'cross-border + customs' },
];

interface Props {
  /** Compact = tighter padding for in-dashboard embedding. */
  compact?: boolean;
  /** Optional default state (used when embedded in the provider
   *  dashboard so the simulator starts on the provider's actual
   *  capacity). */
  initial?: Partial<EarningsInput>;
}

export default function EarningsSimulator({ compact = false, initial }: Props) {
  const { setPage } = useApp();

  const [country,         setCountry]         = useState<BookingCountry>(initial?.country ?? 'us');
  const [city,            setCity]            = useState(initial?.city ?? 'Dallas');
  const [crewSize,        setCrewSize]        = useState<2 | 3 | 4 | 5>(initial?.crewSize ?? 2);
  const [truck,           setTruck]           = useState(initial?.truckAvailable   ?? true);
  const [packing,         setPacking]         = useState(initial?.packingAvailable ?? true);
  const [storage,         setStorage]         = useState(initial?.storageAvailable ?? false);
  const [hoursPerWeek,    setHoursPerWeek]    = useState(initial?.hoursPerWeek     ?? 30);
  const [weekendShare,    setWeekendShare]    = useState((initial?.weekendShare    ?? 0.3) * 100);
  const [corridor,        setCorridor]        = useState<RelocationCorridor>(initial?.corridor ?? 'local');

  /* Track first interaction once per mount so we know how often the
   * simulator drives onboarding intent. */
  const [interacted, setInteracted] = useState(false);
  useEffect(() => {
    if (interacted) track('earnings_simulator_interacted', { country });
  }, [interacted, country]);

  const breakdown = useMemo(
    () => simulateEarnings({
      country,
      city:           city || undefined,
      crewSize,
      truckAvailable:    truck,
      packingAvailable:  packing,
      storageAvailable:  storage,
      hoursPerWeek,
      weekendShare:      weekendShare / 100,
      corridor,
    }),
    [country, city, crewSize, truck, packing, storage, hoursPerWeek, weekendShare, corridor],
  );

  const cityList = Object.keys(CITY_MULTIPLIERS[country] ?? {})
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .sort();

  function patch(fn: () => void) {
    fn();
    if (!interacted) setInteracted(true);
  }

  const padX = compact ? 'p-5' : 'p-6 sm:p-8';

  return (
    <div className="grid lg:grid-cols-12 gap-5">
      {/* INPUTS */}
      <div className={`lg:col-span-7 bg-white rounded-2xl border border-slate-200 ${padX}`}>
        <div className="flex items-center gap-2 mb-5">
          <Sparkles size={16} className="text-amber-500" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">
            Provider earnings simulator
          </p>
        </div>

        <Field label="Country" icon={MapPin}>
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map(c => (
              <Chip
                key={c.code}
                active={country === c.code}
                onClick={() => patch(() => { setCountry(c.code); setCity(''); })}
              >
                <span aria-hidden>{c.flag}</span>{c.label}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label={`City · ${cityList.length} listed`} icon={MapPin}>
          <input
            type="text"
            list={`sim-city-${country}`}
            value={city}
            onChange={e => patch(() => setCity(e.target.value))}
            placeholder="Type a city to apply the metro multiplier…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
          <datalist id={`sim-city-${country}`}>
            {cityList.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>

        <Field label="Crew setup" icon={Users}>
          <div className="flex gap-1.5 flex-wrap">
            {([2, 3, 4, 5] as const).map(n => (
              <Chip
                key={n}
                active={crewSize === n}
                onClick={() => patch(() => setCrewSize(n))}
              >
                {n} movers
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Services offered">
          <div className="flex flex-wrap gap-1.5">
            <Toggle active={truck}   onClick={() => patch(() => setTruck(!truck))}     icon={Truck}>
              Truck included
            </Toggle>
            <Toggle active={packing} onClick={() => patch(() => setPacking(!packing))} icon={Package}>
              Packing
            </Toggle>
            <Toggle active={storage} onClick={() => patch(() => setStorage(!storage))} icon={Boxes}>
              Storage staging
            </Toggle>
          </div>
        </Field>

        <Field label="Relocation corridor">
          <div className="grid sm:grid-cols-2 gap-1.5">
            {CORRIDORS.map(c => (
              <button
                key={c.value}
                type="button"
                onClick={() => patch(() => setCorridor(c.value))}
                aria-pressed={corridor === c.value}
                className={`text-left px-3 py-2 rounded-lg text-xs transition border ${
                  corridor === c.value
                    ? 'bg-ink-900 text-white border-ink-900'
                    : 'bg-white text-slate-700 border-slate-200 hover:border-ink-900'
                }`}
              >
                <p className="font-bold">
                  {c.label}
                  <span className="opacity-60 font-normal ml-1.5">
                    ×{CORRIDOR_MULTIPLIERS[c.value].toFixed(2)}
                  </span>
                </p>
                <p className="text-[10px] opacity-70">{c.detail}</p>
              </button>
            ))}
          </div>
        </Field>

        <Field label={`Hours per week · ${hoursPerWeek}h`} icon={CalendarDays}>
          <input
            type="range"
            min={5}
            max={70}
            step={1}
            value={hoursPerWeek}
            onChange={e => patch(() => setHoursPerWeek(Number(e.target.value)))}
            className="w-full accent-amber-500"
          />
        </Field>

        <Field label={`Weekend mix · ${weekendShare.toFixed(0)}%`} last>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={weekendShare}
            onChange={e => patch(() => setWeekendShare(Number(e.target.value)))}
            className="w-full accent-amber-500"
          />
          <p className="text-[11px] text-slate-500 mt-1">
            Share of jobs taken on weekends. Each weekend hour earns +12% on top of the weekday rate.
          </p>
        </Field>
      </div>

      {/* OUTPUT */}
      <aside className={`lg:col-span-5 bg-gradient-to-br from-emerald-700 to-emerald-900 text-white rounded-2xl ${padX} relative overflow-hidden self-start sticky top-6`}>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} className="text-emerald-200" />
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              Estimated earnings · post-commission
            </p>
          </div>

          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-200/80 mb-1">Hourly</p>
          <p className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-4">
            {breakdown.symbol}{breakdown.providerHourly.toFixed(0)}
            <span className="text-emerald-200/70 text-base font-normal ml-1">/hr</span>
          </p>

          <div className="space-y-3 mb-5">
            <Stat label="Weekly"  value={breakdown.weeklyIncome}  symbol={breakdown.symbol} />
            <Stat label="Monthly" value={breakdown.monthlyIncome} symbol={breakdown.symbol} highlight />
            <Stat label="Annual"  value={breakdown.annualIncome}  symbol={breakdown.symbol} />
          </div>

          <details className="bg-black/15 rounded-lg overflow-hidden">
            <summary className="cursor-pointer px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-emerald-100 flex items-center justify-between">
              How is this computed?
              <ArrowRight size={11} className="opacity-60" />
            </summary>
            <ul className="px-3 pb-3 space-y-1">
              {breakdown.contributions.map((c, i) => (
                <li key={i} className="flex items-baseline justify-between text-[11px]">
                  <div className="min-w-0">
                    <p className="font-bold">{c.label}</p>
                    {c.detail && <p className="text-emerald-200/70 text-[10px] truncate">{c.detail}</p>}
                  </div>
                  <span className="font-mono text-white flex-shrink-0">
                    {c.amount < 0 ? '−' : '+'}
                    {breakdown.symbol}{Math.abs(c.amount).toFixed(0)}
                  </span>
                </li>
              ))}
              <li className="flex items-baseline justify-between text-[11px] pt-2 mt-2 border-t border-white/15">
                <span className="font-bold uppercase tracking-wider">You receive / hr</span>
                <span className="font-mono font-extrabold">
                  {breakdown.symbol}{breakdown.providerHourly.toFixed(0)}
                </span>
              </li>
            </ul>
          </details>

          <button
            onClick={() => {
              track('earnings_simulator_apply_clicked', {
                country, hoursPerWeek, monthly: breakdown.monthlyIncome,
              });
              setPage('driver-onboarding');
            }}
            className="mt-5 w-full inline-flex items-center justify-center gap-2 px-5 py-3 bg-amber-400 hover:bg-amber-300 text-ink-900 font-bold rounded-xl transition shadow-medium"
          >
            Apply as a provider
            <ArrowRight size={14} />
          </button>

          <p className="mt-3 text-[10px] text-emerald-100/70 text-center leading-relaxed">
            Estimate · actual earnings vary with your accepted-job mix, commission tier, and local demand.
          </p>
        </div>

        {/* Decorative accent */}
        <div className="absolute -right-12 -bottom-12 w-48 h-48 rounded-full bg-emerald-400/10 blur-2xl" aria-hidden />
      </aside>
    </div>
  );
}

function Field({ label, icon: Icon, children, last = false }: {
  label: string; icon?: LucideIcon; children: React.ReactNode; last?: boolean;
}) {
  return (
    <div className={last ? '' : 'mb-4 pb-4 border-b border-slate-100'}>
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 inline-flex items-center gap-1.5">
        {Icon && <Icon size={11} className="text-slate-400" />}
        {label}
      </p>
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

function Stat({ label, value, symbol, highlight = false }: {
  label: string; value: number; symbol: string; highlight?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-3 ${highlight ? 'pt-3 border-t border-white/15' : ''}`}>
      <span className="text-xs text-emerald-100/80 uppercase tracking-wider font-bold">{label}</span>
      <span className={`font-extrabold tracking-tight ${highlight ? 'text-3xl' : 'text-xl'} text-white`}>
        {symbol}{Math.round(value).toLocaleString('en-US')}
      </span>
    </div>
  );
}
