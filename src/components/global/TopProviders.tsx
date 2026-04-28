import React from 'react';
import { Star, Truck, ShieldCheck, Award } from 'lucide-react';
import AddToCompareButton from './AddToCompareButton';

/**
 * "Top-rated providers" card row. The shape mirrors what we surface
 * in the booking shortlist later: badge + business name + star
 * rating + review count + price-from + verification chips. Today the
 * list is curated for the home page; once the marketplace has live
 * provider data, swap in a query against `drivers` + aggregated
 * ratings.
 */

interface Provider {
  name:    string;
  city:    string;
  flag:    string;
  rating:  number;
  reviews: number;
  fromPrice: string;
  badge?:  string;
  verified: ('USDOT' | 'GVOL' | 'GüKG' | 'Registre' | 'Yrkesløyve' | 'Bilingual')[];
}

const PROVIDERS: Provider[] = [
  {
    name: 'Big Apple Movers Co.',     city: 'New York City, NY',     flag: '🇺🇸',
    rating: 4.95, reviews: 2_180,     fromPrice: 'from $480',
    badge: 'Elite',                   verified: ['USDOT'],
  },
  {
    name: 'London Lift & Shift Ltd.', city: 'London, UK',            flag: '🇬🇧',
    rating: 4.92, reviews: 1_640,     fromPrice: 'from £380',
    badge: 'Gold Pro',                verified: ['GVOL'],
  },
  {
    name: 'Oslo Flyttebyrå AS',       city: 'Oslo, NO',              flag: '🇳🇴',
    rating: 4.97, reviews: 1_120,     fromPrice: 'fra 4 200 kr',
    badge: 'Home market',             verified: ['Yrkesløyve'],
  },
  {
    name: 'Berlin Umzugsprofis',      city: 'Berlin, DE',            flag: '🇩🇪',
    rating: 4.89, reviews: 1_350,     fromPrice: 'ab 420 €',
    badge: 'Gold',                    verified: ['GüKG'],
  },
  {
    name: 'Déménageurs Île-de-France',city: 'Paris, FR',             flag: '🇫🇷',
    rating: 4.86, reviews: 1_080,     fromPrice: 'à partir de 460 €',
    badge: 'Gold',                    verified: ['Registre'],
  },
  {
    name: 'Maple Move Co.',           city: 'Toronto, CA',           flag: '🇨🇦',
    rating: 4.88, reviews:   880,     fromPrice: 'from C$520',
    badge: 'Bilingual',               verified: ['Bilingual'],
  },
];

export default function TopProviders() {
  return (
    <section className="bg-white py-16 sm:py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10 max-w-2xl mx-auto">
          <p className="text-amber-600 text-xs font-bold uppercase tracking-wider mb-2">
            Top-rated providers worldwide
          </p>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Six countries. One trusted shortlist.
          </h2>
          <p className="mt-3 text-slate-600">
            Every provider is verified against its national operator-licence
            registry and ranked by completion rate, on-time record, and
            customer rating.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {PROVIDERS.map(p => (
            <article
              key={p.name}
              className="bg-[#fafaf7] hover:bg-white border border-slate-200 hover:border-amber-300 hover:shadow-lg rounded-2xl p-5 transition"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
                    <Truck size={20} className="text-amber-700" />
                  </div>
                  <div>
                    <p className="font-extrabold text-slate-900 leading-tight">{p.name}</p>
                    <p className="text-xs text-slate-500 flex items-center gap-1">
                      <span aria-hidden>{p.flag}</span>
                      {p.city}
                    </p>
                  </div>
                </div>
                {p.badge && (
                  <span className="inline-flex items-center gap-1 bg-amber-400/15 text-amber-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    <Award size={10} />
                    {p.badge}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 mb-3 text-sm">
                <Star size={15} className="fill-amber-400 text-amber-400" />
                <strong className="text-slate-900">{p.rating.toFixed(2)}</strong>
                <span className="text-slate-500">·</span>
                <span className="text-slate-500">{p.reviews.toLocaleString()} reviews</span>
              </div>

              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-slate-500">Booking from</span>
                <span className="font-extrabold text-amber-700">{p.fromPrice}</span>
              </div>

              <div className="flex flex-wrap gap-1.5 pt-3 border-t border-slate-200">
                {p.verified.map(v => (
                  <span key={v} className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md">
                    <ShieldCheck size={10} />
                    {v} verified
                  </span>
                ))}
              </div>

              <div className="mt-3 flex items-center justify-end">
                <AddToCompareButton
                  item={{
                    id:        `top-${p.name.toLowerCase().replace(/\W+/g, '-')}`,
                    name:      p.name,
                    city:      p.city,
                    flag:      p.flag,
                    rating:    p.rating,
                    reviews:   p.reviews,
                    fromPrice: p.fromPrice,
                    badge:     p.badge,
                    verified:  p.verified,
                  }}
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
