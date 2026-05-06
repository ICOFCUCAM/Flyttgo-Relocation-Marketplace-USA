import type { ProviderRecord } from './providers-catalogue';

/* ─────────────────────────────────────────────────────────────────
 * Provider public identity — the FlyttGo white-label layer
 *
 * The marketplace operates under a Uber / DoorDash-style model:
 * providers are *FlyttGo operators*, not independently advertised
 * companies. On every public surface (homepage, country pages,
 * corridor pages, provider profile, search) the provider's real
 * brand identity is hidden behind a FlyttGo-fronted display name.
 *
 * Why this matters:
 *   - The customer's relationship is with FlyttGo, not the
 *     individual operator.
 *   - Provider names are public-record data — masking them on
 *     the homepage is the only way to genuinely prevent
 *     disintermediation. Hiding contact info alone doesn't help
 *     when a customer can google the company name.
 *   - Reviews and reputation accumulate to the platform, which
 *     compounds across providers.
 *
 * The underlying ProviderRecord still carries the real `name` for
 * dispatch, payouts, ops, and driver/customer comms after a booking
 * is confirmed. This module *only* changes the display layer.
 *
 * Real-identity reveal:
 *   - PRE-BOOKING:  use {displayName, operatorId} from this module
 *   - POST-BOOKING (after escrow hold confirms): reveal the real
 *     name + phone + driver via the booking-confirmation surface.
 *     That code path is allowed to read ProviderRecord.name
 *     directly — see the comment in src/components/PaymentPage.tsx.
 *
 * Discovery providers (src/lib/discovery-providers.ts) are NOT
 * masked — they're acquisition leads, not yet our operators, so
 * their real brand names need to surface on the "Are you {Brand}?
 * Claim & onboard" CTA.
 * ───────────────────────────────────────────────────────────────── */

export interface ProviderPublicIdentity {
  /** What's shown on every public surface, e.g.
   *  "FlyttGo Elite Carrier · NYC Metro". */
  displayName: string;
  /** Stable opaque operator id. Customers can refer back to this
   *  when contacting support before a booking has been placed
   *  (e.g. "I was looking at FG-US-NE-A4321"). */
  operatorId:  string;
  /** Short geographic region label, e.g. "NYC Metro". */
  region:      string;
  /** Tier label that's surfaced unchanged across surfaces. */
  tierLabel:   string;
}

/* Tier-badge resolution — falls back to "Verified" when the
 * record has no badge (e.g. a country-specific badge like
 * "Bilingual" or "Home market" that doesn't read as a tier). */
function resolveTier(badge?: string): string {
  if (!badge) return 'Verified';
  const normalised = badge.toLowerCase();
  if (normalised === 'elite')                        return 'Elite';
  if (normalised === 'gold pro' || normalised === 'gold_pro') return 'Gold Pro';
  if (normalised === 'gold')                         return 'Gold';
  if (normalised === 'silver plus' || normalised === 'silver_plus') return 'Silver Plus';
  if (normalised === 'silver')                       return 'Silver';
  /* Country-specific badges fall back to a generic verification
   * label rather than leaking through. */
  return 'Verified';
}

/* Region label — strips the country suffix from the catalogue's
 * city field. "New York City, NY" → "NYC Metro", "Toronto, CA" →
 * "Greater Toronto", etc. We keep this intentionally simple; if
 * the catalogue ever surfaces a structured region field we'll
 * use that instead. */
const CITY_TO_REGION: Record<string, string> = {
  'New York City': 'NYC Metro',
  'Los Angeles':   'Greater LA',
  'Toronto':       'Greater Toronto',
  'Montréal':      'Greater Montréal',
  'London':        'Greater London',
  'Manchester':    'Greater Manchester',
  'Edinburgh':     'Central Belt',
  'Berlin':        'Berlin Metro',
  'München':       'Greater Munich',
  'Hamburg':       'Hamburg Metro',
  'Paris':         'Île-de-France',
  'Lyon':          'Auvergne-Rhône-Alpes',
  'Marseille':     'PACA',
  'Oslo':          'Greater Oslo',
  'Bergen':        'Vestlandet',
  'Trondheim':     'Trøndelag',
};

function regionFromCity(city: string): string {
  /* Strip the country / state suffix after the comma. */
  const head = city.split(',')[0].trim();
  return CITY_TO_REGION[head] ?? head;
}

/* Country code segment for the operator id. */
const COUNTRY_CODE_SEGMENT: Record<string, string> = {
  us: 'US', ca: 'CA', gb: 'UK', fr: 'FR', de: 'DE', no: 'NO',
};

/**
 * Compute the public identity for a provider. The result is
 * deterministic — same provider always maps to the same display
 * name and operator id across page loads, deploys, and surfaces,
 * so a customer can refer back to the same operator id when they
 * return.
 */
export function getProviderPublicIdentity(p: ProviderRecord): ProviderPublicIdentity {
  const tierLabel = resolveTier(p.badge);
  const region    = regionFromCity(p.city);
  const ccSeg     = COUNTRY_CODE_SEGMENT[p.country] ?? p.country.toUpperCase();

  /* Operator id derived from the slug — slugs are stable across
   * deploys (they're keyed off the catalogue) so this id is too.
   * Format: FG-{country}-{first-letters-of-slug}-{checksum} so the
   * id reads as opaque ("FG-US-AIM-4Q") without ever needing the
   * brand name. */
  const slugSeg = p.slug
    .split('-')
    .map(word => word[0]?.toUpperCase() ?? '')
    .join('')
    .slice(0, 4);
  /* Tiny stable checksum — sum of char codes mod 36, base-36'd.
   * Just enough variation that two slugs sharing initials still
   * read as distinct operator ids. */
  let hash = 0;
  for (let i = 0; i < p.slug.length; i++) hash = (hash + p.slug.charCodeAt(i)) % 1296;
  const checksum = hash.toString(36).toUpperCase().padStart(2, '0');

  const operatorId = `FG-${ccSeg}-${slugSeg || 'X'}-${checksum}`;
  const displayName = `FlyttGo ${tierLabel} Carrier · ${region}`;

  return { displayName, operatorId, region, tierLabel };
}
