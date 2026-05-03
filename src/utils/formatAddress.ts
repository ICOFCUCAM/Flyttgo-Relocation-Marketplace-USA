/**
 * formatNorwegianAddress.ts
 *
 * Standard US address format:
 *   Street number + Street name (+ Unit)
 *   City, State ZIP
 *   USA
 *
 * Example:
 *   350 5th Ave
 *   New York, NY 10118
 *   USA
 *
 * Use this function everywhere addresses are displayed:
 *   - Booking summary
 *   - Driver dashboard
 *   - Admin panel
 *   - Invoice preview
 *   - Confirmation page
 *
 * Filename kept as `formatNorwegianAddress.ts` to avoid breaking existing
 * imports across the app — the export names below are the public API.
 */

export interface AddressInput {
  street_name?: string;
  house_number?: string;
  postcode?: string;
  city?: string;
  state?: string;
  country?: string;
  formatted?: string;
  pickup_street?: string;
  pickup_house_number?: string;
  pickup_postcode?: string;
  pickup_city?: string;
  pickup_state?: string;
  delivery_street?: string;
  delivery_house_number?: string;
  delivery_postcode?: string;
  delivery_city?: string;
  delivery_state?: string;
}

export interface FormattedAddress {
  line1: string;    // "350 5th Ave"
  line2: string;    // "New York, NY 10118"
  line3: string;    // "USA"
  full: string;     // "350 5th Ave, New York, NY 10118, USA"
  short: string;    // "350 5th Ave, New York"
  oneLine: string;  // "350 5th Ave, New York, NY 10118"
}

export function formatNorwegianAddress(
  address: AddressInput | string | null | undefined,
  prefix: 'pickup' | 'delivery' | '' = ''
): FormattedAddress {
  if (!address) {
    return {
      line1: 'Address not provided',
      line2: '',
      line3: 'USA',
      full: 'Address not provided, USA',
      short: 'Address not provided',
      oneLine: 'Address not provided',
    };
  }

  if (typeof address === 'string') {
    return {
      line1: address,
      line2: '',
      line3: 'USA',
      full: `${address}, USA`,
      short: address,
      oneLine: address,
    };
  }

  const p = prefix ? `${prefix}_` : '';

  const streetName =
    (address as any)[`${p}street_name`] ||
    (address as any)[`${p}street`] ||
    address.street_name ||
    '';

  const houseNumber =
    (address as any)[`${p}house_number`] ||
    address.house_number ||
    '';

  const postcode =
    (address as any)[`${p}postcode`] ||
    address.postcode ||
    '';

  const rawCity =
    (address as any)[`${p}city`] ||
    address.city ||
    '';

  const state =
    (address as any)[`${p}state`] ||
    address.state ||
    '';

  if (!streetName && !postcode && address.formatted) {
    return {
      line1: address.formatted,
      line2: '',
      line3: 'USA',
      full: `${address.formatted}, USA`,
      short: address.formatted,
      oneLine: address.formatted,
    };
  }

  const city = rawCity
    ? rawCity.charAt(0).toUpperCase() + rawCity.slice(1).toLowerCase()
    : '';

  // US convention: house number first, then street name (e.g. "350 5th Ave").
  const line1Parts = [houseNumber, streetName].filter(Boolean);
  const line1 = line1Parts.join(' ') || 'Address not provided';

  // line 2: "City, ST 10118"
  const stateZip = [state, postcode].filter(Boolean).join(' ');
  const line2 = [city, stateZip].filter(Boolean).join(', ');

  const line3 = 'USA';

  const full = [line1, line2, line3].filter(Boolean).join(', ');
  const short = [line1, city].filter(Boolean).join(', ');
  const oneLine = [line1, line2].filter(Boolean).join(', ');

  return { line1, line2, line3, full, short, oneLine };
}

export function formatAddressLines(
  address: AddressInput | string | null | undefined,
  prefix: 'pickup' | 'delivery' | '' = ''
): string[] {
  const f = formatNorwegianAddress(address, prefix);
  return [f.line1, f.line2, f.line3].filter(Boolean);
}

export interface AddressValidationResult {
  valid: boolean;
  errors: {
    street?: string;
    postcode?: string;
    city?: string;
    state?: string;
  };
}

export function validateNorwegianAddress(
  address: Partial<AddressInput> | null | undefined
): AddressValidationResult {
  const errors: AddressValidationResult['errors'] = {};

  if (!address) {
    return {
      valid: false,
      errors: {
        street: 'Street address is required',
        postcode: 'ZIP code is required',
        city: 'City is required',
        state: 'State is required',
      },
    };
  }

  const street = address.street_name || (address as any).pickup_street || '';
  const postcode = address.postcode || (address as any).pickup_postcode || '';
  const city = address.city || (address as any).pickup_city || '';
  const state = address.state || (address as any).pickup_state || '';

  if (!street || street.trim().length < 2) {
    errors.street = 'Street name is required';
  }

  if (!postcode) {
    errors.postcode = 'ZIP code is required';
  } else if (!/^\d{5}(-\d{4})?$/.test(postcode.trim())) {
    errors.postcode = 'ZIP code must be 5 digits (or 5+4)';
  }

  if (!city || city.trim().length < 2) {
    errors.city = 'City is required';
  }

  if (!state || state.trim().length < 2) {
    errors.state = 'State is required';
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

export function addressToDisplayString(
  address: AddressInput | string | null | undefined,
  prefix: 'pickup' | 'delivery' | '' = ''
): string {
  return formatNorwegianAddress(address, prefix).oneLine;
}

export default formatNorwegianAddress;
