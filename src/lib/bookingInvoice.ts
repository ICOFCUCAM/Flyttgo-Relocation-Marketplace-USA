/* ─────────────────────────────────────────────────────────────────
 * bookingInvoice — print-to-PDF invoice generator
 *
 * Opens a self-contained invoice in a new window using inline HTML +
 * print-aware CSS, then triggers window.print() so the customer
 * (or driver / admin) can save it as a PDF via the browser's native
 * Save-as-PDF dialog.
 *
 * Why no PDF library: jspdf / pdfmake adds ~150KB gzipped just for
 * one feature. Native print is universally supported, gives us the
 * customer's locale-aware PDF naming, and lets the user keep the
 * print dialog's other options (paper size, range, two-up, etc.).
 *
 * Layout follows a standard invoice:
 *   - Header: FlyttGo wordmark + booking ID + invoice date
 *   - Bill-to: customer name, email, phone
 *   - Move details: pickup / dropoff / vehicle / date / distance
 *   - Line items: base, distance, helpers, extras
 *   - Totals: subtotal, deposit (cash), total due
 *   - Footer: legal block + escrow disclosure
 * ───────────────────────────────────────────────────────────────── */

import type { BookingRow } from '../services/bookings';

interface InvoiceLineItem {
  label:  string;
  amount: number;
  /** Optional secondary detail rendered under the label, e.g.
   *  "(2h × $115/hr)". */
  detail?: string;
}

export interface BookingInvoiceInput {
  booking:        BookingRow;
  /** ISO currency code — defaults to USD. */
  currency?:      string;
  /** Override line items if the caller has a richer breakdown than
   *  the booking row alone provides; otherwise this helper composes
   *  a reasonable summary from booking.estimated_price + the
   *  booking row's denormalised fields. */
  lineItems?:     InvoiceLineItem[];
  /** Optional invoice number. Defaults to "INV-" + first 8 chars of
   *  the booking id. */
  invoiceNumber?: string;
}

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function fmtMoney(n: number, currency: string): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(n);
  } catch {
    return `${currency} ${n.toFixed(2)}`;
  }
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function buildLineItemsFromBooking(b: BookingRow): InvoiceLineItem[] {
  const total = Number(b.estimated_price ?? b.final_price ?? 0);
  /* When the caller didn't pass a richer breakdown, surface a single
   * "Booking total" line so the invoice still tells the customer
   * what they're paying. The caller can pass `lineItems` to get a
   * proper itemised invoice. */
  if (total <= 0) return [];
  return [{ label: 'Move coordination — total', amount: total }];
}

