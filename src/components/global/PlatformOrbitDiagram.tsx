import React, { useState } from 'react';
import {
  Truck, Briefcase, GraduationCap, Building2,
  Wallet, ShieldCheck, Network, BarChart3, Cpu,
  type LucideIcon,
} from 'lucide-react';

/* ─────────────────────────────────────────────────────────────────
 * <PlatformOrbitDiagram>
 *
 * Visual system map of FlyttGoTech Core + the eight interoperable
 * modules that make up the platform. Pure SVG — no external lib,
 * no stock imagery — so the geometry stays infinitely crisp at
 * any size and fits the rest of the homepage's infrastructure
 * styling.
 *
 * Reads as:
 *   - center: FlyttGoTech Core (largest, glow + pulse, lines out
 *     to every module)
 *   - 8 module nodes evenly arranged on a circular orbit
 *   - outer halo with the deployment-compatibility tiers (SaaS,
 *     PaaS, IaaS, Sovereign Deployment Ready)
 *   - hover any module → tooltip with description, deployment
 *     scope, and institutional relevance
 *
 * Communicates "platform infrastructure" vs. "moving website"
 * the moment a procurement / investor / institutional reader
 * lands on the page.
 * ───────────────────────────────────────────────────────────────── */

const VIEW = 800;
const CENTER = VIEW / 2;
const ORBIT_RADIUS = 260;
const HALO_RADIUS  = 365;

type ModuleId =
  | 'marketplace' | 'workforce' | 'university' | 'municipal'
  | 'payments'    | 'identity'  | 'dispatch'   | 'finops';

interface OrbitModule {
  id:         ModuleId;
  name:       string;
  tagline:    string;
  description:            string;
  deploymentScope:        string;
  institutionalRelevance: string;
  Icon:       LucideIcon;
  /* Tone influences the node fill — subtle differentiation so the
   * orbit doesn't read as a wall of identical chips. */
  tone:       'emerald' | 'blue' | 'violet' | 'amber';
}

/* Module definitions — mirror the ecosystem narrative spec. The
 * order here defines clockwise placement on the orbit, starting
 * at 12 o'clock. */
