import { useEffect, useState } from 'react';
import { Loader2, Printer, X } from 'lucide-react';
import { fetchInvoiceForBooking } from '../service';
import type { InvoiceRow } from '../types';
import { FlyttGoLogo } from '../../components/brand';

/**
 * Booking invoice — printable view powered by v_invoice_lines.
 *
 * Pass a bookingId; the component fetches the invoice payload from
 * the SQL view (which auto-computes tax from booking_country) and
 * renders a regulator-grade single-page invoice. The same component
 * works as a modal (admin opens "View invoice" from a bookings row)
 * or as a standalone print page.
 */
export default function BookingInvoicePrintable({
  bookingId,
  onClose,
}: { bookingId: string; onClose?: () => void }) {
  const [row, setRow] = useState<InvoiceRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchInvoiceForBooking(bookingId)
      .then(d => { if (!cancelled) { setRow(d); setLoading(false); } })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [bookingId]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 flex items-center gap-3 text-slate-500">
          <Loader2 className="w-5 h-5 animate-spin" /> Loading invoice…
        </div>
      </div>
    );
  }

  if (!row) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-sm text-center">
          <p className="text-sm text-slate-700 mb-4">Invoice not found for this booking.</p>
          {onClose && <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-700 text-white text-sm">Close</button>}
        </div>
      </div>
    );
  }

  const total = Number(row.subtotal) + Number(row.tax_amount);

  return (
    <>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          #flyttgo-invoice, #flyttgo-invoice * { visibility: visible; }
          #flyttgo-invoice { position: absolute; left: 0; top: 0; width: 100%; }
          .no-print { display: none !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      <div className="fixed inset-0 bg-black/60 z-50 overflow-y-auto">
        <div className="no-print sticky top-0 z-10 bg-[#0b1f3a] text-white px-6 py-3 flex items-center justify-between">
          <p className="font-bold text-sm">Invoice · {row.booking_id.slice(0, 8).toUpperCase()}</p>
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="inline-flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-slate-900 px-4 py-1.5 rounded-lg text-xs font-bold">
              <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
            </button>
            {onClose && (
              <button onClick={onClose} className="text-white/70 hover:text-white p-2"><X className="w-4 h-4" /></button>
            )}
          </div>
        </div>

        <div id="flyttgo-invoice" className="max-w-3xl mx-auto bg-white text-slate-900 my-6 p-10 rounded-2xl shadow-xl print:my-0 print:shadow-none print:rounded-none">

          <header className="flex items-start justify-between border-b-2 border-slate-200 pb-6 mb-6">
            <div>
              <FlyttGoLogo subtitle="Global Relocation Marketplace" />
            </div>
            <div className="text-right">
              <p className="text-amber-700 text-xs font-bold uppercase tracking-[0.18em]">Invoice</p>
              <p className="font-mono text-sm font-extrabold text-slate-900 mt-1">#{row.booking_id.slice(0, 8).toUpperCase()}</p>
              <p className="text-xs text-slate-500 mt-1">Issued {new Date(row.invoice_date).toLocaleDateString()}</p>
              {row.move_date && <p className="text-xs text-slate-500">Move date {row.move_date}</p>}
            </div>
          </header>

          <section className="grid grid-cols-2 gap-6 mb-8">
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-1.5">Bill to</p>
              <p className="font-bold text-slate-900">{row.customer_name ?? '—'}</p>
              <p className="text-sm text-slate-600">{row.customer_email ?? ''}</p>
              <p className="text-sm text-slate-600">{row.customer_phone ?? ''}</p>
              {row.country && <p className="text-xs text-slate-500 font-mono uppercase mt-1">{row.country}</p>}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-1.5">Provider</p>
              <p className="font-bold text-slate-900">{row.provider_name ?? 'Pending dispatch'}</p>
              {row.provider_country && <p className="text-xs text-slate-500 font-mono uppercase mt-1">{row.provider_country}</p>}
            </div>
          </section>

          <section className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-2">Service</p>
            <table className="w-full text-sm border border-slate-200 rounded-lg overflow-hidden">
              <tbody>
                <Row label="Pickup"     value={[row.pickup_address, row.pickup_city, row.pickup_postcode].filter(Boolean).join(', ')} />
                <Row label="Drop-off"   value={[row.dropoff_address, row.dropoff_city, row.dropoff_postcode].filter(Boolean).join(', ')} />
                <Row label="Move type"  value={row.move_type ?? '—'} />
                <Row label="Vehicle"    value={[row.van_type, row.helpers != null ? `${row.helpers} helpers` : null].filter(Boolean).join(' · ') || '—'} />
                <Row label="Distance"   value={row.distance_km ? `${Number(row.distance_km).toFixed(1)} km` : '—'} />
                <Row label="Hours"      value={row.actual_hours ?? row.estimated_hours ? `${Number(row.actual_hours ?? row.estimated_hours).toFixed(1)}` : '—'} />
              </tbody>
            </table>
          </section>

          <section className="mb-8">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono mb-2">Totals</p>
            <table className="w-full text-sm tabular-nums">
              <tbody>
                <tr className="border-t border-slate-200"><td className="py-2 text-slate-600">Subtotal</td><td className="py-2 text-right">{Number(row.subtotal).toFixed(2)}</td></tr>
                <tr className="border-t border-slate-200"><td className="py-2 text-slate-600">Tax · <span className="font-mono text-xs">{row.tax_code}</span></td><td className="py-2 text-right">{Number(row.tax_amount).toFixed(2)}</td></tr>
                <tr className="border-t-2 border-slate-300 font-extrabold"><td className="py-2">Total due</td><td className="py-2 text-right">{total.toFixed(2)}</td></tr>
                <tr><td className="py-1 text-xs text-slate-500" colSpan={2}>Payment status: {row.payment_status ?? 'pending'}</td></tr>
              </tbody>
            </table>
          </section>

          <footer className="border-t border-slate-200 pt-4 text-[10px] text-slate-400 flex justify-between">
            <span>FlyttGo Global Logistics &amp; Relocation Marketplace</span>
            <span>Generated {new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC</span>
          </footer>
        </div>
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-b border-slate-100 last:border-b-0">
      <td className="py-2 px-3 text-xs uppercase tracking-wider text-slate-500 font-mono w-32">{label}</td>
      <td className="py-2 px-3 text-slate-700">{value || '—'}</td>
    </tr>
  );
}
