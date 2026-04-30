/* Shared types and helpers for the booking flow steps. */

export interface StructuredAddress {
  street_name:  string;
  house_number: string;
  postcode:     string;
  city:         string;
  country:      string;
  lat:          number | null;
  lng:          number | null;
  formatted:    string;
}

export const COUNTRY_LABEL: Record<string, string> = {
  us: 'USA',
  ca: 'Canada',
  de: 'Germany',
  fr: 'France',
  gb: 'United Kingdom',
  no: 'Norway',
};

export function emptyAddress(countryLabel = 'USA'): StructuredAddress {
  return {
    street_name:  '',
    house_number: '',
    postcode:     '',
    city:         '',
    country:      countryLabel,
    lat:          null,
    lng:          null,
    formatted:    '',
  };
}

export const TOTAL_STEPS = 6;

export interface AddressErrors {
  pickup?:  string;
  dropoff?: string;
}
