# FlyttGo — Marketplace Architecture

A note on how the homepage, country shopfronts, category landing pages,
booking flows, provider funnels, and footer fit together as one system.

This is a working document — when you change a primary surface, update
the section here so the next contributor can find the seams.

## 1. Top-level page hierarchy

```
src/components/
  HomePage.tsx                ← position-numbered narrative (see §2)
  Footer.tsx                  ← 6-column platform navigation hub (see §6)
  AppLayout.tsx               ← lazy-routes every page id from store.tsx
  global/
    BookingShortcut.tsx       ← country-scoped instant-quote widget
    TopProviders.tsx          ← AI-routed dispatch strip + OSRM pricing
    EarningsSimulator.tsx     ← supply-side earnings projector
    ReviewsCarousel.tsx       ← RTL auto-scroll marquee (inline + full)
    HomeFAQ.tsx               ← accordion (inline + full)
    ReviewsAndFAQRow.tsx      ← side-by-side composer for the two above
    CategoryPreviewsRow.tsx   ← featured /services/<slug> entry points
    ...

src/pages/
  ServiceCategoryPage.tsx     ← /services/<slug>, slug from URL pathname
  markets/
    USPage.tsx                ← localized US shopfront
    CanadaPage.tsx
    UKPage.tsx
    FrancePage.tsx
    GermanyPage.tsx
    NorwayPage.tsx

src/lib/
  service-categories.ts       ← canonical category catalogue (9 entries)
  pricing-engine/             ← shared engine across all country flows
  providers-catalogue.ts      ← curated provider records (pre-Supabase)
  route-price-estimator.ts    ← OSRM-aware price preview
  routing.ts                  ← OSRM + Haversine fallback
  pageRoutes.ts               ← bidirectional Page ↔ URL map

src/services/
  bookings.ts                 ← React Query + Zod-validated mutation
  payments.ts                 ← Stripe / process-payment edge function
  route-cache.ts              ← Supabase cache → OSRM fallback chain
```

## 2. Homepage narrative (`src/components/HomePage.tsx`)

The homepage is a numbered narrative, not a feature dump. Each
position has a single job; sections that don't earn a position get
removed.

| # | Section | Component / source | Job |
|---|---------|--------------------|-----|
| 1 | Hero | inline | Brand promise + enterprise / student CTAs |
| 2 | Country selector | inline (in hero) | First decision: which marketplace |
| 3 | Top rated providers | `<TopProviders>` | Real licensed operators with route-aware prices |
| 4 | Earnings simulator | `<EarningsSimulator>` | Supply-side income transparency |
| 5 | Service categories | inline tile grid | High-level "what you can book" |
| 6 | Category landing previews | `<CategoryPreviewsRow>` | Deep entry into `/services/<slug>` pages |
| 7 | Press strip | `<PressStrip>` | Institutional validation |
| 8 | Recently viewed | `<RecentlyViewedRail>` | Self-suppressing personalisation |
| 9 | Carbon offset | `<CarbonOffset>` | Sustainability values |
| 10 | Reviews + FAQ row | `<ReviewsAndFAQRow>` | Two parallel trust modules in one row |
| 11 | Trust stats strip | inline (live KPIs) | Marketplace strength + Live indicator |
| 12 | Provider onboarding CTA | inline | Supply-side acquisition |
| 13 | Final country selector CTA | inline | Reinforce the primary decision |

