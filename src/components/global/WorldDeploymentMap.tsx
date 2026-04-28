import React, { useEffect, useMemo, useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { geoEqualEarth } from 'd3-geo';
import { feature } from 'topojson-client';
import type { Topology } from 'topojson-specification';
import type { FeatureCollection } from 'geojson';
import worldTopoRaw from 'world-atlas/countries-110m.json';
import { listDeploymentRegions, type DeploymentRegionRow, type DeploymentStatus } from '../../lib/live-ops-store';

/* ─────────────────────────────────────────────────────────────────
 * <WorldDeploymentMap>
 *
 * The Global Coverage Expansion Map. Real Natural Earth country
 * geometries (110m resolution, public domain) projected via
 * d3-geo's Equal-Earth projection — same library Wikipedia and
 * the Financial Times use. Data-driven from the deployment_regions
 * table so the platform's actual deployment posture drives the
 * public messaging.
 *
 * Three tiers + a headquarters node:
 *   ★ HQ            — Oslo, pulse animation, always-on label
 *   ● Operational   — solid emerald node
 *   ◎ Expansion     — semi-highlighted ring node
 *   ◇ Pilot         — outlined diamond node
 *
 * Animated arcs connect the operational HQ in Oslo to every other
 * Operational region so visitors read the platform as orchestrated
 * infrastructure. Legend, hover tooltip, and post-map status strip
 * carry the dual-HQ framing (Operational HQ Oslo · Incorporated in
 * Delaware, USA via Wankong LLC).
 * ───────────────────────────────────────────────────────────────── */

const VIEW_W = 1000;
const VIEW_H = 500;

/* Resolve the bundled TopoJSON to GeoJSON once at module load.
 * The cast is the standard pattern for world-atlas — its files
 * ship as Topology with `countries` and `land` collections. */
const worldTopo = worldTopoRaw as unknown as Topology;
const COUNTRIES_GEOJSON = feature(worldTopo, worldTopo.objects.countries) as unknown as FeatureCollection;

/* Pre-build the same Equal-Earth projection react-simple-maps will
 * use internally so we can project the deployment_regions lat/lng
 * onto exactly the same canvas. The scale + translate match
 * react-simple-maps' default for ComposableMap of width 1000. */
const projection = geoEqualEarth()
  .scale(175)
  .translate([VIEW_W / 2, VIEW_H / 2]);

function project(lng: number, lat: number): [number, number] | null {
  const p = projection([lng, lat]);
  return p ? [p[0], p[1]] : null;
}

const TONE: Record<DeploymentStatus, {
  fill:   string;
  ring:   string;
  border: string;
}> = {
  operational: { fill: '#10B981',                ring: 'rgba(16,185,129,0.18)', border: '#047857' },
  expanding:   { fill: 'rgba(59,130,246,0.45)',  ring: 'rgba(59,130,246,0.18)', border: '#2563EB' },
  pilot:       { fill: 'transparent',            ring: 'rgba(245,158,11,0.10)', border: '#D97706' },
  partner:     { fill: 'rgba(139,92,246,0.45)',  ring: 'rgba(139,92,246,0.18)', border: '#7C3AED' },
  planned:     { fill: '#94A3B8',                ring: 'rgba(148,163,184,0.18)', border: '#64748B' },
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

  const hq          = useMemo(() => regions.find(r => r.is_headquarters) ?? null, [regions]);
  const operational = useMemo(() => regions.filter(r => r.status === 'operational' && !r.is_headquarters), [regions]);
  const expanding   = useMemo(() => regions.filter(r => r.status === 'expanding'),   [regions]);
  const pilot       = useMemo(() => regions.filter(r => r.status === 'pilot'),       [regions]);

  if (!ready) {
    return <div className="w-full aspect-[2/1] bg-slate-50 rounded-2xl animate-pulse" />;
  }

  return (
    <div className="relative w-full">
      <div className="relative w-full bg-gradient-to-br from-slate-50 to-white rounded-2xl border border-slate-200 overflow-hidden">
        <ComposableMap
          projection="geoEqualEarth"
          projectionConfig={{ scale: 175 }}
          width={VIEW_W}
          height={VIEW_H}
          style={{ width: '100%', height: 'auto' }}
        >
          {/* Real Natural Earth country geometries.
              Light fill, slate stroke — reads as infrastructure, not
              cartographic. Hover state is reserved for the deployment
              nodes overlaid on top, so countries themselves stay
              non-interactive. */}
          <Geographies geography={COUNTRIES_GEOJSON}>
            {({ geographies }) =>
              geographies.map(geo => (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill="#F1F5F9"
                  stroke="#CBD5E1"
                  strokeWidth={0.4}
                  style={{
                    default:  { outline: 'none' },
                    hover:    { outline: 'none', fill: '#F1F5F9' },
                    pressed:  { outline: 'none' },
                  }}
                />
              ))
            }
          </Geographies>

          {/* Animated arcs — HQ → every operational region.
              Computed by projecting lat/lng pairs through the same
              Equal-Earth projection ComposableMap is using, then
              drawing a quadratic Bézier curve with a flowing
              dash-offset animation. */}
          {hq && operational.map(node => {
            const a = project(hq.lng!, hq.lat!);
            const b = project(node.lng!, node.lat!);
            if (!a || !b) return null;
            const midX = (a[0] + b[0]) / 2;
            const midY = (a[1] + b[1]) / 2 - Math.abs(b[0] - a[0]) * 0.18 - 20;
            return (
              <path
                key={`arc-${node.country_code}`}
                d={`M${a[0]},${a[1]} Q${midX},${midY} ${b[0]},${b[1]}`}
                fill="none"
                stroke="rgba(16,185,129,0.45)"
                strokeWidth={1.3}
                strokeDasharray="6 6"
              >
                <animate
                  attributeName="stroke-dashoffset"
                  from="0" to="-24"
                  dur="2.4s"
                  repeatCount="indefinite"
                />
              </path>
            );
          })}

          {/* Pilot region nodes — outlined diamonds */}
          {pilot.map(r => (
            <Marker
              key={r.country_code}
              coordinates={[r.lng!, r.lat!]}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { cursor: 'pointer' } as React.CSSProperties }}
            >
              <NodeBody row={r} shape="diamond" />
            </Marker>
          ))}

          {/* Expansion nodes — semi-filled rings */}
          {expanding.map(r => (
            <Marker
              key={r.country_code}
              coordinates={[r.lng!, r.lat!]}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { cursor: 'pointer' } as React.CSSProperties }}
            >
              <NodeBody row={r} shape="ring" />
            </Marker>
          ))}

          {/* Operational nodes — solid */}
          {operational.map(r => (
            <Marker
              key={r.country_code}
              coordinates={[r.lng!, r.lat!]}
              onMouseEnter={() => setHovered(r)}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { cursor: 'pointer' } as React.CSSProperties }}
            >
              <NodeBody row={r} shape="solid" />
            </Marker>
          ))}

          {/* HQ node — star with pulse, always-visible label */}
          {hq && (
            <Marker
              coordinates={[hq.lng!, hq.lat!]}
              onMouseEnter={() => setHovered(hq)}
              onMouseLeave={() => setHovered(null)}
              style={{ default: { cursor: 'pointer' } as React.CSSProperties }}
            >
              <circle r={22} fill="rgba(245,158,11,0.18)">
                <animate attributeName="r" values="18;28;18" dur="2.6s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.4;0;0.4" dur="2.6s" repeatCount="indefinite" />
              </circle>
              <circle r={10} fill="#F59E0B" />
              <Star cx={0} cy={0} r={6} fill="#FFF" />
              <text
                x={14} y={-8}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fontSize={11} fontWeight={700}
                fill="#92400E"
              >
                ★ Oslo · Operational HQ
              </text>
              <text
                x={14} y={4}
                fontFamily="JetBrains Mono, ui-monospace, monospace"
                fontSize={9}
                fill="#92400E"
                opacity={0.75}
              >
                Wankong LLC · Delaware, USA
              </text>
            </Marker>
          )}
        </ComposableMap>

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
              {hovered.is_headquarters
                ? 'Operational HQ · Incorporated in Delaware, USA'
                : STATUS_LABEL[hovered.status]}
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

      {/* ── Status strip beneath the map ─────────────────────
       * Dual-HQ structure: legal entity (Wankong LLC, Delaware,
       * USA) sits next to the operational coordination HQ in Oslo.
       * Common pattern for global infrastructure platforms. */}
      <div className="mt-4 grid sm:grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        <Strip label="Incorporated"           value="Delaware, United States" />
        <Strip label="Operational HQ"         value="Oslo · Global coordination" />
        <Strip label="Operational"            value={`${operational.length + (hq ? 1 : 0)} markets across N. America, Europe, MENA`} />
        <Strip label="Expanding & enterprise" value={`${expanding.length} expansion markets · enterprise deployment globally`} />
      </div>
    </div>
  );
}

/* ── Node renderers ────────────────────────────────────── */

function NodeBody({
  row, shape,
}: {
  row:   DeploymentRegionRow;
  shape: 'solid' | 'ring' | 'diamond';
}) {
  const tone = TONE[row.status] ?? TONE.operational;
  return (
    <g>
      <circle r={14} fill={tone.ring} />
      {shape === 'solid' && (
        <>
          <circle r={6} fill={tone.fill} stroke={tone.border} strokeWidth={1} />
          <circle r={2.5} fill="#FFF">
            <animate attributeName="r" values="2;3.5;2" dur="2.4s" repeatCount="indefinite" />
          </circle>
        </>
      )}
      {shape === 'ring' && (
        <circle r={6} fill={tone.fill} stroke={tone.border} strokeWidth={1.5} />
      )}
      {shape === 'diamond' && (
        <rect
          x={-5} y={-5}
          width={10} height={10}
          fill={tone.fill}
          stroke={tone.border}
          strokeWidth={1.6}
          transform="rotate(45)"
        />
      )}
      <text
        x={10} y={3}
        fontFamily="JetBrains Mono, ui-monospace, monospace"
        fontSize={9}
        fontWeight={600}
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
