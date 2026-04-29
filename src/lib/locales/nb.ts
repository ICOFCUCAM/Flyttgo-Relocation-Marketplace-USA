/**
 * Norwegian Bokmål (nb) — country-shopfront overlay.
 *
 * Intentionally partial: only covers the surfaces a customer meets when
 * landing on the Norwegian shopfront (header brand, the booking widget,
 * a few legal / footer strings). i18next falls back to `en` for every
 * key not declared here, so the inner booking-flow stays readable while
 * the hero, country landing, and booking shortcut read as native Norwegian.
 *
 * NOT a full translation — do not advertise full Norwegian coverage in
 * marketing copy. Extend by mirroring more keys from `en.ts` only when the
 * corresponding flow has been validated by a Norwegian-speaking reviewer.
 */
export const nb = {
  header: {
    home:         'Hjem',
    services:     'Tjenester',
    becomeDriver: 'Bli leverandør',
    bookNow:      'Bestill nå',
    signIn:       'Logg inn',
    signUp:       'Opprett konto',
    dashboard:    'Min side',
    myBookings:   'Mine flyttinger',
    profile:      'Profil',
    signOut:      'Logg ut',
    notifications: 'Varsler',
    notificationsEmpty: 'Ingen nye varsler',
    notificationsHint:  'Nye flyttingsoppdateringer kommer hit.',
    tagline:      'Norges flyttemarkedsplass — koordinert',
  },
  booking: {
    addrPickupLabel:       'Henteadresse',
    addrPickupPlaceholder: 'F.eks. Karl Johans gate 22, Oslo',
    addrDropoffLabel:      'Leveringsadresse',
  },
  footer: {
    rights: '© 2026 FlyttGo Technologies Group · FlyttGo Global Logistics & Relocation Marketplace. Med enerett.',
  },
};
