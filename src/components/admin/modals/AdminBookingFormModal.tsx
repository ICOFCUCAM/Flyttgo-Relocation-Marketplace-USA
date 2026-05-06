import { useState, useEffect } from 'react';
import { X, Loader2, Mail, Save } from 'lucide-react';
import { toast } from 'sonner';
import { INPUT_FOCUS, FOCUS_RING } from '../../ds';
import {
  createBookingForCustomer,
  requestBookingEdit,
  type AdminCreateBookingInput,
  type AdminPendingEditPatch,
} from '../../../services/adminBookings';
import type { BookingRow } from '../../../services/admin';

/**
 * Combined create + edit modal for admin booking management.
 *
 *   mode="create"  — admin enters full customer + booking details,
 *                    inserts the row with payment_status='pending'
 *                    and triggers the payment-link email.
 *   mode="edit"    — admin edits an existing row; the change stages
 *                    into pending_admin_edits awaiting customer
 *                    approval (no live columns mutated).
 *
 * The form is intentionally lean: address autocomplete + price
 * recompute live elsewhere (BookingFlow). For an admin-created
 * booking the price is entered manually so ops can match a quote
 * they negotiated outside the platform.
 */
export default function AdminBookingFormModal({
  mode,
  booking,
  adminUserId,
  onClose,
  onSuccess,
}: {
  mode:        'create' | 'edit';
  booking?:    BookingRow;
  adminUserId: string;
  onClose:     () => void;
  onSuccess:   () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  /* Initialise from the booking when editing; blank when creating. */
  const [form, setForm] = useState({
    customerId:     booking?.customer_id    ?? '',
    customerEmail:  booking?.customer_email ?? '',
    customerName:   booking?.customer_name  ?? '',
    customerPhone:  booking?.customer_phone ?? '',
    pickupAddress:  booking?.pickup_address  ?? '',
    pickupCity:     booking?.pickup_city     ?? '',
    pickupPostcode: booking?.pickup_postcode ?? '',
    dropoffAddress: booking?.dropoff_address  ?? '',
    dropoffCity:    booking?.dropoff_city     ?? '',
    dropoffPostcode:booking?.dropoff_postcode ?? '',
    vanType:        booking?.van_type ?? 'medium',
    helpers:        booking?.helpers  ?? 1,
    moveDate:       booking?.move_date ?? '',
    moveTime:       booking?.move_time ?? '',
    notes:          booking?.customer_notes ?? '',
    priceTotal:     Number(booking?.price_estimate ?? 0),
    /* booking_country is read off the row when editing; we store the
     * shopfront country only at create time. */
    country:        'us',
  });

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      if (mode === 'create') {
        if (!form.customerId || !form.customerEmail) {
          throw new Error('Customer id + email are required');
        }
        const input: AdminCreateBookingInput = {
          customer: {
            id:    form.customerId,
            email: form.customerEmail,
            name:  form.customerName  || form.customerEmail,
            phone: form.customerPhone || '',
          },
          pickup: {
            address: form.pickupAddress, city: form.pickupCity, postcode: form.pickupPostcode,
            lat: null, lng: null,
          },
          dropoff: {
            address: form.dropoffAddress, city: form.dropoffCity, postcode: form.dropoffPostcode,
            lat: null, lng: null,
          },
          vanType:    form.vanType,
          helpers:    Number(form.helpers),
          moveDate:   form.moveDate || null,
          moveTime:   form.moveTime || null,
          notes:      form.notes,
          priceTotal: Number(form.priceTotal),
          country:    form.country,
        };
        await createBookingForCustomer(input, adminUserId);
        toast.success('Booking created. Payment link emailed to customer.');
      } else {
        if (!booking) throw new Error('No booking to edit');
        /* Build a patch of only the changed whitelisted fields so
         * we don't blow up the pending_admin_edits jsonb with no-ops. */
        const patch: AdminPendingEditPatch = {};
        if (form.pickupAddress  !== booking.pickup_address)   patch.pickup_address   = form.pickupAddress;
        if (form.pickupCity     !== booking.pickup_city)      patch.pickup_city      = form.pickupCity;
        if (form.pickupPostcode !== booking.pickup_postcode)  patch.pickup_postcode  = form.pickupPostcode;
        if (form.dropoffAddress !== booking.dropoff_address)  patch.dropoff_address  = form.dropoffAddress;
        if (form.dropoffCity    !== booking.dropoff_city)     patch.dropoff_city     = form.dropoffCity;
        if (form.dropoffPostcode!== booking.dropoff_postcode) patch.dropoff_postcode = form.dropoffPostcode;
        if (form.moveDate       !== booking.move_date)        patch.move_date        = form.moveDate;
        if (form.moveTime       !== booking.move_time)        patch.move_time        = form.moveTime;
        if (form.vanType        !== booking.van_type)         patch.van_type         = form.vanType;
        if (Number(form.helpers)!== booking.helpers)          patch.helpers          = Number(form.helpers);
        if (form.notes          !== booking.customer_notes)   patch.customer_notes   = form.notes;
        if (Number(form.priceTotal) !== Number(booking.price_estimate ?? 0)) {
          patch.price_estimate = Number(form.priceTotal);
        }
        if (Object.keys(patch).length === 0) {
          throw new Error('No changes to send');
        }
        await requestBookingEdit(booking.id, adminUserId, patch);
        toast.success('Edit sent to customer for confirmation.');
      }
      onSuccess();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <form onSubmit={handleSubmit}
            className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
          <h2 className="font-bold text-lg text-slate-900">
            {mode === 'create' ? 'Create booking on behalf of customer' : 'Edit booking — customer approval required'}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {mode === 'create' && (
            <Group title="Customer">
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Customer user id (UUID) *" value={form.customerId}
                  onChange={v => setForm(f => ({ ...f, customerId: v }))} placeholder="auth.users.id" />
                <Field label="Email *"         value={form.customerEmail} type="email"
                  onChange={v => setForm(f => ({ ...f, customerEmail: v }))} />
                <Field label="Full name"       value={form.customerName}
                  onChange={v => setForm(f => ({ ...f, customerName: v }))} />
                <Field label="Phone"           value={form.customerPhone}
                  onChange={v => setForm(f => ({ ...f, customerPhone: v }))} />
              </div>
            </Group>
          )}

          <Group title="Pickup">
            <Field label="Address" value={form.pickupAddress}
              onChange={v => setForm(f => ({ ...f, pickupAddress: v }))} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="City"     value={form.pickupCity}
                onChange={v => setForm(f => ({ ...f, pickupCity: v }))} />
              <Field label="Postcode" value={form.pickupPostcode}
                onChange={v => setForm(f => ({ ...f, pickupPostcode: v }))} />
            </div>
          </Group>

          <Group title="Drop-off">
            <Field label="Address" value={form.dropoffAddress}
              onChange={v => setForm(f => ({ ...f, dropoffAddress: v }))} />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field label="City"     value={form.dropoffCity}
                onChange={v => setForm(f => ({ ...f, dropoffCity: v }))} />
              <Field label="Postcode" value={form.dropoffPostcode}
                onChange={v => setForm(f => ({ ...f, dropoffPostcode: v }))} />
            </div>
          </Group>

          <Group title="Service">
            <div className="grid sm:grid-cols-3 gap-3">
              <SelectField label="Van size" value={form.vanType}
                onChange={v => setForm(f => ({ ...f, vanType: v }))}
                options={['small', 'medium', 'large', 'xl', 'truck']} />
              <Field type="number" label="Helpers" value={String(form.helpers)}
                onChange={v => setForm(f => ({ ...f, helpers: Number(v) }))} />
              <Field type="number" label="Quoted price (local)" value={String(form.priceTotal)}
                onChange={v => setForm(f => ({ ...f, priceTotal: Number(v) }))} />
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field type="date" label="Move date" value={form.moveDate}
                onChange={v => setForm(f => ({ ...f, moveDate: v }))} />
              <Field type="time" label="Move time" value={form.moveTime}
                onChange={v => setForm(f => ({ ...f, moveTime: v }))} />
            </div>
            <Field label="Notes for the driver" value={form.notes}
              onChange={v => setForm(f => ({ ...f, notes: v }))} />
          </Group>

          {error && <p className="text-red-600 text-sm">{error}</p>}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className={`px-4 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 hover:bg-slate-50 ${FOCUS_RING}`}>
            Cancel
          </button>
          <button type="submit" disabled={submitting}
            className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold bg-[#0B2E59] hover:bg-[#0F3558] text-white disabled:opacity-60 ${FOCUS_RING}`}>
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" />
                       : mode === 'create' ? <Mail className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {mode === 'create' ? 'Create + email payment link' : 'Send edit for customer approval'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function Field({
  label, value, onChange, type = 'text', placeholder,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`} />
    </label>
  );
}

function SelectField({
  label, value, onChange, options,
}: { label: string; value: string; onChange: (v: string) => void; options: string[] }) {
  return (
    <label className="block">
      <span className="block text-xs text-slate-500 mb-1">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm ${INPUT_FOCUS}`}>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
