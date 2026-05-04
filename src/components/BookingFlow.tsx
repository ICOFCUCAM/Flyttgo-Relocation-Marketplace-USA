import { useTranslation } from 'react-i18next';
import { recommendVan } from '../lib/constants';
import { formatAddress } from '../utils/formatAddress';
import { useBookingFlowState } from '../hooks/useBookingFlowState';
import { usePricingCalculation } from '../hooks/usePricingCalculation';
import { createBookingWithEscrow } from '../services/bookings';
import { TOTAL_STEPS, type AddressErrors } from './booking/types';
import type { CountryCode } from './GlobalAddressAutocomplete';
import { ProgressBar }   from './booking/ProgressBar';
import { NavButtons }    from './booking/NavButtons';
import { SignInBanner }  from './booking/SignInBanner';
import { AddressesStep }      from './booking/steps/AddressesStep';
import { MoveDetailsStep }    from './booking/steps/MoveDetailsStep';
import { InventoryStep }      from './booking/steps/InventoryStep';
import { ScheduleStep }       from './booking/steps/ScheduleStep';
import { ContactSummaryStep } from './booking/steps/ContactSummaryStep';
import { ConfirmStep }        from './booking/steps/ConfirmStep';

/**
 * BookingFlow — orchestration shell for the 6-step booking funnel.
 *
 * Form state lives in useBookingFlowState; server + client pricing
 * lives in usePricingCalculation; the actual insert is in
 * services/bookings.createBookingWithEscrow. The component itself only
 * sequences steps, validates between them, and submits.
 */
