/**
 * Statutory export utilities for the accounting workspace (Phase 10).
 *
 *   exportCsv   — RFC-4180 escape: quote any cell containing comma,
 *                 quote, or newline; double up embedded quotes.
 *   exportWord  — Word-compatible HTML (.doc) wrapper. Word opens
 *                 HTML files with this MIME type natively; tables
 *                 + headings round-trip correctly.
 *   exportPdf   — Browser-native print-to-PDF via window.print(),
 *                 driven by a print-only stylesheet on the workspace
 *                 (Phase 13). No server-side renderer needed.
 */

interface ExportColumn<Row> {
  header:    string;
  /** Returns the cell value as a primitive. Null/undefined → ''. */
  value:     (row: Row) => string | number | null | undefined;
  /** When true, format as a number with thousand separators in PDF/Word. */
  numeric?:  boolean;
}

/* ── CSV ──────────────────────────────────────────────────── */

function escapeCsvCell(raw: string | number | null | undefined): string {
  if (raw == null) return '';
  const s = String(raw);
  /* RFC-4180 — wrap in quotes if any of [comma, quote, CR, LF] appear,
   * and double-up embedded quotes. */
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCsv<Row>(filename: string, rows: Row[], columns: ExportColumn<Row>[]): void {
  const lines: string[] = [];
  lines.push(columns.map(c => escapeCsvCell(c.header)).join(','));
  for (const row of rows) {
    lines.push(columns.map(c => escapeCsvCell(c.value(row))).join(','));
  }
  /* UTF-8 BOM keeps Excel happy with non-ASCII content (Norwegian
   * æ ø å, GBP £, EUR €, etc.) */
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.csv') ? filename : `${filename}.csv`);
}

/* ── Word (.doc HTML wrapper) ────────────────────────────── */

export function exportWord<Row>(
  filename: string,
  title:    string,
  rows:     Row[],
  columns:  ExportColumn<Row>[],
): void {
  const tableRows = rows.map(r => `
      <tr>${columns.map(c => `
        <td style="border:1px solid #999;padding:6px 8px;${c.numeric ? 'text-align:right;font-variant-numeric:tabular-nums;' : ''}">${
          escapeHtml(formatValue(c.value(r), c.numeric))
        }</td>`).join('')}
      </tr>`).join('');

  const html = `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #1a1a1a; }
    h1   { font-size: 16pt; color: #0b1f3a; border-bottom: 2px solid #0b1f3a; padding-bottom: 4pt; }
    .meta { color: #666; font-size: 9pt; margin-bottom: 12pt; }
    table { border-collapse: collapse; width: 100%; }
    th { background: #0b1f3a; color: #fff; padding: 6pt 8pt; text-align: left; font-weight: 600; }
    td { vertical-align: top; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="meta">Generated ${new Date().toISOString().slice(0,16).replace('T',' ')} UTC · FlyttGo Accounting Workspace</p>
  <table>
    <thead><tr>${columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('')}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
</body>
</html>`;

  const blob = new Blob([html], { type: 'application/msword;charset=utf-8' });
  triggerDownload(blob, filename.endsWith('.doc') ? filename : `${filename}.doc`);
}

/* ── PDF (browser print-to-PDF) ────────────────────────── */

/**
 * Triggers the browser's native print dialog. Pair with the
 * `@media print` stylesheet on the accounting workspace (Phase 13)
 * so the operator picks "Save as PDF" → finished.
 *
 * If you need server-side PDF generation (auto-emailed reports),
 * the code points to expose `pdf-renderer` as an edge function
 * fed by the same templates; not required for human-driven export.
 */
export function exportPdf(): void {
  if (typeof window === 'undefined') return;
  window.print();
}

/* ── helpers ────────────────────────────────────────────── */

function formatValue(v: string | number | null | undefined, numeric?: boolean): string {
  if (v == null) return '';
  if (numeric) {
    const n = Number(v);
    if (Number.isFinite(n)) return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(v);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