const MODULES: OrbitModule[] = [
  {
    id: 'marketplace',
    name: 'Relocation Marketplace',
    tagline: 'Global moving & logistics coordination',
    description:
      'Multi-country residential and commercial relocation marketplace with country-adaptive pricing, payment routing, escrow, and provider rating.',
    deploymentScope: 'Operational in 6 markets · expanding into 7 more.',
    institutionalRelevance: 'Primary commercial module — drives marketplace gross volume.',
    Icon: Truck,
    tone: 'emerald',
  },
  {
    id: 'workforce',
    name: 'Workforce Mobility',
    tagline: 'Employee relocation & deployment routing',
    description:
      'Coordinated relocation lanes for corporate transfers, NGO field deployments, and government workforce movement, with org-level RBAC and contracts.',
    deploymentScope: 'Globally available · enterprise + government contracts.',
    institutionalRelevance: 'Supports enterprise + government HR mobility procurement.',
    Icon: Briefcase,
    tone: 'blue',
  },
  {
    id: 'university',
    name: 'University Mobility',
    tagline: 'Student & researcher relocation support',
    description:
      'Semester relocation coordination, international student onboarding logistics, and research mobility routing environments.',
    deploymentScope: 'Live across operational markets · pilot rollout in East Africa.',
    institutionalRelevance: 'Institutional entry pathway — research and student affairs.',
    Icon: GraduationCap,
    tone: 'violet',
  },
  {
    id: 'municipal',
    name: 'Municipal Services',
    tagline: 'City-level mobility coordination infrastructure',
    description:
      'City-scale dispatch + relocation coordination for public housing transfers, displacement response, and municipal logistics.',
    deploymentScope: 'Pilot stage · partner-supported in select counties.',
    institutionalRelevance: 'Public-sector readiness — county and city procurement lanes.',
    Icon: Building2,
    tone: 'amber',
  },
  {
    id: 'payments',
    name: 'Payments Layer',
    tagline: 'Escrow-enabled relocation transaction infrastructure',
    description:
      'Multi-gateway payments (Stripe · Flutterwave · Paystack · Razorpay · PayPal · M-Pesa) with country-aware deposit / cash splits and full escrow.',
    deploymentScope: 'Globally available · 6 gateways live.',
    institutionalRelevance: 'Trust foundation — institutional procurement compatibility.',
    Icon: Wallet,
    tone: 'emerald',
  },
  {
    id: 'identity',
    name: 'Identity Layer',
    tagline: 'Provider verification & institutional access control',
    description:
      'Per-country compliance documents, KYC verification level, organization-level role-based access, and corporate access tokens.',
    deploymentScope: 'Globally available · per-country compliance gates active.',
    institutionalRelevance: 'Critical for enterprise and government readiness.',
    Icon: ShieldCheck,
    tone: 'blue',
  },
  {
    id: 'dispatch',
    name: 'Logistics Dispatch Engine',
    tagline: 'Smart provider matching & routing intelligence',
    description:
      '10-dimension Smart Matching Engine with three routing modes (instant · multi-quote · enterprise) and country-compliance gating.',
    deploymentScope: 'Globally available · running on every booking.',
    institutionalRelevance: 'Differentiates the platform vs. listing-style competitors.',
    Icon: Network,
    tone: 'violet',
  },
  {
    id: 'finops',
    name: 'Financial Operations Layer',
    tagline: 'Accounting, audit & compliance-ready reporting',
    description:
      'Per-country tax mode (sales-tax / VAT), invoice generation, payout reconciliation, and audit-ready financial reporting.',
    deploymentScope: 'Globally available · IFRS / GAAP-compatible.',
    institutionalRelevance: 'Procurement-grade financial compliance for institutional buyers.',
    Icon: BarChart3,
    tone: 'amber',
  },
];

const TONE: Record<OrbitModule['tone'], { fill: string; ring: string; text: string; border: string }> = {
  emerald: { fill: '#ECFDF5', ring: 'rgba(16,185,129,0.18)',  text: '#065F46', border: '#10B981' },
  blue:    { fill: '#EFF6FF', ring: 'rgba(59,130,246,0.18)',  text: '#1E40AF', border: '#3B82F6' },
  violet:  { fill: '#F5F3FF', ring: 'rgba(139,92,246,0.18)',  text: '#5B21B6', border: '#8B5CF6' },
  amber:   { fill: '#FFFBEB', ring: 'rgba(245,158,11,0.18)',  text: '#92400E', border: '#F59E0B' },
};

/* Halo deployment-compatibility tiers placed evenly around the
 * orbit. The angles intentionally fall between module nodes (every
 * 90° starting at 45°) so the labels never overlap a module. */
const HALO_TIERS = [
  { label: 'SaaS',                       angle: 45  },
  { label: 'PaaS',                       angle: 135 },
  { label: 'IaaS',                       angle: 225 },
  { label: 'Sovereign Deployment Ready', angle: 315 },
];

function angleAt(index: number, total: number, startDeg = -90): number {
  return startDeg + (360 / total) * index;
}

