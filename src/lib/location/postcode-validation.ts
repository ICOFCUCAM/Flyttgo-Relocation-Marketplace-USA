import type { CountryCode } from '../../components/NorwayAddressAutocomplete';

/* ─────────────────────────────────────────────────────────────────
 * Country-specific postcode validation
 *
 * Pure regexes — no API calls. Each validator returns a normalised
 * string when valid (uppercased, single-spaced where required) or
 * null when invalid. The autocomplete and booking flow can call
 * `validatePostcode(country, raw)` and trust either the canonical
 * form or a clean rejection.
 *
 * Supported formats:
 *
 *   us → 5 digits, optional +4 extension (90210, 90210-1234)
 *   ca → A1A 1A1 (no rural-zero rule beyond the standard regex)
 *   gb → variable alphanumeric (SW1A 1AA, M1 1AA, B33 8TH, …)
 *   fr → 5 digits, first 2 = department code (75001 → Paris 1er)
 *   de → 5 digits
 *   no → 4 digits
 *
 * Rules sourced from the national postal authority specs:
 *   USPS DMM A040 — 5-digit ZIP + optional 4-digit add-on
 *   Canada Post Addressing Standards — alpha-numeric pairs
 *   Royal Mail PAF — flexible but well-defined
 *   La Poste — 5-digit numeric with department prefix
 *   Deutsche Post — 5-digit numeric
 *   Posten — 4-digit numeric
 * ───────────────────────────────────────────────────────────────── */

interface PostcodeFormat {
  /** Validation regex applied to the trimmed, normalised input. */
  regex:    RegExp;
  /** Human-readable example shown in error messages. */
  example:  string;
  /** Description of the format — used in tooltip / placeholder copy. */
  format:   string;
  /** Optional normaliser. Receives the raw input post-trim and
   *  returns the canonical form (e.g. "k1a 0b1" → "K1A 0B1"). */
  normalise?: (raw: string) => string;
}

