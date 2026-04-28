/* ─────────────────────────────────────────────────────────────────
 * Finance Console export utilities.
 *
 * Three formats per the spec:
 *
 *   exportCsv      — RFC 4180 CSV with proper escaping. Excel /
 *                    Numbers / Sheets / SAP all open this cleanly.
 *
 *   exportWordHtml — HTML document saved with a .doc extension.
 *                    Word + Pages + LibreOffice all detect the
 *                    .doc + word-namespaced styles and open it
 *                    as a Word document. Avoids pulling in a 700 KB
 *                    docx generator for a use-case that's already
 *                    well-served by browser primitives.
 *
 *   printLedger    — opens a pop-up window with a print-stylesheet
 *                    body and triggers window.print(). The browser's
 *                    PDF driver handles the actual PDF generation,
 *                    which the spec's "print-ready ledger export"
 *                    line explicitly endorses. Works without any
 *                    library.
 *
 * Everything below is dependency-free and runs entirely in the
 * browser — no edge-function round-trip.
 * ───────────────────────────────────────────────────────────────── */

interface ExportColumn<T> {
  header:   string;
  /** Cell renderer. Return a primitive — null/undefined become ''. */
  value:    (row: T) => string | number | null | undefined;
}

function escapeCsv(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href     = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** Export rows as a UTF-8 BOM CSV. The BOM is what makes Excel
 *  open Norwegian / German rows correctly without garbling. */
export function exportCsv<T>(filename: string, columns: ExportColumn<T>[], rows: T[]): void {
  const head = columns.map(c => escapeCsv(c.header)).join(',');
  const body = rows.map(r => columns.map(c => escapeCsv(c.value(r))).join(','));
  const csv  = '﻿' + [head, ...body].join('\r\n');
  downloadBlob(filename, new Blob([csv], { type: 'text/csv;charset=utf-8' }));
}

/** Word-compatible export. We emit an HTML document with the
 *  Microsoft Office xmlns + content-type meta tags so Word
 *  recognises the file and renders the table styling. */
export function exportWordHtml<T>(
  filename: string,
  title:    string,
  columns:  ExportColumn<T>[],
  rows:     T[],
  meta?:    Record<string, string>,
): void {
  const headHtml = columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('');
  const bodyHtml = rows.map(r => `<tr>${
    columns.map(c => `<td>${escapeHtml(String(c.value(r) ?? ''))}</td>`).join('')
  }</tr>`).join('');
  const metaHtml = meta ? `<table class="meta">${Object.entries(meta).map(([k, v]) => (
    `<tr><th>${escapeHtml(k)}</th><td>${escapeHtml(v)}</td></tr>`
  )).join('')}</table>` : '';

  const html = `
<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: Calibri, Arial, sans-serif; color: #1a1a1a; }
    h1 { font-size: 18pt; margin: 0 0 6pt; }
    .meta { margin: 0 0 12pt; font-size: 9pt; }
    .meta th { text-align: left; padding-right: 12pt; color: #555; font-weight: 600; }
    table.ledger { border-collapse: collapse; width: 100%; font-size: 9pt; }
    table.ledger th, table.ledger td { border: 1px solid #ccc; padding: 4pt 6pt; vertical-align: top; }
    table.ledger th { background: #f3f4f6; text-align: left; }
    table.ledger tr:nth-child(even) td { background: #fafafa; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  ${metaHtml}
  <table class="ledger">
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
</body>
</html>`;
  downloadBlob(filename, new Blob([html], { type: 'application/msword' }));
}

/** Print-ready ledger via window.print(). The spec calls this out
 *  explicitly. Users print to PDF for the PDF export (every modern
 *  browser ships a PDF driver in the Print dialog). */
export function printLedger<T>(
  title:   string,
  columns: ExportColumn<T>[],
  rows:    T[],
  meta?:   Record<string, string>,
): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=1024,height=768');
  if (!win) return;

  const headHtml = columns.map(c => `<th>${escapeHtml(c.header)}</th>`).join('');
  const bodyHtml = rows.map(r => `<tr>${
    columns.map(c => `<td>${escapeHtml(String(c.value(r) ?? ''))}</td>`).join('')
  }</tr>`).join('');
  const metaHtml = meta ? `<dl class="meta">${Object.entries(meta).map(([k, v]) => (
    `<dt>${escapeHtml(k)}</dt><dd>${escapeHtml(v)}</dd>`
  )).join('')}</dl>` : '';

  win.document.write(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { margin: 18mm 14mm; }
  body  { font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
          color: #111; padding: 0; margin: 0; -webkit-print-color-adjust: exact; }
  header h1 { font-size: 16pt; margin: 0 0 4pt; }
  header p  { font-size: 9pt; color: #666; margin: 0 0 12pt; }
  dl.meta   { display: grid; grid-template-columns: max-content auto; gap: 2pt 12pt;
              font-size: 9pt; margin: 0 0 12pt; }
  dl.meta dt { color: #555; font-weight: 600; }
  dl.meta dd { margin: 0; }
  table  { border-collapse: collapse; width: 100%; font-size: 9pt; page-break-inside: auto; }
  thead  { display: table-header-group; }
  tr     { page-break-inside: avoid; }
  th, td { border: 1px solid #ccc; padding: 4pt 6pt; vertical-align: top; }
  th     { background: #f3f4f6; text-align: left; }
  tr:nth-child(even) td { background: #fafafa; }
  .footer { margin-top: 16pt; font-size: 8pt; color: #888; }
</style>
</head><body>
  <header>
    <h1>${escapeHtml(title)}</h1>
    <p>FlyttGo · Generated ${new Date().toLocaleString()}</p>
    ${metaHtml}
  </header>
  <table>
    <thead><tr>${headHtml}</tr></thead>
    <tbody>${bodyHtml}</tbody>
  </table>
  <p class="footer">${rows.length} row${rows.length === 1 ? '' : 's'} · Print or save as PDF via the browser dialog.</p>
  <script>window.onload = function () { window.focus(); window.print(); };<\/script>
</body></html>`);
  win.document.close();
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