function invoiceHtml(input: BookingInvoiceInput): string {
  const { booking } = input;
  const currency = (input.currency ?? 'USD').toUpperCase();
  const items    = input.lineItems ?? buildLineItemsFromBooking(booking);
  const subtotal = items.reduce((s, it) => s + it.amount, 0);
  const total    = Number(booking.final_price ?? booking.estimated_price ?? subtotal);
  const deposit  = Number(booking.deposit_amount ?? 0);
  const cashDue  = Number(booking.cash_due_amount ?? 0);
  const invoiceNumber = input.invoiceNumber ?? `INV-${String(booking.id).slice(0, 8).toUpperCase()}`;
  const issuedAt = new Date().toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });

  const safe = escapeHtml;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>FlyttGo invoice — ${safe(invoiceNumber)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1" />
<style>
  *, *::before, *::after { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0b1f3a;
    background: #f7f7f5;
    -webkit-font-smoothing: antialiased;
  }
  .page {
    max-width: 760px;
    margin: 32px auto;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 16px;
    padding: 48px 56px;
  }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 20px;
    margin-bottom: 28px;
  }
  .brand {
    display: inline-flex;
    align-items: center;
    gap: 10px;
  }
  .brand-mark {
    width: 36px; height: 36px;
    border-radius: 9px;
    background: #fbbf24;
    color: #0b1f3a;
    display: inline-flex; align-items: center; justify-content: center;
    font-weight: 900; font-size: 20px;
  }
  .brand-name { font-size: 22px; font-weight: 800; letter-spacing: -0.4px; }
  .brand-name span { color: #b45309; }
  .brand-tag { font-size: 10px; letter-spacing: 1.6px; text-transform: uppercase; color: #64748b; margin-top: 2px; font-weight: 600; }
  .invoice-meta { text-align: right; font-size: 12px; color: #475569; }
  .invoice-meta .invoice-no { color: #0b1f3a; font-size: 16px; font-weight: 800; letter-spacing: -0.2px; }
  h1 { font-size: 26px; font-weight: 800; margin: 0 0 18px; letter-spacing: -0.4px; }
  h2 { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.4px; color: #64748b; margin: 0 0 8px; }
  .row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    margin-bottom: 24px;
  }
  .card {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 12px;
    padding: 16px;
    font-size: 13px;
    line-height: 1.5;
  }
  .card strong { color: #0b1f3a; }
  table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 8px; }
  th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; }
  th { font-size: 11px; text-transform: uppercase; letter-spacing: 1.2px; color: #64748b; background: #f8fafc; }
  td.amount, th.amount { text-align: right; font-variant-numeric: tabular-nums; }
  .totals { margin-top: 16px; }
  .totals .totals-line {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    padding: 6px 12px;
    font-size: 13px;
  }
  .totals .totals-line.grand {
    border-top: 2px solid #0b1f3a;
    margin-top: 10px;
    padding-top: 12px;
    font-size: 16px;
    font-weight: 800;
  }
  .footer {
    margin-top: 32px;
    padding-top: 16px;
    border-top: 1px solid #e2e8f0;
    font-size: 11px;
    color: #64748b;
    line-height: 1.6;
  }
  .pill {
    display: inline-block;
    padding: 2px 8px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    background: #ecfdf5;
    color: #047857;
    margin-left: 6px;
  }
  .actions {
    display: flex; gap: 8px; justify-content: center;
    margin: 0 0 24px;
  }
  .actions button {
    background: #0b1f3a;
    color: #ffffff;
    border: 0;
    border-radius: 10px;
    padding: 10px 18px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
  }
  .actions button.secondary { background: #fbbf24; color: #0b1f3a; }
  @media print {
    body { background: #ffffff; }
    .actions { display: none; }
    .page { margin: 0; border: 0; box-shadow: none; padding: 24px 28px; }
  }
</style>
</head>
<body>
  <div class="actions">
    <button class="secondary" onclick="window.print()">Save as PDF</button>
    <button onclick="window.close()">Close</button>
  </div>

  <div class="page">

    <div class="header">
      <div>
        <div class="brand">
          <span class="brand-mark">F</span>
          <div>
            <div class="brand-name">Flytt<span>Go</span></div>
            <div class="brand-tag">Global Relocation Marketplace</div>
          </div>
        </div>
      </div>
      <div class="invoice-meta">
        <div class="invoice-no">${safe(invoiceNumber)}</div>
        <div>Issued ${safe(issuedAt)}</div>
        <div>Booking ${safe(String(booking.id).slice(0, 8))}</div>
      </div>
    </div>

    <h1>Invoice<span class="pill">${safe(String(booking.payment_status ?? 'pending'))}</span></h1>

    <div class="row">
      <div class="card">
        <h2>Bill to</h2>
        <strong>${safe(booking.customer_name ?? booking.contact_name ?? 'Customer')}</strong><br/>
        ${booking.contact_email ? safe(String(booking.contact_email)) + '<br/>' : ''}
        ${booking.contact_phone ? safe(String(booking.contact_phone)) : ''}
      </div>
      <div class="card">
        <h2>Marketplace operator</h2>
        <strong>FlyttGo Technologies Group</strong><br/>
        Norway · EEA<br/>
        Coordination layer · not a motor carrier
      </div>
    </div>

    <div class="row">
      <div class="card">
        <h2>Pickup</h2>
        ${safe(String(booking.pickup_address ?? booking.from_address ?? '—'))}
      </div>
      <div class="card">
        <h2>Drop-off</h2>
        ${safe(String(booking.dropoff_address ?? booking.to_address ?? '—'))}
      </div>
    </div>

    <div class="row">
      <div class="card">
        <h2>Move date</h2>
        ${safe(fmtDate(String(booking.move_date ?? booking.scheduled_at ?? '')))}
      </div>
      <div class="card">
        <h2>Vehicle</h2>
        ${safe(String(booking.van_type ?? booking.vehicle_type ?? '—'))}
      </div>
    </div>

    <h2>Items</h2>
    <table>
      <thead>
        <tr>
          <th>Description</th>
          <th class="amount">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${
          items.length === 0
            ? `<tr><td colspan="2" style="text-align:center;color:#94a3b8;padding:18px 0;">No itemised charges on this booking.</td></tr>`
            : items.map(it => `
              <tr>
                <td>
                  <strong>${safe(it.label)}</strong>
                  ${it.detail ? `<div style="color:#64748b;font-size:11px;margin-top:2px;">${safe(it.detail)}</div>` : ''}
                </td>
                <td class="amount">${safe(fmtMoney(it.amount, currency))}</td>
              </tr>
            `).join('')
        }
      </tbody>
    </table>

    <div class="totals">
      ${subtotal > 0 ? `
      <div class="totals-line">
        <span>Subtotal</span>
        <span>${safe(fmtMoney(subtotal, currency))}</span>
      </div>` : ''}
      ${deposit > 0 ? `
      <div class="totals-line">
        <span>Deposit (online)</span>
        <span>${safe(fmtMoney(deposit, currency))}</span>
      </div>` : ''}
      ${cashDue > 0 ? `
      <div class="totals-line">
        <span>Cash due to driver</span>
        <span>${safe(fmtMoney(cashDue, currency))}</span>
      </div>` : ''}
      <div class="totals-line grand">
        <span>Total</span>
        <span>${safe(fmtMoney(total, currency))}</span>
      </div>
    </div>

    <div class="footer">
      <strong>Coordination disclosure.</strong> FlyttGo Global Logistics
      &amp; Relocation Marketplace operates as a digital coordination
      platform. Service providers are responsible for compliance with
      their national licensing, taxation, insurance, and regulatory
      requirements. Funds are held in escrow until both parties
      confirm delivery.
      <br/><br/>
      Questions? Reply to your booking confirmation email or visit
      <strong>flyttgo.us/help</strong>.
    </div>
  </div>

  <script>
    /* Auto-open the print dialog one tick after load so the user
     * can save as PDF immediately. The visible "Save as PDF" button
     * is the manual fallback. */
    setTimeout(function () { try { window.print(); } catch (e) {} }, 250);
  </script>
</body>
</html>`;
}

/**
 * Open a print-styled invoice in a new tab. The browser's native
 * print dialog handles the "Save as PDF" step. No library deps.
 *
 * Returns true on success; false when the popup was blocked
 * (caller can show a message asking the user to allow popups).
 */
export function openBookingInvoice(input: BookingInvoiceInput): boolean {
  if (typeof window === 'undefined') return false;
  const html = invoiceHtml(input);
  const win = window.open('', '_blank', 'noopener,noreferrer,width=920,height=1080');
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  return true;
}
