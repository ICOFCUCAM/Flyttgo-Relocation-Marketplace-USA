import { useState } from 'react';
import { useApp } from '../../lib/store';
import type { Page } from '../../lib/store';

/**
 * Deployment node positions on a 1000×500 equirectangular projection.
 * Lat/lon → x/y is approximated to keep the file dependency-free.
 */
const NODES: { id: string; iso: string; name: string; x: number; y: number; route: Page }[] = [
  { id: 'us', iso: 'US', name: 'United States',  x: 230, y: 198, route: 'market-us' },
  { id: 'ca', iso: 'CA', name: 'Canada',         x: 240, y: 162, route: 'market-canada' },
  { id: 'gb', iso: 'GB', name: 'United Kingdom', x: 478, y: 168, route: 'market-uk' },
  { id: 'no', iso: 'NO', name: 'Norway',         x: 510, y: 138, route: 'market-norway' },
  { id: 'de', iso: 'DE', name: 'Germany',        x: 510, y: 178, route: 'market-germany' },
  { id: 'fr', iso: 'FR', name: 'France',         x: 488, y: 188, route: 'market-france' },
];

/* Dotted continent silhouettes — each path drawn as a coarse outline.
 * Hand-tuned to read as an infrastructure-style world map rather than a
 * detailed cartographic surface. */
const CONTINENTS = [
  // North America
  'M120,135 L220,110 L330,150 L320,260 L210,290 L155,250 Z',
  // South America
  'M260,310 L320,300 L335,400 L290,450 L255,420 L240,360 Z',
  // Europe
  'M460,135 L535,140 L555,200 L495,210 L450,180 Z',
  // Africa
  'M470,235 L560,230 L590,330 L535,420 L495,400 L470,330 Z',
  // Asia
  'M555,135 L780,150 L820,225 L740,290 L640,270 L580,225 Z',
  // Australia
  'M780,360 L880,355 L900,415 L820,425 L780,400 Z',
  // Greenland
  'M380,90 L430,85 L440,130 L395,135 Z',
];

export default function WorldDeploymentMap() {
  const { setPage } = useApp();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const hoverNode = hoverId ? NODES.find(n => n.id === hoverId) : null;

  return (
    <div className="relative w-full">
      <svg
        viewBox="0 0 1000 500"
        role="img"
        aria-label="FlyttGo Global Logistics & Relocation Marketplace deployment map"
        className="w-full h-auto"
      >
        {/* Lat/lon grid */}
        <g stroke="rgba(148,163,184,0.15)" strokeWidth="1">
          {[0, 100, 200, 300, 400, 500].map(y => (
            <line key={`h-${y}`} x1="0" y1={y} x2="1000" y2={y} />
          ))}
          {[0, 200, 400, 600, 800, 1000].map(x => (
            <line key={`v-${x}`} x1={x} y1="0" x2={x} y2="500" />
          ))}
        </g>

        {/* Continent silhouettes — dotted infrastructure styling */}
        <g
          fill="none"
          stroke="rgba(148,163,184,0.55)"
          strokeWidth="1.2"
          strokeDasharray="2 3"
        >
          {CONTINENTS.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>

        {/* Corridor connectors — Phase 4 intercontinental routes */}
        <g
          fill="none"
          stroke="rgba(245,158,11,0.55)"
          strokeWidth="1"
          strokeDasharray="3 4"
        >
          <path d="M230,198 Q360,160 510,138" />
          <path d="M230,198 Q360,180 510,178" />
          <path d="M230,198 Q360,260 510,330" />
          <path d="M510,138 Q540,250 535,420" />
          <path d="M510,178 Q540,275 535,420" />
        </g>

        {/* Deployment nodes */}
        {NODES.map(n => (
          <g
            key={n.id}
            transform={`translate(${n.x}, ${n.y})`}
            onMouseEnter={() => setHoverId(n.id)}
            onMouseLeave={() => setHoverId(null)}
            onClick={() => setPage(n.route)}
            style={{ cursor: 'pointer' }}
          >
            <circle r="14" fill="rgba(245,158,11,0.18)" />
            <circle r="7"  fill="rgba(245,158,11,0.55)" />
            <circle r="3"  fill="#f59e0b">
              <animate attributeName="r" values="3;5;3" dur="2.6s" repeatCount="indefinite" />
            </circle>
            <text
              x="14"
              y="4"
              fontSize="11"
              fontFamily="JetBrains Mono, ui-monospace, monospace"
              fill="rgba(15,23,42,0.85)"
              fontWeight="600"
            >
              {n.iso}
            </text>
          </g>
        ))}
      </svg>

      {/* Hover label */}
      <div
        className="absolute top-3 right-3 font-mono text-xs uppercase tracking-[0.18em] text-slate-500"
      >
        {hoverNode ? `${hoverNode.iso} · ${hoverNode.name}` : '6 deployment nodes · 4-phase rollout'}
      </div>
    </div>
  );
}
