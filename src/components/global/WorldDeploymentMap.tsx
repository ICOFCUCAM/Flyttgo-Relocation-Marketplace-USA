import { useState } from 'react';
import { ComposableMap, Geographies, Geography, Marker } from 'react-simple-maps';
import { useApp } from '../../lib/store';
import type { Page, BookingCountry } from '../../lib/store';

/* ─────────────────────────────────────────────────────────────────
 * <WorldDeploymentMap>
 *
 * Real-geometry SVG world map (TopoJSON via world-atlas, projected
 * with d3-geo) with the 6 FlyttGo deployment-country pins on top.
 * Replaces the prior hand-drawn polygon approximation that read as
 * faint triangles rather than continents.
 *
 * Visual model:
 *   - Background: every country in slate-100 with subtle slate-300
 *     borders
 *   - Active deployment countries (US / CA / UK / FR / DE / NO):
 *     amber-200 fill with amber-500 stroke so the marketplace
 *     footprint reads at a glance
 *   - Pins: pulsing amber dot + 2-letter ISO label per country,
 *     each clickable into its market shopfront
 *
 * TopoJSON source: world-atlas/countries-110m.json — 110m resolution
 * which is the right balance for a decorative trust surface
 * (recognisable continents without bloating the bundle).
 *
 * Click target: each highlighted country group binds onClick to the
 * market shopfront route so the map doubles as a country selector.
 * ───────────────────────────────────────────────────────────────── */

/* TopoJSON id (ISO 3166-1 numeric) → internal BookingCountry code.
 * world-atlas exposes numeric ids on each Geography (e.g. United
 * States = '840'); we map them to the marketplace country codes
 * so the active-country highlight picks the right shapes. */
const ISO_NUM_TO_COUNTRY: Record<string, BookingCountry> = {
  '840': 'us',  // United States
  '124': 'ca',  // Canada
  '826': 'gb',  // United Kingdom
  '250': 'fr',  // France
  '276': 'de',  // Germany
  '578': 'no',  // Norway
};

interface DeploymentNode {
  iso:    string;
  name:   string;
  /** [longitude, latitude] — projected by d3-geo at render time. */
  coords: [number, number];
  route:  Page;
}

const NODES: DeploymentNode[] = [
  { iso: 'US', name: 'United States',  coords: [-95.7129, 37.0902],  route: 'market-us' },
  { iso: 'CA', name: 'Canada',         coords: [-106.3468, 56.1304], route: 'market-canada' },
  { iso: 'GB', name: 'United Kingdom', coords: [-3.4360, 55.3781],   route: 'market-uk' },
  { iso: 'FR', name: 'France',         coords: [2.2137, 46.2276],    route: 'market-france' },
  { iso: 'DE', name: 'Germany',        coords: [10.4515, 51.1657],   route: 'market-germany' },
  { iso: 'NO', name: 'Norway',         coords: [8.4689, 60.4720],    route: 'market-norway' },
];

/* CDN-hosted TopoJSON. Cached aggressively by jsDelivr so the file
 * lands in the browser cache after the first load and re-renders
 * cost nothing. ~120kb gzipped on first load. */
const TOPO_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/* Quick lookup: alpha-2 ISO → marketplace route. */
const ISO_TO_ROUTE: Record<string, Page> = NODES.reduce((acc, n) => {
  acc[n.iso] = n.route;
  return acc;
}, {} as Record<string, Page>);

export default function WorldDeploymentMap() {
  const { setPage } = useApp();
  const [hoverIso, setHoverIso] = useState<string | null>(null);
  const hoverLabel = hoverIso
    ? NODES.find(n => n.iso === hoverIso)?.name ?? null
    : null;

  const activeNumIds = new Set(Object.keys(ISO_NUM_TO_COUNTRY));

  return (
    <div className="relative w-full">
      <ComposableMap
        projection="geoEqualEarth"
        projectionConfig={{ scale: 150, center: [10, 30] }}
        style={{ width: '100%', height: 'auto' }}
        aria-label="FlyttGo Global Logistics & Relocation Marketplace deployment map"
      >
        <Geographies geography={TOPO_URL}>
          {({ geographies }: { geographies: Array<{ rsmKey: string; id: string; properties: { name: string } }> }) =>
            geographies.map(geo => {
              const isActive = activeNumIds.has(String(geo.id));
              const country  = ISO_NUM_TO_COUNTRY[String(geo.id)];
              const route    = country
                ? NODES.find(n => n.iso.toLowerCase() === country)?.route
                : undefined;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  onClick={() => { if (route) setPage(route); }}
                  style={{
                    default: {
                      fill:        isActive ? '#fde68a' : '#f1f5f9',  // amber-200 / slate-100
                      stroke:      isActive ? '#f59e0b' : '#cbd5e1',  // amber-500 / slate-300
                      strokeWidth: isActive ? 0.8 : 0.4,
                      outline:     'none',
                    },
                    hover: {
                      fill:        isActive ? '#fcd34d' : '#e2e8f0',  // amber-300 / slate-200
                      stroke:      '#f59e0b',
                      strokeWidth: 0.8,
                      outline:     'none',
                      cursor:      route ? 'pointer' : 'default',
                    },
                    pressed: {
                      fill:        '#f59e0b',
                      stroke:      '#d97706',
                      strokeWidth: 0.8,
                      outline:     'none',
                    },
                  }}
                />
              );
            })
          }
        </Geographies>

        {/* Deployment pins — pulsing amber dot + 2-letter ISO label
         *  per country. Marker projects lat/lon into the same
         *  coordinate space as the geographies so the dot always
         *  lands on the right country shape. */}
        {NODES.map(n => (
          <Marker
            key={n.iso}
            coordinates={n.coords}
            onMouseEnter={() => setHoverIso(n.iso)}
            onMouseLeave={() => setHoverIso(null)}
            onClick={() => setPage(ISO_TO_ROUTE[n.iso])}
            style={{ default: { cursor: 'pointer' } }}
          >
            {/* Outer halo. */}
            <circle r={10} fill="rgba(245,158,11,0.18)" />
            {/* Solid dot with subtle pulse. */}
            <circle r={4.5} fill="#f59e0b" stroke="#fff" strokeWidth={1.2}>
              <animate
                attributeName="r"
                values="3.5;5.5;3.5"
                dur="2.6s"
                repeatCount="indefinite"
              />
            </circle>
            {/* ISO label to the right of the dot. */}
            <text
              x={11}
              y={3}
              fontSize={9}
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fill="rgba(15,23,42,0.85)"
              fontWeight={700}
              style={{ pointerEvents: 'none' }}
            >
              {n.iso}
            </text>
          </Marker>
        ))}
      </ComposableMap>

      {/* Hover label — sits in the corner so the cursor doesn't have
       *  to read the tiny pin text on hover. */}
      <div className="absolute top-3 right-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500 pointer-events-none">
        {hoverLabel ?? '6 deployment nodes · 4-phase rollout'}
      </div>
    </div>
  );
}
