/* Shared helpers used across the admin dashboard tabs + modals. Keep
 * this file pure — no React, no Supabase. */

export function safeNumber(value: unknown): number {
  const n = Number(value ?? 0);
  return Number.isNaN(n) ? 0 : n;
}

/** Refund amount derived from the booking's lifecycle stage, or from a
 *  manual override if the admin has applied one. Mirrors the rate card
 *  documented in docs/refund-policy.md — cancel before driver-assigned
 *  is full refund, mid-trip refunds slide to zero. */
export function calculateRefundAmount(booking: Record<string, unknown>): number {
  const price = safeNumber(booking.price_estimate);
  const manualPct = booking.manual_refund_percent;
  if (manualPct != null) return price * (Number(manualPct) / 100);

  switch (booking.status) {
    case 'pending':         return price;
    case 'confirmed':       return price * 0.9;
    case 'driver_assigned': return price * 0.8;
    case 'pickup_arrived':
    case 'loading':         return price * 0.7;
    case 'in_transit':      return price * 0.5;
    case 'completed':
    case 'cancelled':       return 0;
    default:                return 0;
  }
}

/** Pop a CSV download for an array of rows. Quotes / escapes safely so
 *  the result opens cleanly in Excel / Sheets / Numbers. */
export function downloadCsv(filename: string, rows: Record<string, unknown>[]): void {
  if (rows.length === 0) {
    alert('No rows to export.');
    return;
  }
  const columns = Array.from(
    rows.reduce<Set<string>>((acc, r) => {
      Object.keys(r).forEach(k => acc.add(k));
      return acc;
    }, new Set()),
  );
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return '';
    const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const header = columns.join(',');
  const body = rows.map(r => columns.map(c => escape(r[c])).join(',')).join('\n');
  const blob = new Blob([header + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const DOCUMENT_TYPE_LABELS: Record<string, string> = {
  driver_license:       'Driver License',
  insurance:            'Insurance Document',
  vehicle_registration: 'Vehicle Registration',
  profile_photo:        'Profile Photo',
  background_check:     'Background Check',
};

export const REQUIRED_DOCS = [
  'driver_license',
  'insurance',
  'vehicle_registration',
  'profile_photo',
] as const;
