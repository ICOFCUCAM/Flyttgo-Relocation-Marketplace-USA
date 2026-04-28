import React from 'react';
import type { BookingCountry } from '../../lib/store';

/**
 * Per-country schema.org JSON-LD bundle. Emits LocalBusiness +
 * AggregateRating + Service + BreadcrumbList for the country page so
 * Google can render rich results (star rating, service catalog,
 * breadcrumbs) for each country shopfront.
 *
 * The numbers are placeholders that match the on-page stats; replace
 * with the live SQL aggregate from `bookings` when telemetry is wired.
 */

interface CountryStats {
  name:    string;       // "United States"
  iso:     BookingCountry;
  url:     string;       // canonical URL
  reviews: number;       // total reviews to feed AggregateRating
  rating:  number;       // 0-5
  area:    string[];     // representative cities
}

const COUNTRY_DATA: Record<BookingCountry, CountryStats> = {
  us: { name: 'United States',  iso: 'us', url: 'https://flyttgo.us/us',      reviews: 12400, rating: 4.9, area: ['Austin','Atlanta','Dallas','Phoenix','Charlotte','New York','Los Angeles'] },
  ca: { name: 'Canada',         iso: 'ca', url: 'https://flyttgo.us/canada',  reviews:  3100, rating: 4.8, area: ['Toronto','Montréal','Vancouver','Calgary','Ottawa','Edmonton'] },
  gb: { name: 'United Kingdom', iso: 'gb', url: 'https://flyttgo.us/uk',      reviews:  4800, rating: 4.8, area: ['London','Manchester','Birmingham','Edinburgh','Glasgow','Bristol'] },
  de: { name: 'Germany',        iso: 'de', url: 'https://flyttgo.us/germany', reviews:  2700, rating: 4.8, area: ['Berlin','München','Hamburg','Frankfurt','Köln','Stuttgart'] },
  fr: { name: 'France',         iso: 'fr', url: 'https://flyttgo.us/france',  reviews:  2400, rating: 4.7, area: ['Paris','Lyon','Marseille','Toulouse','Bordeaux','Lille'] },
  no: { name: 'Norway',         iso: 'no', url: 'https://flyttgo.us/norway',  reviews:  1900, rating: 4.9, area: ['Oslo','Bergen','Trondheim','Stavanger','Kristiansand','Tromsø'] },
};

const ISO_TO_COUNTRY: Record<BookingCountry, string> = {
  us: 'US', ca: 'CA', gb: 'GB', de: 'DE', fr: 'FR', no: 'NO',
};

export default function CountrySchema({ iso }: { iso: BookingCountry }) {
  const data = COUNTRY_DATA[iso];

  const localBusiness = {
    '@context': 'https://schema.org',
    '@type':    'LocalBusiness',
    '@id':      `${data.url}#business`,
    name:       `FlyttGo · ${data.name} Moves & Logistics`,
    image:      'https://flyttgo.us/og.svg',
    url:        data.url,
    telephone:  '+44 7432 112438',
    description: `FlyttGo's ${data.name} marketplace — licensed local providers, instant quotes, escrow protection, cash or card payment.`,
    address: {
      '@type':         'PostalAddress',
      addressCountry:  ISO_TO_COUNTRY[iso],
    },
    areaServed: data.area.map(city => ({ '@type': 'City', name: city })),
    priceRange: iso === 'no' ? 'NOK 4 200 +'
              : iso === 'gb' ? '£380 +'
              : iso === 'de' || iso === 'fr' ? '€420 +'
              : iso === 'ca' ? 'C$520 +'
                             : '$480 +',
    aggregateRating: {
      '@type':     'AggregateRating',
      ratingValue: data.rating.toFixed(1),
      reviewCount: data.reviews,
      bestRating:  '5',
      worstRating: '1',
    },
  };

  const breadcrumb = {
    '@context': 'https://schema.org',
    '@type':    'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'FlyttGo Global', item: 'https://flyttgo.us/' },
      { '@type': 'ListItem', position: 2, name: 'Markets',         item: 'https://flyttgo.us/cities' },
      { '@type': 'ListItem', position: 3, name: data.name,         item: data.url },
    ],
  };

  const service = {
    '@context':   'https://schema.org',
    '@type':      'Service',
    serviceType:  `${data.name} relocation marketplace`,
    provider:     { '@id': `${data.url}#business` },
    areaServed:   { '@type': 'Country', name: data.name },
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name:    `${data.name} marketplace categories`,
      itemListElement: [
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Licensed moving carrier matching' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Moving labor coordination' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Packing services' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Storage partner integration' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Truck rental coordination' } },
        { '@type': 'Offer', itemOffered: { '@type': 'Service', name: 'Cash on delivery (30% deposit + 70% cash)' } },
      ],
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusiness) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumb) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(service) }} />
    </>
  );
}
