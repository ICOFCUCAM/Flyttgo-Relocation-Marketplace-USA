import React, { useEffect, useState } from 'react';
import { Globe2 } from 'lucide-react';
import { listDeploymentRegions, type DeploymentRegionRow, type DeploymentStatus } from '../../lib/live-ops-store';

/* ─────────────────────────────────────────────────────────────────
 * <DeploymentReadinessStrip>
 *
 * Public-facing institutional credibility strip — drops on the
 * homepage above the fold. Reads the same deployment_regions
 * table the admin Mission Control uses, so the moment a country
 * flips from 'pilot' to 'operational' the public messaging
 * updates automatically.
 *
 * Anon-readable; safe to render pre-auth on the homepage.
 * Falls back silently if the table isn't seeded yet.
 * ───────────────────────────────────────────────────────────────── */

const STATUS_COPY: Record<DeploymentStatus, string> = {
  operational: 'Operational',
  expanding:   'Expanding',
  pilot:       'Pilot stage',
  partner:     'Partner-supported',
  planned:     'Planned',
};

const STATUS_TONE: Record<DeploymentStatus, string> = {
  operational: 'bg-emerald-50 text-emerald-700  ring-emerald-200',
  expanding:   'bg-blue-50    text-blue-700     ring-blue-200',
  pilot:       'bg-amber-50   text-amber-700    ring-amber-200',
  partner:     'bg-violet-50  text-violet-700   ring-violet-200',
  planned:     'bg-slate-100  text-slate-600    ring-slate-200',
};

function summarize(rows: DeploymentRegionRow[]): string {
  const ops      = rows.filter(r => r.status === 'operational').map(r => r.display_name);
  const partner  = rows.filter(r => r.status === 'partner');
  const pilot    = rows.filter(r => r.status === 'pilot');
  const parts: string[] = [];
  if (ops.length > 0)     parts.push(`Operational in ${ops.slice(0, 4).join(', ')}${ops.length > 4 ? ` and ${ops.length - 4} more` : ''}`);
  if (partner.length > 0) parts.push(`Partner network across ${partner.map(r => r.display_name).join(', ')}`);
  if (pilot.length > 0)   parts.push(`Pilot readiness in ${pilot.map(r => r.display_name).join(', ')}`);
  parts.push('Enterprise deployment support available globally');
  return parts.join(' · ');
}

export default function DeploymentReadinessStrip() {
  const [rows, setRows] = useState<DeploymentRegionRow[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    listDeploymentRegions()
      .then(data => { if (!cancelled) { setRows(data); setReady(true); } })
      .catch(() => { if (!cancelled) setReady(true); /* fail silent */ });
    return () => { cancelled = true; };
  }, []);

  if (!ready || rows.length === 0) return null;

  return (
    <section className="bg-slate-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5">
        <div className="flex items-center gap-2 text-emerald-400 text-[10px] uppercase tracking-[0.16em] font-bold mb-2">
          <Globe2 size={12} />
          <span>Deployment readiness</span>
        </div>
        <p className="text-sm text-white/85 leading-relaxed mb-4 max-w-3xl">
          {summarize(rows)}
        </p>
        <div className="flex flex-wrap gap-2">
          {rows.map(r => (
            <span
              key={r.country_code}
              title={r.blurb ?? undefined}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${STATUS_TONE[r.status]}`}
            >
              <span>{r.flag}</span>
              <span>{r.display_name}</span>
              <span className="opacity-70">· {STATUS_COPY[r.status]}</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
