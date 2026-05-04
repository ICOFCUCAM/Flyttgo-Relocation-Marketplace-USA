/* ─────────────────────────────────────────────────────────────────
 * Lightweight CSV writer.
 *
 * Hand-rolled to avoid pulling in a CSV library. Handles the only
 * three escape cases that matter: commas, double quotes, newlines.
 * RFC 4180 compliant.
 * ───────────────────────────────────────────────────────────────── */

function escapeCell(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'string' ? v : String(v);
  /* Wrap in quotes when the cell carries any of the three reserved
   * characters; double up internal quotes per RFC 4180. */
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/**
 * Convert an array of plain objects into a CSV string. Column order
 * comes from `headers` so the output is stable across runs.
 */
export function toCSV<T extends Record<string, unknown>>(
  rows: readonly T[],
  headers: readonly { key: keyof T & string; label: string }[],
): string {
  const head = headers.map(h => escapeCell(h.label)).join(',');
  const body = rows.map(r => headers.map(h => escapeCell(r[h.key])).join(',')).join('\n');
  return `${head}\n${body}\n`;
}

/**
 * Trigger a browser download of a CSV string. No-op on the server.
 */
export function downloadCSV(filename: string, csv: string): void {
  if (typeof window === 'undefined') return;
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