Removed: `SmartMatchingSection` and `WhyFlyttGo` (deleted from disk).
Removed: "How it works" 3-step block (its content lives inside each
ServiceCategoryPage's localised how-it-works panel).

## 3. Country landing pages (`src/pages/markets/`)

Each country is a localized storefront with its own booking widget,
licensing badges, and corridor metadata. Six pages today:

```
/us       → USPage         (English, USDOT/FMCSA badges, USPS-style addressing)
/canada   → CanadaPage     (English + French toggle, federal compliance)
/uk       → UKPage         (English, GVOL operator references)
/france   → FrancePage     (French + English switcher, La Poste-style)
/germany  → GermanyPage    (German + English switcher, GüKG references)
/norway   → NorwayPage     (Norwegian + English switcher, Posten-style)
```

Common contract: each page mounts `<BookingShortcut country="…" />`
which passes the country to `lib/pricing-engine` for a country-scoped
quote, to `NorwayAddressAutocomplete` for country-biased autocomplete,
and to `lib/constants.COUNTRY_PAYMENT` for the cash-on-delivery
toggle.

**Postal API integration status:** today every country uses
Nominatim with a country bias (`countrycode=us|gb|fr|…`). USPS,
Royal Mail, La Poste, Deutsche Post, Posten, and Canada Post live
APIs are deferred — wire each via a new edge function once an
account is provisioned.

**Language switcher status:** i18n keys are in `src/lib/locales/`
but a persistent in-flow language switcher is deferred — see
follow-ups below.

## 4. Category landing pages (`src/pages/ServiceCategoryPage.tsx`)

One page handles every category. Slug source: URL pathname segment 2.
Catalogue: `src/lib/service-categories.ts` — currently 9 entries:

```
long-distance · local · international · office · packing
storage · truck-rental · student · labor-only
```

Each entry carries:
- `name`, `tagline`, `intro` — hero copy
- `matches: string[]` — case-insensitive substring filter against
  `ProviderRecord.services` so the page renders only providers
  offering the category
- `howItWorks` — three-step explainer tuned to the service
- `faq` — two service-specific QA pairs
- `pricingTier` — slug into `us-pricing.ts` for the typical-rate card

Adding a category = adding one entry to the catalogue. No new file,
no new route. Spec'd 8 categories from this session's brief are all
present.

## 5. Booking flow (`src/components/booking/BookingFlow.tsx`)

One canonical booking flow, country-parameterized. Each shopfront
seeds `bookingData` with its country, then opens `BookingFlow` —
which:

1. Reads `bookingData.country`
2. Routes to the country-scoped autocomplete + currency + payment
   policy
3. Submits via `services/bookings.createBooking` (Zod-validated)
4. The unified `pricing-engine` produces the binding quote; only the
   inputs (per-country baselines, city multipliers) differ across
   countries

Per-country *dedicated* booking instances (separate flow files per
country) is **deferred** — the spec calls for it but the current
shared-flow + country-prop architecture is genuinely cleaner. Re-
visit only if a market needs flow steps that genuinely diverge.

## 6. Footer — 6-column platform navigation hub

`src/components/Footer.tsx` exposes 6 lanes, each a `LinkItem[]`
constant at the top of the file:

| Lane | Connects to |
|------|-------------|
| Customers | Booking engine (request-quote, marketplace, browse, compare, pricing, FAQ) |
| Providers | Provider onboarding funnel (apply, requirements, subscriptions, portal) |
| Enterprise | Enterprise relocation funnel (corporate, universities, govt, NGO, RFP) |
| Countries | Six localized marketplaces |
| Legal | ToS, privacy, liability, provider terms, compliance, dispute |
| Platform | About, contact, press, careers, sustainability, partners |

Every link is a real registered page in `lib/pageRoutes.ts`.

## 7. Trust + compliance fabric

| Surface | Where |
|---------|-------|
| USDOT / FMCSA messaging | Corporate ribbon (HomePage), USPage hero, ServiceCategoryPage compliance card |
| GVOL UK operators | Corporate ribbon, UKPage hero |
| EU licensed carrier | Corporate ribbon, FrancePage / GermanyPage / NorwayPage hero |
| Escrow explanation | Footer trust strip + `BookingShortcut` payment-method picker |
| Insurance coverage ($50k / market equivalent) | Footer trust strip + provider profile + ServiceCategoryPage FAQ |
| Distance-based estimate preview | `route-price-estimator` via `TopProviders` + `BookingShortcut` |
| Metro demand surge | `route-price-estimator.METRO_DEMAND` (DB cutover spec'd in `docs/install-metro-demand-multipliers.sql`) |

## 7B. Provider identity model — white-label (Uber-style)

**Policy:** providers operate *under* the FlyttGo brand on every
public surface. Customer relationship is with FlyttGo, not the
individual operator. Real provider names and contact info are
revealed only post-booking-confirmation (after escrow holds funds),
when the customer needs the operator identity for the actual
delivery.

**Why:** masking phone / email alone doesn't prevent
disintermediation — provider company names are public-record data,
so a customer who sees "Atlas Interstate Movers" on the homepage
can google their phone in seconds. The only way to genuinely close
the leakage loop is to never expose the brand. Same model Uber,
DoorDash, Instacart, and most gig-style logistics marketplaces use.

**The display layer:** `src/lib/provider-identity.ts`
`getProviderPublicIdentity(p)` returns:

```ts
{
  displayName: 'FlyttGo Elite Carrier · NYC Metro',
  operatorId:  'FG-US-AIM-4Q',           // stable, opaque
  region:      'NYC Metro',
  tierLabel:   'Elite',
}
```

The underlying `ProviderRecord.name` is unchanged — used by
dispatch, payouts, ops, and post-booking comms. The masking lives
purely in the display layer.

**Surfaces masked (no real brand visible):**

- `TopProviders` (homepage card grid)
- `ProviderProfilePage` (hero + sticky bar + sibling-providers card)
- `ProvidersDirectoryPage` (card grid + typeahead + search index)
- Recently-viewed rail (writes through `getProviderPublicIdentity`)
- `AddToCompareButton` payloads (compare list also masked)
- Search input over the directory uses `displayName` / `region` /
  `operatorId` / `tierLabel` — real `name` is *not* in the index,
  so a customer typing the underlying brand name finds nothing

**Surfaces NOT masked:**

- `DiscoveryProvidersSection` — these are non-onboarded
  acquisition leads. Real names are required so the
  "Are you {Brand}? Claim & onboard" CTA can target them.
- Internal dispatch / admin / driver portal — every operational
  surface still sees the real brand for ops correctness.

**Pending: post-payment reveal.** When a booking confirmation
fires (escrow held, dispatch assigned), the PaymentPage should
read the assigned provider's real `ProviderRecord.name` + phone
and surface them as the "Your operator: {Real Name}" block. That
wire requires walking the booking → dispatch state machine and
hasn't shipped — see the next-step list below.

## 8. Provider supply-side surfaces

`<EarningsSimulator>` mounts on:

- HomePage (position 4)
- `/providers` (provider acquisition page)
- `/become-a-driver` (onboarding step 0)

It responds to:
- country (country-baseline hourly × per-km)
- tier (Silver / Silver Plus / Gold / Gold Pro / Elite — feeds commission %)
- corridor (city-pair multiplier from `pricing-engine/data.ts.CITY_MULTIPLIERS`)
- season (weekend / month-end / student-season multipliers)

## 9. Deferred work (tracked, not lost)

The spec's full ambition is a multi-week engagement. What's pending:

1. **Per-country postal APIs** — wire USPS / Royal Mail / La Poste /
   Deutsche Post / Posten / Canada Post via dedicated edge functions.
   Replace the Nominatim-with-country-bias autocomplete in
   `NorwayAddressAutocomplete`.
2. **Per-country dedicated booking flows** — only if a market's flow
   genuinely diverges; today the country-prop pattern is sufficient.
3. **`route_corridor_cache` + `metro_demand_multipliers` SQL apply** —
   migrations are drafted in `docs/install-route-corridor-cache.sql`
   and `docs/install-metro-demand-multipliers.sql`. Apply when you
   want to drop OSRM round-trip latency.
4. **Live reviews + Trustpilot ingestion** — the carousel uses six
   curated testimonials; replace with a fetch from a `reviews`
   Supabase view once external review data is wired.
5. **Header route preview strip** ("Moving from: NY → Boston") —
   spec'd as optional. Needs `bookingData.pickupCity`/`dropoffCity`
   plumbing into a new `<HeaderRoutePreview>` with inline edit
   popovers.
6. **Locale parity** — i18next bundles for `en`, `fr`, `de`, `nb`
   exist but coverage of FR/DE/NB vs EN is uneven. The Header
   switcher is real (flips i18n.changeLanguage); full key-by-key
   translation parity across booking flow + country pages is
   pending a translator pass.

## 10. Color sweep — emerald → amber/ink rebrand

Emerald was the legacy "trust" color from before the amber + ink-navy
brand was finalised. It now reads as off-brand wherever it does the
work of a primary action color or active state.

**Reskin policy (applied gradually):**

- **Brand surfaces** (logos, primary CTAs, active nav states,
  primary buttons, focus rings, link text, role badges) →
  `amber-400/500/600/700` + `ink-900` for navy.
- **Status surfaces** (verified pills, success toasts, "code sent"
  confirmation banners, unread notification dots, online-status
  indicators, completed-step ticks) → keep `emerald-500/600`.
  Green is a legitimate status color and shouldn't be removed
  from those legitimate uses.

**Applied in this session:**

- `CookieConsent` — full restyle: ink-navy header band + amber-400
  icon tile + amber CTA + warm amber-tinted shadow + gradient orb.
  Reads as a brand surface, not a generic GDPR banner.
- `Header.tsx` — logo box → amber gradient on ink-navy ring;
  user-menu avatar bg → amber-100/700; role badge → amber-50/700;
  legacy emerald sign-up button removed (sign-in stays, sign-up is
  reachable via the AuthModal).
- `AuthModal.tsx` — full sweep: focus rings, primary CTAs, role
  selection cards, role icons, link text → amber.
- `SubscriptionPlans.tsx` — full sweep: "MOST POPULAR" badge,
  primary CTAs, slider, earnings number → amber.
- `MyBookings.tsx`, `CustomerDashboard.tsx`, `MovingChecklist.tsx`,
  `VanGuide.tsx`, `LegalAcceptance.tsx` — bulk emerald → amber.

**Remaining sweep (87 files still contain emerald hits):** most are
legitimate status uses. Anything still rendering emerald as a
brand-defining action surface should be re-skinned in a follow-up
pass. Use `grep -rn "border-emerald-600\|bg-emerald-600\|bg-emerald-700\|text-emerald-600\|focus:ring-emerald" src/` to find the next worst offenders.

## 11. Page upgrade backlog

The spec's "perfect every page" ambition is genuinely multi-session.
Below is the assessment of where the unevenness lives, in priority
order.

| Priority | Page(s) | Issue | Suggested upgrade |
|----------|---------|-------|-------------------|
| **High** | `AboutUsPage`, `ContactPage`, `HelpCenterPage` | Bespoke heros, no `<MarketplaceBanner>` | Apply the banner token; consolidate eyebrow + headline + lead per the 2035 typography spec |
| **High** | `FaqPage`, `HowItWorksPage` | Same — bespoke heros | Banner token; pair with a corridor-pricing CTA to convert the read |
| **High** | `LiabilityPage`, `PrivacyPage`, `DriverTermsPage` | Plain prose pages, no banner, mixed typography | Banner with `eyebrow="Legal"` + breadcrumb + last-revised-at date strip |
| Med | `PricingPage` | Standalone, no banner alignment with the rest of the marketplace | Banner with corridor demo aside |
| Med | `MarketplacePage`, `PartnersPage`, `CompliancePage` | Heavy `<Section tone="ink">` patterns — substantive but non-uniform | Wrap in `<MarketplaceBanner variant="inverse">` for header consistency; keep the section bodies |
| Med | `CitiesPage`, `PressPage`, `CareersPage`, `SafetyPage`, `SustainabilityPage` | Mixed bespoke heros | Banner pass |
| Low | `NotFoundPage`, `DisputePage`, `AcceptOrgInvitePage` | Utility pages | Light pass — eyebrow + heading only, no banner needed |
| Low | `ProfilePage`, dashboards (`AdminDashboard`, `CorporateDashboard`, `DriverPortal`) | App-shell surfaces, intentionally not banner pages | Leave alone — they're product UI, not marketing surfaces |

**Per-page upgrade pattern:**
1. Replace bespoke hero `<section className="bg-slate-50 py-20">…</section>` with `<MarketplaceBanner eyebrow="…" breadcrumb={…} headline="…" lead="…" compliancePills={[…]} ctas={[…]} />`
2. Drop the `<SectionIndex>` import (banner carries its own breadcrumb)
3. Sweep emerald → amber/ink unless the use is a legitimate success/verified state
4. Audit typography hierarchy against `<MarketplaceBanner>`'s heading sizes (5xl-7xl extrabold tracking-tight leading-[1.05]) so headings on body sections match or read as a deliberate step down

## 10. The seams to know about

- `src/lib/store.tsx` — single source of truth for current page id +
  `bookingData`. Every navigation routes through `setPage(id)`.
- `src/lib/pageRoutes.ts` — bidirectional Page id ↔ URL map. Add a
  page = add to both maps.
- `src/lib/service-categories.ts` — canonical category catalogue.
  Adding a category = adding a row.
- `src/services/route-cache.ts` — preferred entry to route distance.
  Falls back: cache → OSRM → Haversine. Tolerates table missing.
- `src/lib/route-price-estimator.ts` — synchronous price calc; takes
  resolved miles, never throws, always returns a renderable quote.
- `src/components/global/BookingShortcut.tsx` — the canonical
  country-scoped instant-quote widget. Mount it wherever you want a
  customer to start a booking; the rest of the flow is automatic.
