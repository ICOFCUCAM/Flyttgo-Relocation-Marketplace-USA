import React, { useEffect, useMemo, useState } from 'react';
import { listDeploymentRegions, type DeploymentRegionRow, type DeploymentStatus } from '../../lib/live-ops-store';

/* ─────────────────────────────────────────────────────────────────
 * <WorldDeploymentMap>
 *
 * The Global Coverage Expansion Map. SVG-only (no external libs,
 * no stock imagery), data-driven from the deployment_regions table
 * so the platform's actual deployment posture drives the public
 * messaging.
 *
 * Three tiers + a headquarters node:
 *   ★ HQ            — Oslo, pulse animation, always-on label
 *   ● Operational   — solid emerald node
 *   ◎ Expansion     — semi-highlighted ring node
 *   ◇ Pilot         — outlined diamond node
 *
 * Animated arcs connect the HQ to every Operational region so
 * visitors read the platform as orchestrated infrastructure rather
 * than a list of markers.
 *
 * Legend, hover tooltip, and post-map status strip included.
 * ───────────────────────────────────────────────────────────────── */

const VIEW_W = 1000;
const VIEW_H = 500;

/* Equirectangular projection. Cropped to roughly skip Antarctica
 * + far-northern Greenland so the global landmass fills the
 * viewBox vertically. */
const LAT_TOP    =  78;     // top edge of map
const LAT_BOTTOM = -45;
const LNG_LEFT   = -160;
const LNG_RIGHT  =  170;

function project(lat: number, lng: number): { x: number; y: number } {
  const x = ((lng - LNG_LEFT) / (LNG_RIGHT - LNG_LEFT)) * VIEW_W;
  const y = ((LAT_TOP - lat) / (LAT_TOP - LAT_BOTTOM)) * VIEW_H;
  return { x, y };
}

/* Hand-tuned continent silhouettes drawn directly in projection
 * space. Dotted infrastructure styling — not cartographic. */
const CONTINENTS = [
  // North America
  'M70,135 L240,90 L355,160 L325,280 L210,310 L150,250 L100,180 Z',
  // Greenland
  'M340,55 L405,50 L420,115 L355,125 Z',
  // South America
  'M260,310 L330,300 L355,420 L290,470 L255,440 L235,360 Z',
  // Europe
  'M460,90 L555,95 L575,180 L505,200 L455,170 L450,130 Z',
  // Africa
  'M470,225 L575,215 L600,335 L545,425 L505,410 L470,330 Z',
  // Middle East / West Asia
  'M560,180 L680,180 L695,255 L600,260 L555,210 Z',
  // Asia
  'M580,90 L850,95 L880,235 L780,295 L685,275 L600,225 L575,150 Z',
  // South-East Asia islands (cluster glyph)
  'M790,275 L870,275 L885,330 L820,335 Z',
  // Australia
  'M800,360 L905,355 L925,425 L830,430 L795,400 Z',
];

const TONE: Record<DeploymentStatus, {
  fill:   string;
  ring:   string;
  border: string;
  legend: string;
}> = {
  operational: {
    fill:   '#10B981',
    ring:   'rgba(16,185,129,0.18)',
    border: '#047857',
    legend: 'bg-emerald-500',
  },
  expanding: {
    fill:   'rgba(59,130,246,0.45)',
    ring:   'rgba(59,130,246,0.18)',
    border: '#2563EB',
    legend: 'bg-blue-500/60 ring-2 ring-blue-500',
  },
  pilot: {
    fill:   'transparent',
    ring:   'rgba(245,158,11,0.10)',
    border: '#D97706',
    legend: 'bg-transparent ring-2 ring-amber-500',
  },
  partner: {
    fill:   'rgba(139,92,246,0.45)',
    ring:   'rgba(139,92,246,0.18)',
    border: '#7C3AED',
    legend: 'bg-violet-500/60',
  },
  planned: {
    fill:   '#94A3B8',
    ring:   'rgba(148,163,184,0.18)',
    border: '#64748B',
    legend: 'bg-slate-400',
  },
};

const STATUS_LABEL: Record<DeploymentStatus, string> = {
  operational: 'Operational',
  expanding:   'Expansion',
  pilot:       'Pilot deployment',
  partner:     'Partner-supported',
  planned:     'Planned',
};

