import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { FOCUS_RING } from '../ds';
import {
  listPendingAdminEditsForCustomer,
  customerApproveEdit,
  customerDeclineEdit,
} from '../../services/adminBookings';
import type { BookingRow } from '../../services/admin';

type EditField = string;

const FIELD_LABELS: Record<EditField, string> = {
  pickup_address:   'Pickup address',
  pickup_city:      'Pickup city',
  pickup_postcode:  'Pickup postcode',
  dropoff_address:  'Drop-off address',
  dropoff_city:     'Drop-off city',
  dropoff_postcode: 'Drop-off postcode',
  move_date:        'Move date',
  move_time:        'Move time',
  van_type:         'Van size',
  helpers:          'Helpers',
  customer_notes:   'Notes',
  price_estimate:   'Quoted price',
};

/**
 * Pending-admin-edits banner — rendered on the customer dashboard.
 *
 * Polls the bookings list for any rows where an admin has staged an
 * edit awaiting customer approval. Opens a side-by-side diff modal
 * on click; approve calls the approve_pending_admin_edit RPC,
 * decline calls decline_pending_admin_edit. Both close the modal
 * and invalidate the parent query so the banner clears.
 */
export default function PendingAdminEditBanner({ customerId }: { customerId: string }) {
  const qc = useQueryClient();
  const [openBookingId, setOpenBookingId] = useState<string | null>(null);

  const { data: pending = [] } = useQuery<BookingRow[]>({
    queryKey: ['bookings', 'pending-admin-edits', customerId],
    queryFn:  () => listPendingAdminEditsForCustomer(customerId),
    /* Poll every 30s — the admin edit might land while the customer
     * is sitting on the dashboard. */
    refetchInterval: 30_000,
    enabled: !!customerId,
  });

  if (pending.length === 0) return null;
  const open = pending.find(b => b.id === openBookingId) ?? null;

  return (
    <>
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-4">
        <div className="bg-amber-100 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0">
          <AlertCircle className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-amber-900">
            {pending.length === 1
              ? 'Your admin requested a change to your booking'
              : `${pending.length} bookings have admin-requested changes`}
          </p>
          <p className="text-sm text-amber-800 mt-0.5">
            Review the proposed edits and approve or decline. The change
            doesn't take effect until you confirm.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {pending.map(b => (
              <button
                key={b.id}
                onClick={() => setOpenBookingId(b.id)}
                className={`bg-amber-700 hover:bg-amber-800 text-white text-xs font-bold px-3 py-1.5 rounded-lg ${FOCUS_RING}`}
              >
                Review #{b.id.slice(0, 8).toUpperCase()} →
              </button>
            ))}
          </div>
        </div>
      </div>

      {open && (
        <DiffModal
          booking={open}
          onClose={() => setOpenBookingId(null)}
          onResolved={() => {
            setOpenBookingId(null);
            void qc.invalidateQueries({ queryKey: ['bookings', 'pending-admin-edits', customerId] });
            void qc.invalidateQueries({ queryKey: ['bookings', 'customer', customerId] });
          }}
        />
      )}
    </>
  );
}

function DiffModal({
  booking, onClose, onResolved,
}: {
  booking: BookingRow; onClose: () => void; onResolved: () => void;
}) {
  const [busy, setBusy] = useState<'approve' | 'decline' | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  /* The pending_admin_edits jsonb is a partial map of (column ->
   * new value). Pair each entry with the live current value so the
   * customer sees a side-by-side diff. */
  const edits = (booking.pending_admin_edits ?? {}) as Record<EditField, string | number | null>;
  const rows  = Object.entries(edits)
    .filter(([k]) => k in FIELD_LABELS)
    .map(([k, v]) => ({
      field:    k,
      label:    FIELD_LABELS[k] ?? k,
      current:  formatLive(booking, k),
      proposed: v == null ? '' : String(v),
    }));

  async function approve() {
    setBusy('approve');
    try {
      await customerApproveEdit(booking.id);
      toast.success('Changes approved');
      onResolved();
    } catch (e) {
      toast.error('Approval failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(null); }
  }

  async function decline() {
    setBusy('decline');
    try {
      await customerDeclineEdit(booking.id);
      toast.message('Changes declined');
      onResolved();
    } catch (e) {
      toast.error('Decline failed', { description: e instanceof Error ? e.message : '' });
    } finally { setBusy(null); }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-bold text-slate-900">Review admin-requested changes</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-xs text-slate-500 mb-4">
            Booking #{booking.id.slice(0, 8).toUpperCase()} — {rows.length} field{rows.length === 1 ? '' : 's'} changed
          </p>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="grid grid-cols-3 bg-slate-50 text-xs uppercase tracking-wider text-slate-500 px-4 py-2 font-semibold">
              <div>Field</div>
              <div>Current</div>
              <div className="text-emerald-600">Proposed</div>
            </div>
            {rows.map(r => (
              <div key={r.field} className="grid grid-cols-3 px-4 py-3 border-t border-slate-100 text-sm">
                <div className="font-semibold text-slate-700">{r.label}</div>
                <div className="text-slate-500 line-through truncate">{r.current || '—'}</div>
                <div className="text-emerald-700 font-semibold truncate">{r.proposed || '—'}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button onClick={decline} disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-60">
            {busy === 'decline' ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
            Decline
          </button>
          <button onClick={approve} disabled={!!busy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-60">
            {busy === 'approve' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            Approve changes
          </button>
        </div>
      </div>
    </div>
  );
}

function formatLive(b: BookingRow, key: string): string {
  const v = (b as unknown as Record<string, unknown>)[key];
  if (v == null) return '';
  return String(v);
}
