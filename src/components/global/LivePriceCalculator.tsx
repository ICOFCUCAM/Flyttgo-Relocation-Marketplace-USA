import React, { useMemo, useState } from 'react';
import {
  Calculator, Users, Truck, Package, Clock, Sun, Snowflake, Building2,
  AlertTriangle, ArrowDownRight, Wrench, TrendingUp, ShieldCheck,
  type LucideIcon,
} from 'lucide-react';
import {
  calculateQuote, COUNTRY_BASELINES, CITY_MULTIPLIERS,
  type QuoteInput, type ServiceType, type InsuranceTier,
} from '../../lib/pricing-engine';
import type { BookingCountry } from '../../lib/store';
import { track } from '../../lib/analytics';

/* ─────────────────────────────────────────────────────────────────
 * <LivePriceCalculator> — interactive demo of the 9-layer engine.
 *
 * Mounted on /pricing. Lets visitors play with the engine inputs
 * (country, city, crew size, service type, hours, complexity flags,
 * timing flags, distance, insurance tier) and watch the breakdown
 * recompute layer-by-layer in real time.
 *
 * Reads engine state from useState; engine.calculate() is pure +
 * synchronous + cheap (no IO), so we can recompute on every render.
 * ───────────────────────────────────────────────────────────────── */

type State = Required<Pick<QuoteInput,
  'country' | 'crewSize' | 'serviceType' | 'estimatedHours' | 'insurance'
>> & {
  city:        string;
  distanceKm:  number;
  stairs:      boolean;
  longCarry:   boolean;
  fragile:     boolean;
  weekend:     boolean;
  evening:     boolean;
  peakSeason:  boolean;
};

const COUNTRIES: { code: BookingCountry; flag: string; label: string }[] = [
  { code: 'us', flag: '🇺🇸', label: 'United States' },
  { code: 'ca', flag: '🇨🇦', label: 'Canada' },
  { code: 'gb', flag: '🇬🇧', label: 'United Kingdom' },
  { code: 'de', flag: '🇩🇪', label: 'Germany' },
  { code: 'fr', flag: '🇫🇷', label: 'France' },
  { code: 'no', flag: '🇳🇴', label: 'Norway' },
];

const SERVICE_TYPES: { value: ServiceType; label: string; icon: LucideIcon }[] = [
  { value: 'labor-only',   label: 'Labor-only',   icon: Users    },
  { value: 'movers-truck', label: 'Movers + truck', icon: Truck    },
  { value: 'packing',      label: 'Packing',      icon: Package  },
  { value: 'storage',      label: 'Storage',      icon: Building2 },
  { value: 'corporate',    label: 'Corporate',    icon: Building2 },
];

const INSURANCE_TIERS: InsuranceTier[] = ['basic', 'full', 'premium'];

const LAYER_TONE: Record<string, string> = {
  country:    'text-slate-700',
  city:       'text-blue-700',
  crew:       'text-violet-700',
  service:    'text-amber-700',
  complexity: 'text-rose-700',
  timing:     'text-orange-700',
  distance:   'text-emerald-700',
  insurance:  'text-sky-700',
  commission: 'text-slate-500',
};

