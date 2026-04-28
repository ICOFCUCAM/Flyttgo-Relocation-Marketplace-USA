/**
 * Norwegian Bokmål (nb) translation stub.
 *
 * Mirrors the shape of `en.ts` but only fills in the surfaces a customer
 * meets when they land on the Norwegian shopfront — header brand, the
 * Norwegian booking widget labels, and a few legal / footer strings.
 *
 * i18next falls back to `en` for every key not declared here, so the
 * inner booking-flow steps (which the Norwegian customer walks through
 * once they leave /norway) stay readable while the hero, the country
 * landing, and the booking shortcut all read as native Norwegian.
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
