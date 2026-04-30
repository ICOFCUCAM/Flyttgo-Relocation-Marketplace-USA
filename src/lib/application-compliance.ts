/* ─────────────────────────────────────────────────────────────────
 * Parser for the legacy `vehicle_model` cram-string written by
 * DriverOnboarding.
 *
 * The onboarding flow concatenates three pieces into a single
 * driver_applications.vehicle_model field:
 *
 *   "{categoryLabel} · {make} {model} · compliance={JSON}"
 *
 * That format was meant to pipe extra context to the admin
 * dashboard "inline" without a schema change. The downside: every
 * customer-facing surface that renders the field verbatim shows
 * raw JSON, e.g.
 *
 *   "luton van · Licensed moving carrier · Mercedes Sprinter ·
 *    · compliance={"usdot-number":"123456",...} (2020)"
 *
 * Until we migrate the schema (add proper columns for category +
 * compliance), this helper splits the cram-string into clean parts
 * so the rendering layer can format them properly.
 *
 * Schema migration follow-up: add nullable columns to
 *   driver_applications:
 *     provider_category   text
 *     usdot_number        text
 *     mc_number           text
 *     cargo_insurance     text
 *     gukg_licence        text
 *     gvol_number         text
 *     yrkestransport      text
 *   then update DriverOnboarding to write structured columns and
 *   delete this parser. Tracked in docs/marketplace-architecture.md.
 * ───────────────────────────────────────────────────────────────── */

export interface ParsedVehicleField {
  /** Provider category label, e.g. "Licensed moving carrier". */
  category:    string | null;
  /** Make + model joined string, e.g. "Mercedes Sprinter". */
  makeModel:   string | null;
  /** Parsed compliance object — usdot-number / mc-number / etc. */
  compliance:  Record<string, string>;
}

/* The compliance suffix always starts with "compliance=" preceded
 * by a separator. This regex matches it and captures the JSON body. */
const COMPLIANCE_SUFFIX_RE = /\s*·\s*compliance=(\{[^}]*\})\s*$/;

export function parseVehicleField(raw: string | null | undefined): ParsedVehicleField {
  if (!raw) return { category: null, makeModel: null, compliance: {} };

  let body = raw.trim();
  let compliance: Record<string, string> = {};

  /* 1. Extract + strip the compliance JSON suffix. */
  const match = body.match(COMPLIANCE_SUFFIX_RE);
  if (match) {
    body = body.replace(COMPLIANCE_SUFFIX_RE, '').trim();
    try {
      const parsed = JSON.parse(match[1]) as Record<string, unknown>;
      compliance = Object.fromEntries(
        Object.entries(parsed).filter(([, v]) => typeof v === 'string' && v.trim() !== '')
              .map(([k, v]) => [k, String(v)]),
      );
    } catch {
      /* If the JSON is malformed (it sometimes is — manual edits,
       * truncation), fall through with an empty compliance set
       * rather than letting the parse error bubble. */
    }
  }

  /* 2. Split the remaining " · "-separated parts. */
  const parts = body.split('·').map(s => s.trim()).filter(Boolean);

  /* Conservative interpretation:
   *   - 0 parts: nothing to render
   *   - 1 part:  treat as makeModel
   *   - 2+ parts: first = category, rest = makeModel (re-joined)
   * This handles single-piece submissions cleanly while still
   * decoding the compound case. */
  let category:  string | null = null;
  let makeModel: string | null = null;

  if (parts.length === 1) {
    makeModel = parts[0];
  } else if (parts.length >= 2) {
    category  = parts[0];
    makeModel = parts.slice(1).join(' · ');
  }

  return { category, makeModel, compliance };
}

/* Friendly label per known compliance key. Falls back to the raw
 * key (lowercased, dashes → spaces) when the key is unknown. */
const COMPLIANCE_LABELS: Record<string, string> = {
  'usdot-number':       'USDOT number',
  'mc-number':          'MC number',
  'cargo-insurance':    'Cargo insurance',
  'gukg-licence':       'GüKG licence',
  'gvol-number':        'GVOL operator licence',
  'yrkestransport':     'Yrkestransportløyve',
  'siret':              'SIRET',
  'tva':                'TVA',
};

export function complianceLabel(key: string): string {
  return COMPLIANCE_LABELS[key] ?? key.replace(/[-_]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}