function pointOnCircle(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

export default function PlatformOrbitDiagram() {
  const [hovered, setHovered] = useState<OrbitModule | null>(null);

  return (
    <div className="relative w-full max-w-3xl mx-auto">
      <div className="relative aspect-square">
        <svg
          viewBox={`0 0 ${VIEW} ${VIEW}`}
          role="img"
          aria-label="FlyttGoTech Core platform ecosystem orbit"
          className="w-full h-full"
        >
          <defs>
            {/* Soft glow for the center node. */}
            <radialGradient id="core-glow" cx="50%" cy="50%" r="50%">
              <stop offset="0%"   stopColor="rgba(16,185,129,0.55)" />
              <stop offset="60%"  stopColor="rgba(16,185,129,0.10)" />
              <stop offset="100%" stopColor="rgba(16,185,129,0)" />
            </radialGradient>

            {/* Halo path — module connection lines fade into a ring. */}
            <radialGradient id="orbit-fade" cx="50%" cy="50%" r="50%">
              <stop offset="55%" stopColor="rgba(148,163,184,0)" />
              <stop offset="85%" stopColor="rgba(148,163,184,0.18)" />
              <stop offset="100%" stopColor="rgba(148,163,184,0)" />
            </radialGradient>
          </defs>

          {/* Halo deployment-compatibility ring */}
          <circle
            cx={CENTER} cy={CENTER} r={HALO_RADIUS}
            fill="none"
            stroke="rgba(148,163,184,0.30)"
            strokeWidth={1}
            strokeDasharray="3 5"
          />
          {/* Slow rotation for orbital feel. The animation respects
              prefers-reduced-motion via the wrapper class. */}
          <g className="motion-safe:[animation:orbit-spin_60s_linear_infinite]" style={{ transformOrigin: `${CENTER}px ${CENTER}px` }}>
            {HALO_TIERS.map(t => {
              const p = pointOnCircle(CENTER, CENTER, HALO_RADIUS, t.angle - 90);
              return (
                <text
                  key={t.label}
                  x={p.x} y={p.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontFamily="JetBrains Mono, ui-monospace, monospace"
                  fontSize={11}
                  fontWeight={700}
                  fill="rgba(71,85,105,0.85)"
                  letterSpacing="0.18em"
                >
                  {t.label.toUpperCase()}
                </text>
              );
            })}
          </g>

          {/* Orbit ring (the path the modules sit on). */}
          <circle
            cx={CENTER} cy={CENTER} r={ORBIT_RADIUS}
            fill="none"
            stroke="rgba(148,163,184,0.35)"
            strokeWidth={1}
          />

          {/* Connection lines from the core to each module. Drawn
              before the modules + center so the nodes sit on top. */}
          {MODULES.map((m, i) => {
            const angle = angleAt(i, MODULES.length);
            const p = pointOnCircle(CENTER, CENTER, ORBIT_RADIUS, angle);
            const tone = TONE[m.tone];
            const isHover = hovered?.id === m.id;
            return (
              <line
                key={`line-${m.id}`}
                x1={CENTER} y1={CENTER}
                x2={p.x}    y2={p.y}
                stroke={isHover ? tone.border : 'rgba(148,163,184,0.45)'}
                strokeWidth={isHover ? 1.6 : 1}
                strokeDasharray={isHover ? undefined : '4 4'}
              />
            );
          })}

          {/* Pulse glow under center */}
          <circle
            cx={CENTER} cy={CENTER} r={130}
            fill="url(#core-glow)"
          >
            <animate attributeName="r" values="120;145;120" dur="3.2s" repeatCount="indefinite" />
          </circle>

          {/* Center: FlyttGoTech Core */}
          <g>
            <circle cx={CENTER} cy={CENTER} r={92}
              fill="#0F172A"
              stroke="rgba(16,185,129,0.6)"
              strokeWidth={1.5}
            />
            <circle cx={CENTER} cy={CENTER} r={92}
              fill="none"
              stroke="rgba(16,185,129,0.9)"
              strokeWidth={2}
            >
              <animate attributeName="r"
                values="92;102;92" dur="3.2s" repeatCount="indefinite" />
              <animate attributeName="stroke-opacity"
                values="0.9;0;0.9" dur="3.2s" repeatCount="indefinite" />
            </circle>
            <foreignObject x={CENTER - 80} y={CENTER - 38} width={160} height={76}>
              <div className="w-full h-full flex flex-col items-center justify-center text-center">
                <Cpu size={20} className="text-emerald-400 mb-1" />
                <p className="text-white font-extrabold text-sm leading-tight">FlyttGoTech</p>
                <p className="text-emerald-400 font-extrabold text-sm leading-tight tracking-wide">Core</p>
                <p className="text-white/60 text-[9px] uppercase tracking-[0.18em] mt-1">
                  Platform Orchestration
                </p>
              </div>
            </foreignObject>
          </g>

          {/* Module nodes (rendered after center so labels overlay
              connection lines cleanly). */}
          {MODULES.map((m, i) => {
            const angle = angleAt(i, MODULES.length);
            const p     = pointOnCircle(CENTER, CENTER, ORBIT_RADIUS, angle);
            const tone  = TONE[m.tone];
            const isHover = hovered?.id === m.id;

            /* Anchor the label radially outward so it never crosses
             * the orbit ring. For nodes near the top/bottom the
             * label sits above/below; for sides it sits left/right. */
            const isRightSide  = p.x > CENTER + 4;
            const isLeftSide   = p.x < CENTER - 4;
            const labelOffsetX = isRightSide ? 30 : isLeftSide ? -30 : 0;
            const labelAnchor: 'start' | 'end' | 'middle' =
              isRightSide ? 'start' : isLeftSide ? 'end' : 'middle';
            const isTop    = p.y < CENTER - 4;
            const labelOffsetY = isTop && !isRightSide && !isLeftSide ? -30 : (!isTop && !isRightSide && !isLeftSide ? 38 : 0);

            return (
              <g
                key={m.id}
                onMouseEnter={() => setHovered(m)}
                onMouseLeave={() => setHovered(null)}
                style={{ cursor: 'pointer' }}
              >
                {/* Subtle outer ring — fills a 26 px halo around node */}
                <circle cx={p.x} cy={p.y} r={32} fill={tone.ring} />

                {/* Node body */}
                <circle
                  cx={p.x} cy={p.y} r={24}
                  fill={tone.fill}
                  stroke={tone.border}
                  strokeWidth={isHover ? 2.5 : 1.5}
                />

                {/* Icon — placed via foreignObject so we can use the
                    real lucide-react components instead of redrawing
                    them from scratch. 28 px box centred. */}
                <foreignObject x={p.x - 14} y={p.y - 14} width={28} height={28}>
                  <div className="w-full h-full flex items-center justify-center" style={{ color: tone.text }}>
                    <m.Icon size={20} />
                  </div>
                </foreignObject>

                {/* Label */}
                <text
                  x={p.x + labelOffsetX}
                  y={p.y + labelOffsetY}
                  textAnchor={labelAnchor}
                  dominantBaseline="middle"
                  fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize={12}
                  fontWeight={700}
                  fill="rgba(15,23,42,0.92)"
                >
                  {m.name}
                </text>
                <text
                  x={p.x + labelOffsetX}
                  y={p.y + labelOffsetY + 14}
                  textAnchor={labelAnchor}
                  dominantBaseline="middle"
                  fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
                  fontSize={9}
                  fill="rgba(71,85,105,0.85)"
                >
                  {m.tagline}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Hover tooltip — bottom-centred so it never crosses the orbit. */}
        {hovered && (
          <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-2 max-w-md w-[calc(100%-2rem)] bg-slate-900 text-white rounded-xl shadow-xl px-4 py-3">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] uppercase tracking-[0.16em] text-emerald-300 font-bold">
                Module
              </span>
              <span className="font-bold text-sm">{hovered.name}</span>
            </div>
            <p className="text-xs text-white/85 leading-snug mb-2">{hovered.description}</p>
            <dl className="grid grid-cols-1 gap-1 text-[11px]">
              <div className="flex gap-2">
                <dt className="text-white/50 uppercase tracking-wider text-[9px] flex-shrink-0 w-20">Scope</dt>
                <dd className="text-white/85">{hovered.deploymentScope}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="text-white/50 uppercase tracking-wider text-[9px] flex-shrink-0 w-20">Relevance</dt>
                <dd className="text-white/85">{hovered.institutionalRelevance}</dd>
              </div>
            </dl>
          </div>
        )}
      </div>

      {/* Local keyframes for the halo rotation. Scoped via
       * arbitrary-value class names so we don't have to touch
       * the global CSS. */}
      <style>{`@keyframes orbit-spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