export default function BookingFlow() {
  const s = useBookingFlowState();
  const { t } = useTranslation();

  const pricing = usePricingCalculation({
    pickupAddress:      s.pickupAddress,
    dropoffAddress:     s.dropoffAddress,
    vanType:            s.vanType,
    helpers:            s.helpers,
    additionalServices: s.additionalServices,
    estimatedHours:     s.estimatedHours,
  });

  function validateAddresses(): boolean {
    const errs: AddressErrors = {};
    if (!s.pickupAddress.formatted && !s.pickupAddress.street_name) {
      errs.pickup = 'Pickup address is required';
    } else if (s.pickupAddress.postcode && !/^\d{4}$/.test(s.pickupAddress.postcode)) {
      errs.pickup = 'US postcode must be 4 digits';
    } else if (!s.pickupAddress.city && s.pickupAddress.street_name) {
      errs.pickup = 'City is required';
    }
    if (!s.dropoffAddress.formatted && !s.dropoffAddress.street_name) {
      errs.dropoff = 'Delivery address is required';
    } else if (s.dropoffAddress.postcode && !/^\d{4}$/.test(s.dropoffAddress.postcode)) {
      errs.dropoff = 'US postcode must be 4 digits';
    } else if (!s.dropoffAddress.city && s.dropoffAddress.street_name) {
      errs.dropoff = 'City is required';
    }
    s.setAddressErrors(errs);
    return Object.keys(errs).length === 0;
  }

  function goNext() {
    if (s.step === 1 && !validateAddresses()) return;
    if (s.step === 2 && !s.moveType) { s.setError('Please select a move type'); return; }
    if (s.step === 4 && !s.moveDate) { s.setError('Please select a move date'); return; }
    s.setError('');
    s.setStep(Math.min(s.step + 1, TOTAL_STEPS));
    window.scrollTo(0, 0);
  }

  function goBack() {
    s.setError('');
    s.setStep(Math.max(s.step - 1, 1));
    window.scrollTo(0, 0);
  }

  function openSignIn() {
    s.setAuthMode('signin');
    s.setShowAuthModal(true);
  }

  async function handleSubmit() {
    if (!s.legalAccepted) {
      s.setError('Please accept all legal requirements before proceeding.');
      return;
    }
    if (!s.user) {
      openSignIn();
      s.setError('Please sign in to complete your booking.');
      return;
    }
    if (!s.name.trim() || !s.phone.trim() || !s.email.trim()) {
      s.setError('Please fill in your name, phone, and email before submitting.');
      return;
    }
    if (!s.moveType) {
      s.setError('Please choose a move type before submitting.');
      return;
    }
    if (!s.pickupAddress?.formatted || !s.dropoffAddress?.formatted) {
      s.setError('Please set both pickup and drop-off addresses.');
      return;
    }
    if (!pricing.pricingReady) {
      s.setError('Calculating price… please wait a moment and try again.');
      return;
    }

    s.setSaving(true);
    s.setError('');

    try {

      await createBookingWithEscrow({
        customer: { id: s.user.id, email: s.email, name: s.name, phone: s.phone },
        pickup: {
          address:  s.pickupAddress.formatted || formatAddress(s.pickupAddress).oneLine,
          postcode: s.pickupAddress.postcode,
          city:     s.pickupAddress.city,
          lat:      s.pickupAddress.lat,
          lng:      s.pickupAddress.lng,
        },
        dropoff: {
          address:  s.dropoffAddress.formatted || formatAddress(s.dropoffAddress).oneLine,
          postcode: s.dropoffAddress.postcode,
          city:     s.dropoffAddress.city,
          lat:      s.dropoffAddress.lat,
          lng:      s.dropoffAddress.lng,
        },
        moveType:           s.moveType,
        vanType:            s.vanType || recommendVan(0),
        helpers:            s.helpers,
        additionalServices: s.additionalServices,
        inventory:          s.inventory,
        moveDate:           s.moveDate || null,
        moveTime:           s.moveTime || null,
        notes:              s.notes,
        distanceKm:         pricing.distanceKm,
        estimatedHours:     s.estimatedHours,
        priceTotal:         pricing.priceTotal,
        country:            s.country ?? null,
      });

      s.setPage('payment');
    } catch (err: unknown) {
      console.error('[BookingFlow] Booking submission failed:', err, {
        pickupAddress:  s.pickupAddress,
        dropoffAddress: s.dropoffAddress,
        distanceKm:     pricing.distanceKm,
        priceTotal:     pricing.priceTotal,
        vanType:        s.vanType,
        helpers:        s.helpers,
        estimatedHours: s.estimatedHours,
      });
      /* Supabase / fetch error shapes can carry message / error_description /
       * details — pull whichever the upstream surfaced into one string. */
      const e = err as { message?: string; error_description?: string; details?: string };
      const message =
        e?.message || e?.error_description || e?.details || 'Booking failed. Please try again.';
      s.setError(message);
      if (typeof window !== 'undefined') {
        window.scrollTo({ top: 0, left: 0, behavior: 'smooth' });
      }
    }

    s.setSaving(false);
  }

  const stepLabels = [
    t('booking.stepAddresses'),
    t('booking.stepDetails'),
    t('booking.stepInventory'),
    t('booking.stepSchedule'),
    t('booking.stepSummary'),
    t('booking.stepConfirm'),
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-gradient-to-r from-ink-900 to-ink-800 text-white py-10">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-extrabold mb-2">{t('booking.heroTitle')}</h1>
          <p className="text-white/70">{t('booking.heroSubtitle')}</p>
          <p className="text-brand-300 text-xs font-mono uppercase tracking-wider mt-3">
            Step {s.step} of {TOTAL_STEPS} · {stepLabels[s.step - 1]}
          </p>
        </div>
      </div>

      <ProgressBar step={s.step} stepLabels={stepLabels} onJumpTo={s.setStep} />

      <div className="max-w-3xl mx-auto px-4 py-8">
        {!s.user && <SignInBanner onSignIn={openSignIn} />}

        {s.error && (
          <div role="alert" className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm flex items-center gap-2">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {s.error}
          </div>
        )}

        {s.step === 1 && (
          <AddressesStep
            country={s.country as CountryCode}
            countryLabel={s.countryLabel}
            pickupAddress={s.pickupAddress}
            dropoffAddress={s.dropoffAddress}
            setPickupAddress={s.setPickupAddress}
            setDropoffAddress={s.setDropoffAddress}
            addressErrors={s.addressErrors}
            setAddressErrors={s.setAddressErrors}
            clientRoute={pricing.clientRoute}
            serverPrice={pricing.serverPrice}
            distanceKm={pricing.distanceKm}
            durationMin={pricing.durationMin}
            routingProvider={pricing.routingProvider}
          />
        )}
        {s.step === 2 && (
          <MoveDetailsStep
            moveType={s.moveType}
            setMoveType={s.setMoveType}
            vanType={s.vanType}
            setVanType={s.setVanType}
            helpers={s.helpers}
            setHelpers={s.setHelpers}
            setError={s.setError}
          />
        )}
        {s.step === 3 && (
          <InventoryStep
            inventory={s.inventory}
            setInventory={s.setInventory}
            setVanType={s.setVanType}
          />
        )}
        {s.step === 4 && (
          <ScheduleStep
            moveDate={s.moveDate}
            setMoveDate={s.setMoveDate}
            moveTime={s.moveTime}
            setMoveTime={s.setMoveTime}
            estimatedHours={s.estimatedHours}
            setEstimatedHours={s.setEstimatedHours}
            setError={s.setError}
          />
        )}
        {s.step === 5 && (
          <ContactSummaryStep
            name={s.name} setName={s.setName}
            phone={s.phone} setPhone={s.setPhone}
            email={s.email} setEmail={s.setEmail}
            notes={s.notes} setNotes={s.setNotes}
            pickupAddress={s.pickupAddress}
            dropoffAddress={s.dropoffAddress}
            vanType={s.vanType}
            helpers={s.helpers}
            moveDate={s.moveDate}
            moveTime={s.moveTime}
            estimatedHours={s.estimatedHours}
            distanceKm={pricing.distanceKm}
            pricingReady={pricing.pricingReady}
            basePrice={pricing.basePrice}
            distanceCharge={pricing.distanceCharge}
            helpersCharge={pricing.helpersCharge}
            vatAmount={pricing.vatAmount}
            priceTotal={pricing.priceTotal}
            serverPrice={pricing.serverPrice}
          />
        )}
        {s.step === 6 && (
          <ConfirmStep
            pickupAddress={s.pickupAddress}
            dropoffAddress={s.dropoffAddress}
            priceTotal={pricing.priceTotal}
            saving={s.saving}
            legalAccepted={s.legalAccepted}
            pricingReady={pricing.pricingReady}
            setLegalAccepted={s.setLegalAccepted}
            onSubmit={handleSubmit}
            error={s.error}
            user={s.user}
            onSignIn={openSignIn}
          />
        )}

        <NavButtons step={s.step} onBack={goBack} onNext={goNext} />
      </div>
    </div>
  );
}
