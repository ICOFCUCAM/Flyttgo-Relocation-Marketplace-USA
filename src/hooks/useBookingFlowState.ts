import { useState } from 'react';
import { useAuth } from '../lib/auth';
import { useApp } from '../lib/store';
import {
  COUNTRY_LABEL, emptyAddress,
  type StructuredAddress, type AddressErrors,
} from '../components/booking/types';

/**
 * useBookingFlowState — every form-field slot + setter for BookingFlow
 *
 * The 1k-line BookingFlow originally held ~17 useState slots inline.
 * Pulling them here keeps the component file readable and gives each
 * step a stable shape to consume.
 *
 * Pre-fills from the app store's `bookingData`, which the home page
 * Booking Widget populates so customers don't have to re-enter the
 * pickup address after clicking "Book Now".
 */
export function useBookingFlowState() {
  const { profile, user } = useAuth();
  const { bookingData, setShowAuthModal, setAuthMode, setPage } = useApp();

  const country = (bookingData.country ?? 'us') as string;
  const countryLabel = COUNTRY_LABEL[country] ?? 'USA';

  const [step, setStep] = useState(1);

  /* ── Structured addresses ───────────────────────────── */
  const [pickupAddress, setPickupAddress] = useState<StructuredAddress>(
    () => (bookingData.pickupAddressData as StructuredAddress | undefined) ?? emptyAddress(countryLabel),
  );
  const [dropoffAddress, setDropoffAddress] = useState<StructuredAddress>(
    () => (bookingData.dropoffAddressData as StructuredAddress | undefined) ?? emptyAddress(countryLabel),
  );

  /* ── Move details ───────────────────────────────────── */
  const [moveType, setMoveType]                     = useState<string>(bookingData.moveType || '');
  const [propertyType, setPropertyType]             = useState<string>(bookingData.propertyType || '');
  const [vanType, setVanType]                       = useState<string>(bookingData.vanType || '');
  const [helpers, setHelpers]                       = useState<number>(bookingData.helpers || 0);
  const [inventory, setInventory]                   = useState<Record<string, number>>(bookingData.inventory || {});
  const [additionalServices, setAdditionalServices] = useState<string[]>(bookingData.additionalServices || []);

  /* ── Schedule + contact ─────────────────────────────── */
  const [moveDate, setMoveDate] = useState<string>(bookingData.moveDate || '');
  const [moveTime, setMoveTime] = useState<string>(bookingData.moveTime || '09:00');
  const [name, setName]         = useState<string>(
    profile?.first_name ? `${profile.first_name} ${profile.last_name || ''}`.trim() : '',
  );
  const [phone, setPhone]       = useState<string>(profile?.phone || '');
  const [email, setEmail]       = useState<string>(user?.email || '');
  const [notes, setNotes]       = useState<string>('');

  /* ── Pricing inputs ─────────────────────────────────── */
  const [estimatedHours, setEstimatedHours] = useState<number>(2);

  /* ── Validation + UX ────────────────────────────────── */
  const [addressErrors, setAddressErrors] = useState<AddressErrors>({});
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState('');

  return {
    /* derived */
    user,
    profile,
    country,
    countryLabel,
    setShowAuthModal,
    setAuthMode,
    setPage,

    /* step */
    step, setStep,

    /* addresses */
    pickupAddress,  setPickupAddress,
    dropoffAddress, setDropoffAddress,

    /* move */
    moveType, setMoveType,
    propertyType, setPropertyType,
    vanType, setVanType,
    helpers, setHelpers,
    inventory, setInventory,
    additionalServices, setAdditionalServices,

    /* schedule + contact */
    moveDate, setMoveDate,
    moveTime, setMoveTime,
    name, setName,
    phone, setPhone,
    email, setEmail,
    notes, setNotes,

    /* pricing inputs */
    estimatedHours, setEstimatedHours,

    /* meta */
    addressErrors, setAddressErrors,
    legalAccepted, setLegalAccepted,
    saving, setSaving,
    error, setError,
  };
}

export type BookingFlowState = ReturnType<typeof useBookingFlowState>;