const POSTCODE_FORMATS: Record<CountryCode, PostcodeFormat> = {
  us: {
    /* 5 digits, optional 4-digit ZIP+4 extension separated by '-'. */
    regex:   /^\d{5}(-\d{4})?$/,
    example: '90210 or 90210-1234',
    format:  '5 digits',
  },
  ca: {
    /* A1A 1A1. The Canadian postal regex excludes the letters
     * D F I O Q U from the first character and W Z from the second
     * pair start; we accept the full 36-letter range because
     * Nominatim sometimes returns codes that include uppercased
     * variants and rejecting valid-looking codes hurts UX more than
     * a permissive accept. */
    regex:    /^[A-Z]\d[A-Z][ -]?\d[A-Z]\d$/,
    example:  'M5V 3L9',
    format:   'A1A 1A1',
    normalise: (raw) => {
      const stripped = raw.toUpperCase().replace(/[\s-]/g, '');
      if (stripped.length !== 6) return raw.toUpperCase();
      return `${stripped.slice(0, 3)} ${stripped.slice(3)}`;
    },
  },
  gb: {
    /* Royal Mail PAF — variable. Accepts Outward + Inward separated
     * by an optional space. Outward = 1–2 letters + 1–2 digits +
     * optional letter; Inward = 1 digit + 2 letters. Case-insensitive
     * input, normalised to uppercase + single-space. */
    regex: /^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/i,
    example: 'SW1A 1AA',
    format:  'Outward + Inward',
    normalise: (raw) => {
      const m = raw.toUpperCase().match(/^([A-Z]{1,2}\d[A-Z\d]?)\s*(\d[A-Z]{2})$/);
      if (!m) return raw.toUpperCase().trim();
      return `${m[1]} ${m[2]}`;
    },
  },
  fr: {
    /* 5 digits, first 2 = department code (01–95 + 97x/98x for
     *  overseas). We accept any 5-digit input — the autocomplete
     *  resolves the geocoded address anyway. */
    regex:   /^\d{5}$/,
    example: '75001',
    format:  '5 digits',
  },
  de: {
    /* 5 digits. */
    regex:   /^\d{5}$/,
    example: '10115',
    format:  '5 digits',
  },
  no: {
    /* 4 digits. */
    regex:   /^\d{4}$/,
    example: '0150',
    format:  '4 digits',
  },

  /* ── Expansion markets — first wave ──────────────────── */
  nl: {
    /* 1234 AB — 4 digits, optional space, 2 letters (excl. SA / SD / SS). */
    regex: /^\d{4}\s?[A-Z]{2}$/i,
    example: '1011 AC',
    format:  '4 digits + 2 letters',
    normalise: (raw) => {
      const stripped = raw.toUpperCase().replace(/\s/g, '');
      if (stripped.length !== 6) return raw.toUpperCase().trim();
      return `${stripped.slice(0, 4)} ${stripped.slice(4)}`;
    },
  },
  se: {
    /* 5 digits, conventionally written as "123 45". */
    regex: /^\d{3}\s?\d{2}$/,
    example: '111 22',
    format:  '5 digits',
    normalise: (raw) => {
      const stripped = raw.replace(/\s/g, '');
      if (stripped.length !== 5) return raw.trim();
      return `${stripped.slice(0, 3)} ${stripped.slice(3)}`;
    },
  },
  es: {
    /* 5 digits, first 2 = province code (01–52). */
    regex:   /^\d{5}$/,
    example: '28013',
    format:  '5 digits',
  },
  it: {
    /* 5 digits (CAP). */
    regex:   /^\d{5}$/,
    example: '20121',
    format:  '5 digits',
  },
  pl: {
    /* 12-345 — 2 digits, hyphen, 3 digits. */
    regex: /^\d{2}-?\d{3}$/,
    example: '00-001',
    format:  '12-345',
    normalise: (raw) => {
      const stripped = raw.replace(/[\s-]/g, '');
      if (stripped.length !== 5) return raw.trim();
      return `${stripped.slice(0, 2)}-${stripped.slice(2)}`;
    },
  },

  /* ── Expansion markets — second wave ─────────────────── */
  dk: {
    /* 4 digits. */
    regex:   /^\d{4}$/,
    example: '1050',
    format:  '4 digits',
  },
  be: {
    /* 4 digits. */
    regex:   /^\d{4}$/,
    example: '1000',
    format:  '4 digits',
  },
  at: {
    /* 4 digits. */
    regex:   /^\d{4}$/,
    example: '1010',
    format:  '4 digits',
  },
  ch: {
    /* 4 digits. */
    regex:   /^\d{4}$/,
    example: '8001',
    format:  '4 digits',
  },
  cz: {
    /* 5 digits, conventionally written as "123 45". */
    regex: /^\d{3}\s?\d{2}$/,
    example: '110 00',
    format:  '5 digits',
    normalise: (raw) => {
      const stripped = raw.replace(/\s/g, '');
      if (stripped.length !== 5) return raw.trim();
      return `${stripped.slice(0, 3)} ${stripped.slice(3)}`;
    },
  },
};

/**
 * Validate a postcode against a country-specific rule. Returns the
 * normalised string when valid, null when invalid.
 */
export function validatePostcode(country: CountryCode, raw: string | null | undefined): string | null {
  if (!raw) return null;
  const fmt = POSTCODE_FORMATS[country];
  if (!fmt) return raw.trim();    // unknown country — accept verbatim

  const trimmed = raw.trim();
  const candidate = fmt.normalise ? fmt.normalise(trimmed) : trimmed;
  return fmt.regex.test(candidate) ? candidate : null;
}

/**
 * Cheap "is this even close to valid" check used to drive in-line
 * field error states without hitting the full normaliser. Useful
 * for showing red-border styling as the customer types.
 */
export function isLikelyPostcode(country: CountryCode, raw: string | null | undefined): boolean {
  return validatePostcode(country, raw) !== null;
}

/**
 * Per-country format hint, e.g. "5 digits" or "A1A 1A1". Powers
 * placeholders + tooltips on postcode-aware inputs.
 */
export function postcodeFormatHint(country: CountryCode): { example: string; format: string } {
  const fmt = POSTCODE_FORMATS[country];
  return fmt
    ? { example: fmt.example, format: fmt.format }
    : { example: '', format: '' };
}
