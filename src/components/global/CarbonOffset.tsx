import { useState } from 'react';
import { Leaf, Truck, Sparkles } from 'lucide-react';

/**
 * Carbon footprint calculator + offset marketing.
 *
 * Lets a customer punch in a rough mile count and see the indicative
 * CO2 emissions for the move plus the cost to offset via FlyttGo's
 * planned offset partner. The numbers below are reasonable industry
 * defaults — refine when the offset partner is contracted.
 */

interface VanProfile {
  label: string;
  /** kgCO2 per mile, indicative.   ~0.5 small van, ~0.7 medium, ~1.0 luton. */
  kgPerMile: number;
}

const VAN_PROFILES: VanProfile[] = [
  { label: 'Small van',   kgPerMile: 0.50 },
  { label: 'Medium van',  kgPerMile: 0.70 },
  { label: 'Large van',   kgPerMile: 0.85 },
  { label: 'Luton truck', kgPerMile: 1.05 },
];

/* Indicative offset cost per kgCO2 — current voluntary market price
 * for forestry-based credits. ~$0.025/kg ≈ £0.02/kg. */
const OFFSET_COST_PER_KG_GBP = 0.02;

export default function CarbonOffset() {
  const [miles,   setMiles]   = useState(40);
  const [profile, setProfile] = useState(VAN_PROFILES[1]); // medium van default

  const kgCO2     = Math.round(miles * profile.kgPerMile * 10) / 10;
  const offsetGbp = (kgCO2 * OFFSET_COST_PER_KG_GBP).toFixed(2);
  const trees     = Math.max(1, Math.round(kgCO2 / 21)); // 1 tree absorbs ~21 kg/year

  return (
    <section className="bg-gradient-to-br from-emerald-50 via-white to-emerald-50 py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-12 gap-10 items-center">
          {/* LEFT — pitch */}
          <div className="lg:col-span-6">
            <div className="inline-flex items-center gap-2 bg-emerald-100 text-emerald-700 text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full mb-5">
              <Leaf size={12} />
              Carbon-aware moves
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.05] mb-5">
              Offset your move’s carbon for less than the cost of a coffee.
            </h2>
            <p className="text-base lg:text-lg text-slate-600 leading-relaxed mb-6">
              Every booking estimates the move’s CO₂ footprint and lets you
              offset it at checkout. We route the offset payment to verified
              forestry projects and report the credits back to you.
            </p>
            <ul className="space-y-2 text-sm text-slate-700">
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                Verified forestry credits (Gold Standard / Verra)
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                Per-booking certificate retained on your account
              </li>
              <li className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center text-xs flex-shrink-0">✓</span>
                Optional EV-fleet preference for an even lower footprint
              </li>
            </ul>
          </div>

          {/* RIGHT — interactive calculator */}
          <div className="lg:col-span-6">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-200 p-6 sm:p-8">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="font-bold text-slate-900">Estimate my move’s footprint</p>
                  <p className="text-xs text-slate-500">Live calculation — no signup needed</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="flex items-center justify-between text-sm font-semibold text-slate-700 mb-2">
                    Distance
                    <span className="font-mono text-slate-900">{miles} mi</span>
                  </label>
                  <input
                    type="range"
                    min={5}
                    max={500}
                    step={5}
                    value={miles}
                    onChange={e => setMiles(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-slate-400 mt-1">
                    <span>5 mi</span>
                    <span>250 mi</span>
                    <span>500 mi</span>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-semibold text-slate-700 mb-2">Vehicle</p>
                  <div className="grid grid-cols-2 gap-2">
                    {VAN_PROFILES.map(v => (
                      <button
                        key={v.label}
                        type="button"
                        onClick={() => setProfile(v)}
                        className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-medium transition ${
                          profile.label === v.label
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                            : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                        }`}
                      >
                        <Truck size={14} />
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-px bg-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-white px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">CO₂</p>
                    <p className="font-extrabold text-slate-900 text-lg">{kgCO2} kg</p>
                  </div>
                  <div className="bg-white px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">Offset cost</p>
                    <p className="font-extrabold text-emerald-700 text-lg">£{offsetGbp}</p>
                  </div>
                  <div className="bg-white px-3 py-3 text-center">
                    <p className="text-[10px] uppercase tracking-wider text-slate-500">≈ Trees / year</p>
                    <p className="font-extrabold text-slate-900 text-lg">{trees}</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition shadow-lg shadow-emerald-600/25"
                >
                  Add carbon offset to my next move
                </button>
                <p className="text-[10px] text-slate-400 text-center">
                  Indicative figures. Final cost shown at checkout based on actual route distance.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