export default function WorldDeploymentMap() {
  const [regions, setRegions] = useState<DeploymentRegionRow[]>([]);
  const [hovered, setHovered] = useState<DeploymentRegionRow | null>(null);
  const [ready,   setReady]   = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDeploymentRegions()
      .then(rows => { if (!cancelled) { setRegions(rows.filter(r => r.lat != null && r.lng != null)); setReady(true); } })
      .catch(()   => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  /* HQ row drives every arc origin + the status strip headline. */
  const hq = useMemo(() => regions.find(r => r.is_headquarters) ?? null, [regions]);
  const operational = useMemo(() => regions.filter(r => r.status === 'operational' && !r.is_headquarters), [regions]);
  const expanding   = useMemo(() => regions.filter(r => r.status === 'expanding'),   [regions]);
  const pilot       = useMemo(() => regions.filter(r => r.status === 'pilot'),       [regions]);

  if (!ready) {
    return <div className="w-full aspect-[2/1] bg-slate-50 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="relative w-full">
      {/* ── Map ─────────────────────────────────────────────── */}
      <div className="relative w-full bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 overflow-hidden">
        <svg
          viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
          role="img"
          aria-label="FlyttGo Global Coverage Expansion Map"
          className="w-full h-auto"
        >
          {/* Grid */}
          <g stroke="rgba(148,163,184,0.12)" strokeWidth="1">
            {[0, 100, 200, 300, 400, 500].map(y => (
              <line key={`h-${y}`} x1="0" y1={y} x2={VIEW_W} y2={y} />
            ))}
            {Array.from({ length: 11 }, (_, i) => i * 100).map(x => (
              <line key={`v-${x}`} x1={x} y1="0" x2={x} y2={VIEW_H} />
            ))}
          </g>

          {/* Continents — dotted infrastructure silhouettes */}
          <g
            fill="rgba(148,163,184,0.08)"
            stroke="rgba(148,163,184,0.55)"
            strokeWidth="1.2"
            strokeDasharray="2 3"
          >
            {CONTINENTS.map((d, i) => <path key={i} d={d} />)}
          </g>

          {/* Connection arcs — HQ → every operational region.
              Quadratic Bézier curve with the control point lifted
              above the midpoint so the arc reads as orchestration.
              Dashed stroke + slow dash-offset animation gives the
              flowing-link effect without a JS render loop. */}
          {hq && operational.map(node => {
            const a = project(hq.lat!, hq.lng!);
            const b = project(node.lat!, node.lng!);
            const midX = (a.x + b.x) / 2;
            const midY = (a.y + b.y) / 2 - Math.abs(b.x - a.x) * 0.18 - 20;
            return (
              <g key={`arc-${node.country_code}`} fill="none">
                <path
                  d={`M${a.x},${a.y} Q${midX},${midY} ${b.x},${b.y}`}
                  stroke="rgba(16,185,129,0.30)"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                >
                  <animate
                    attributeName="stroke-dashoffset"
                    from="0" to="-24"
                    dur="2.4s"
                    repeatCount="indefinite"
                  />
                </path>
              </g>
            );
          })}

          {/* Pilot region nodes — outlined diamonds */}
          {pilot.map(r => {
            const { x, y } = project(r.lat!, r.lng!);
            return (
              <Node
                key={r.country_code} row={r} x={x} y={y}
                onHover={setHovered}
                shape="diamond"
              />
            );
          })}

          {/* Expansion nodes — semi-filled rings */}
          {expanding.map(r => {
            const { x, y } = project(r.lat!, r.lng!);
            return (
              <Node
                key={r.country_code} row={r} x={x} y={y}
                onHover={setHovered}
                shape="ring"
              />
            );
          })}

          {/* Operational nodes — solid */}
          {operational.map(r => {
            const { x, y } = project(r.lat!, r.lng!);
            return (
              <Node
                key={r.country_code} row={r} x={x} y={y}
                onHover={setHovered}
                shape="solid"
              />
            );
          })}

          {/* HQ node — star with pulse, label always visible */}
          {hq && (() => {
            const { x, y } = project(hq.lat!, hq.lng!);
            return (
              <g
                onMouseEnter={() => setHovered(hq)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                <circle cx={x} cy={y} r="22" fill="rgba(245,158,11,0.18)">
                  <animate attributeName="r" values="18;28;18" dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0.4;0;0.4" dur="2.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={x} cy={y} r="10" fill="#F59E0B" />
                <Star cx={x} cy={y} r={6} fill="#FFF" />
                <text
                  x={x + 14} y={y - 8}
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontSize="11" fontWeight="700"
                  fill="#92400E"
                >
                  ★ Oslo HQ
                </text>
                <text
                  x={x + 14} y={y + 4}
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontSize="9"
                  fill="#92400E"
                  opacity="0.75"
                >
                  Global coordination
                </text>
              </g>
            );
          })()}
        </svg>

        {/* Legend ── absolute, top-right */}
        <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200 rounded-xl px-3 py-2.5 shadow-sm">
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500 font-bold mb-1.5">Legend</p>
          <ul className="space-y-1 text-[11px] font-medium text-slate-700">
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-amber-500 rounded-full" />
              Headquarters
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full" />
              Operational
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 bg-blue-500/40 rounded-full ring-2 ring-blue-500" />
              Expansion
            </li>
            <li className="flex items-center gap-2">
              <span className="inline-block w-3 h-3 rotate-45 ring-2 ring-amber-500" />
              Pilot deployment
            </li>
          </ul>
        </div>

        {/* Hover tooltip — top-left */}
        {hovered && (
          <div className="absolute top-3 left-3 bg-slate-900 text-white rounded-xl px-4 py-3 shadow-lg max-w-xs">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-base leading-none">{hovered.flag}</span>
              <span className="font-bold text-sm">{hovered.display_name}</span>
            </div>
            <p className="text-[10px] uppercase tracking-[0.14em] text-emerald-300 font-bold mb-1">
              {hovered.is_headquarters ? 'Headquarters' : STATUS_LABEL[hovered.status]}
            </p>
            {hovered.blurb && <p className="text-[11px] text-white/80 leading-snug mb-1">{hovered.blurb}</p>}
            {hovered.upcoming_rollout && (
              <p className="text-[10px] text-white/60 leading-snug">
                {hovered.upcoming_rollout}
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Status strip beneath the map ───────────────────── */}
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <Strip
          label="Headquartered in Oslo"
          value="Global coordination"
        />
        <Strip
          label="Operational"
          value={`${operational.length + (hq ? 1 : 0)} markets across North America, Europe, MENA`}
        />
        <Strip
          label="Expanding"
          value={`${expanding.length} markets across Europe, South Asia, Africa`}
        />
        <Strip
          label="Enterprise deployment"
          value="Available globally"
        />
      </div>
    </div>
  );
}

/* ── Node renderers ────────────────────────────────────── */

function Node({
  row, x, y, onHover, shape,
}: {
  row:    DeploymentRegionRow;
  x:      number;
  y:      number;
  onHover: (r: DeploymentRegionRow | null) => void;
  shape:  'solid' | 'ring' | 'diamond';
}) {
  const tone = TONE[row.status] ?? TONE.operational;
  return (
    <g
      onMouseEnter={() => onHover(row)}
      onMouseLeave={() => onHover(null)}
      style={{ cursor: 'pointer' }}
    >
      <circle cx={x} cy={y} r="14" fill={tone.ring} />
      {shape === 'solid' && (
        <>
          <circle cx={x} cy={y} r="6" fill={tone.fill} stroke={tone.border} strokeWidth="1" />
          <circle cx={x} cy={y} r="2.5" fill="#FFF">
            <animate attributeName="r" values="2;3.5;2" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {shape === 'ring' && (
        <>
          <circle cx={x} cy={y} r="6" fill={tone.fill} stroke={tone.border} strokeWidth="1.5" />
        </>
      )}
      {shape === 'diamond' && (
        <rect
          x={x - 5} y={y - 5}
          width="10" height="10"
          fill={tone.fill}
          stroke={tone.border}
          strokeWidth="1.6"
          transform={`rotate(45, ${x}, ${y})`}
        />
      )}
      <text
        x={x + 10} y={y + 3}
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize="9" fontWeight="600"
        fill="rgba(15,23,42,0.7)"
      >
        {row.country_code.toUpperCase()}
      </text>
    </g>
  );
}

function Star({ cx, cy, r, fill }: { cx: number; cy: number; r: number; fill: string }) {
  const points = Array.from({ length: 10 }, (_, i) => {
    const angle = (i * Math.PI) / 5 - Math.PI / 2;
    const radius = i % 2 === 0 ? r : r * 0.45;
    return `${cx + Math.cos(angle) * radius},${cy + Math.sin(angle) * radius}`;
  }).join(' ');
  return <polygon points={points} fill={fill} />;
}

function Strip({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5">
      <p className="text-[10px] uppercase tracking-[0.14em] text-slate-500 font-bold">{label}</p>
      <p className="text-sm font-semibold text-slate-900 mt-0.5">{value}</p>
    </div>
  );
}
