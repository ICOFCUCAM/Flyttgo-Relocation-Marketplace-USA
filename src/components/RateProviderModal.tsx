import React, { useState, useEffect } from 'react';
import { Star, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '../lib/supabase';
import { submitProviderRating } from '../lib/provider-scoring-store';

/* ─────────────────────────────────────────────────────────────────
 * <RateProviderModal>
 *
 * Customer-facing rating sheet — shown on completed bookings via
 * MyBookings. Captures the five sub-scores the scoring engine
 * needs (punctuality / professionalism / communication / care of
 * items / estimate accuracy) plus an overall star rating and an
 * optional review text.
 *
 * Submission writes to public.provider_ratings; the DB trigger
 * `refresh_provider_scoring()` recomputes the provider's rank +
 * badges automatically. We never mutate provider state from the
 * client.
 *
 * The modal looks up drivers.user_id from the booking's driver_id
 * because provider_ratings.provider_user_id stores the auth.users
 * UUID, while bookings.driver_id stores the drivers.id row PK.
 * ───────────────────────────────────────────────────────────────── */

interface Props {
  bookingId:        string;
  driverRowId:      string;     // bookings.driver_id (drivers.id)
  customerUserId:   string;
  onClose:         (submitted: boolean) => void;
}

type Dim = 'punctuality' | 'professionalism' | 'communication' | 'careOfItems' | 'estimateAccuracy';

const DIM_LABELS: Record<Dim, string> = {
  punctuality:      'Punctuality',
  professionalism:  'Professionalism',
  communication:    'Communication',
  careOfItems:      'Care of items',
  estimateAccuracy: 'Estimate accuracy',
};

export default function RateProviderModal({
  bookingId, driverRowId, customerUserId, onClose,
}: Props) {
  const [providerUserId, setProviderUserId] = useState<string | null>(null);
  const [overall,         setOverall]         = useState(5);
  const [scores,          setScores]          = useState<Record<Dim, number>>({
    punctuality: 5, professionalism: 5, communication: 5, careOfItems: 5, estimateAccuracy: 5,
  });
  const [review,    setReview]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,     setError]     = useState('');

  /* Translate drivers.id → drivers.user_id once on mount. */
  useEffect(() => {
    let cancelled = false;
    supabase
      .from('drivers')
      .select('user_id')
      .eq('id', driverRowId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !data) {
          setError('Could not load driver record. Please try again later.');
          return;
        }
        setProviderUserId(data.user_id ?? null);
      });
    return () => { cancelled = true; };
  }, [driverRowId]);

  async function handleSubmit() {
    if (!providerUserId) return;
    setSubmitting(true);
    setError('');
    try {
      await submitProviderRating({
        bookingId,
        providerUserId,
        customerUserId,
        punctuality:      scores.punctuality,
        professionalism:  scores.professionalism,
        communication:    scores.communication,
        careOfItems:      scores.careOfItems,
        estimateAccuracy: scores.estimateAccuracy,
        overall,
        reviewText:       review.trim() || undefined,
      });
      toast.success('Thank you!', { description: 'Your rating helps the next customer choose well.' });
      onClose(true);
    } catch (err: any) {
      setError(err?.message ?? 'Could not submit rating.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white">
          <h2 className="text-lg font-bold text-gray-900">Rate this move</h2>
          <button
            onClick={() => onClose(false)}
            className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Overall stars */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Overall</p>
            <StarPicker value={overall} onChange={setOverall} size={28} />
          </div>

          {/* Per-dimension sliders. 1–5 scale matches the
           * provider_ratings CHECK constraint. */}
          <div className="space-y-3">
            {(Object.keys(DIM_LABELS) as Dim[]).map(dim => (
              <div key={dim} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-700">{DIM_LABELS[dim]}</span>
                <StarPicker
                  value={scores[dim]}
                  onChange={(v) => setScores(s => ({ ...s, [dim]: v }))}
                  size={18}
                />
              </div>
            ))}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Anything you'd like to add? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              value={review}
              onChange={(e) => setReview(e.target.value)}
              maxLength={1000}
              rows={3}
              placeholder="What stood out? Anything other customers should know?"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-500 focus:border-transparent outline-none transition resize-none"
            />
            <p className="text-[11px] text-gray-400 mt-1">{review.length} / 1000 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 text-sm">
              {error}
            </div>
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-end gap-2 sticky bottom-0 bg-white">
          <button
            onClick={() => onClose(false)}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !providerUserId}
            className="px-5 py-2 bg-emerald-600 text-white rounded-lg text-sm font-semibold hover:bg-emerald-700 disabled:opacity-60 transition"
          >
            {submitting ? 'Submitting…' : 'Submit rating'}
          </button>
        </div>
      </div>
    </div>
  );
}

function StarPicker({ value, onChange, size }: { value: number; onChange: (v: number) => void; size: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(n => {
        const active = n <= value;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`transition ${active ? 'text-amber-500' : 'text-gray-300 hover:text-amber-300'}`}
            aria-label={`${n} star${n === 1 ? '' : 's'}`}
          >
            <Star size={size} fill={active ? 'currentColor' : 'none'} />
          </button>
        );
      })}
    </div>
  );
}