export default function LivePriceCalculator() {
  const [state, setState] = useState<State>({
    country:        'us',
    city:           'New York',
    crewSize:       3,
    serviceType:    'movers-truck',
    estimatedHours: 4,
    insurance:      'full',
    distanceKm:     0,
    stairs:         true,
    longCarry:      false,
    fragile:        false,
    weekend:        true,
    evening:        false,
    peakSeason:     false,
  });

  const breakdown = useMemo(
    () => calculateQuote({
      country:        state.country,
      city:           state.city,
      crewSize:       state.crewSize,
      serviceType:    state.serviceType,
      estimatedHours: state.estimatedHours,
      insurance:      state.insurance,
      distanceKm:     state.distanceKm,
      complexity: {
        stairsFlights: state.stairs    ? 2 : 0,
        longCarry:     state.longCarry,
        fragile:       state.fragile,
      },
      timing: {
        weekend:    state.weekend,
        evening:    state.evening,
        peakSeason: state.peakSeason,
      },
    }),
    [state],
  );

  const baseline = COUNTRY_BASELINES[state.country];
  const cityList = Object.keys(CITY_MULTIPLIERS[state.country] ?? {})
    .map(s => s.charAt(0).toUpperCase() + s.slice(1))
    .sort();

  function patch<K extends keyof State>(key: K, value: State[K]) {
    setState(s => ({ ...s, [key]: value }));
    track('live_calculator_changed', { field: String(key) });
  }

  return (
    <div className="grid lg:grid-cols-12 gap-6">
      {/* INPUTS */}
      <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-5">
          <Calculator size={18} className="text-brand-600" />
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-700">
            Live calculator · 9-layer pricing engine
          </p>
        </div>

        {/* Country */}
        <Field label="Country">
          <div className="flex flex-wrap gap-1.5">
            {COUNTRIES.map(c => (
              <Chip
                key={c.code}
                active={state.country === c.code}
                onClick={() => {
                  patch('country', c.code);
                  /* Reset city when country changes — old key won't
                   * match the new country's table. */
                  patch('city', '');
                }}
              >
                <span aria-hidden>{c.flag}</span>{c.label}
              </Chip>
            ))}
          </div>
        </Field>

        {/* City */}
        <Field label={`City (optional · ${cityList.length} listed for ${state.country.toUpperCase()})`}>
          <input
            type="text"
            list={`city-options-${state.country}`}
            value={state.city}
            onChange={e => patch('city', e.target.value)}
            placeholder="e.g. New York, Berlin, Toronto…"
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
          />
          <datalist id={`city-options-${state.country}`}>
            {cityList.map(c => <option key={c} value={c} />)}
          </datalist>
        </Field>

        {/* Crew */}
        <Field label="Crew size">
          <div className="flex gap-1.5">
            {[2, 3, 4, 5].map(n => (
              <Chip
                key={n}
                active={state.crewSize === n}
                onClick={() => patch('crewSize', n as 2 | 3 | 4 | 5)}
              >
                {n} movers
              </Chip>
            ))}
          </div>
        </Field>

        {/* Service type */}
        <Field label="Service type">
          <div className="flex flex-wrap gap-1.5">
            {SERVICE_TYPES.map(s => (
              <Chip
                key={s.value}
                active={state.serviceType === s.value}
                onClick={() => patch('serviceType', s.value)}
              >
                <s.icon size={11} />
                {s.label}
              </Chip>
            ))}
          </div>
        </Field>

        {/* Hours */}
        <Field label={`Estimated hours · ${state.estimatedHours}h`}>
          <input
            type="range"
            min={2}
            max={10}
            step={0.5}
            value={state.estimatedHours}
            onChange={e => patch('estimatedHours', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </Field>

        {/* Distance */}
        <Field label={`Out-of-city distance · ${state.distanceKm} km`}>
          <input
            type="range"
            min={0}
            max={200}
            step={5}
            value={state.distanceKm}
            onChange={e => patch('distanceKm', Number(e.target.value))}
            className="w-full accent-amber-500"
          />
        </Field>

        {/* Complexity */}
        <Field label="Complexity">
          <div className="flex flex-wrap gap-1.5">
            <Toggle active={state.stairs}    onClick={() => patch('stairs', !state.stairs)}    icon={TrendingUp}>
              TrendingUp (2 flights)
            </Toggle>
            <Toggle active={state.longCarry} onClick={() => patch('longCarry', !state.longCarry)} icon={ArrowDownRight}>
              Long carry
            </Toggle>
            <Toggle active={state.fragile}   onClick={() => patch('fragile', !state.fragile)}   icon={AlertTriangle}>
              Fragile items
            </Toggle>
          </div>
        </Field>

        {/* Timing */}
        <Field label="Timing">
          <div className="flex flex-wrap gap-1.5">
            <Toggle active={state.weekend}    onClick={() => patch('weekend', !state.weekend)}       icon={Sun}>
              Weekend
            </Toggle>
            <Toggle active={state.evening}    onClick={() => patch('evening', !state.evening)}       icon={Clock}>
              Evening
            </Toggle>
            <Toggle active={state.peakSeason} onClick={() => patch('peakSeason', !state.peakSeason)} icon={Snowflake}>
              Peak season
            </Toggle>
          </div>
        </Field>

        {/* Insurance */}
        <Field label="Insurance" last>
          <div className="flex flex-wrap gap-1.5">
            {INSURANCE_TIERS.map(t => (
              <Chip
                key={t}
                active={state.insurance === t}
                onClick={() => patch('insurance', t)}
              >
                <ShieldCheck size={11} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Chip>
            ))}
          </div>
        </Field>
      </div>

      {/* OUTPUT */}
      <div className="lg:col-span-5 bg-ink-900 text-white rounded-2xl p-6">
        <div className="flex items-baseline justify-between mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">
            Customer pays
          </p>
          <p className="text-[10px] text-white/60 font-mono">
            {breakdown.currency}
          </p>
        </div>
        <p className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-1">
          {baseline.symbol}{breakdown.customerTotal.toLocaleString('en-US')}
        </p>
        <p className="text-xs text-white/70 mb-5">
          {baseline.symbol}{breakdown.hourlyEffective.toFixed(0)}/hr effective ·
          {' '}{breakdown.billedHours}h billed
        </p>

        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-5 space-y-2">
          <Bar label="Provider receives"  value={breakdown.providerPayout} symbol={baseline.symbol} fill="emerald" total={breakdown.customerTotal} />
          <Bar label="Marketplace fee"    value={breakdown.platformMargin} symbol={baseline.symbol} fill="amber"   total={breakdown.customerTotal} />
        </div>

        <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300 mb-2">
          Layer-by-layer breakdown
        </p>
        <ol className="space-y-1.5">
          {breakdown.steps.map((step, i) => (
            <li
              key={i}
              className="flex items-baseline justify-between gap-2 text-xs bg-white/5 rounded-lg px-3 py-2"
            >
              <div className="min-w-0">
                <p className={`font-bold ${LAYER_TONE[step.layer] ?? 'text-white'}`}>
                  {step.label}
                </p>
                {step.detail && (
                  <p className="text-[10px] text-white/60 truncate">
                    {step.detail}
                  </p>
                )}
              </div>
              <p className="font-mono font-bold text-white flex-shrink-0">
                {step.layer === 'commission' ? '−' : '+'}
                {baseline.symbol}{Math.round(Math.abs(step.contribution)).toLocaleString('en-US')}
              </p>
            </li>
          ))}
        </ol>

        <p className="mt-4 text-[10px] text-white/50 leading-relaxed">
          Pure function · no network · runs the same on the booking
          widget, the provider dashboard, and the calculate-price
          edge function. Tweak any input above and watch the ledger
          update in real time.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children, last = false }: { label: string; children: React.ReactNode; last?: boolean }) {
  return (
    <div className={last ? '' : 'mb-4 pb-4 border-b border-slate-100'}>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{label}</p>
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
        active
          ? 'bg-ink-900 text-white'
          : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition border ${
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
