import React from 'react';
import CountryPage from '../../components/global/CountryPage';

export default function UKPage() {
  return (
    <CountryPage
      iso2="gb" flag="🇬🇧"
      name="United Kingdom"
      localLabel="UK deployment node"
      positioning="The UK marketplace coordinates Goods Vehicle Operator Licence holders, moving labor crews, packing services, storage networks, and enterprise relocation across England, Scotland, Wales, and Northern Ireland. FlyttGo provides the coordination layer; relocations are performed by independent licensed UK providers."
      rolloutPhase="Phase 3 of the global rollout. Activation across the South East, Midlands, and Scottish Central Belt in alignment with the wider European deployment through 2027 H1."
      compliance="UK transport licensing awareness. Goods Vehicle Operator Licence (GVOL), DVSA roadworthiness, VAT registration, and the BAR Advance Payment Guarantee where applicable are the licensed operator's responsibility, not the marketplace's. UK GDPR / Data Protection Act 2018 alignment."
      services={[
        { title: 'Labor-only move support', description: 'Match with vetted UK labor crews for loading, unloading, and in-home moves.' },
        { title: 'Licensed carrier matching', description: 'GVOL operator matching for domestic and intra-UK relocations.' },
        { title: 'Truck rental coordination', description: 'Vehicle rental partner integration alongside labor and operator coordination.' },
        { title: 'Packing services', description: 'Independent packing crews and materials suppliers integrated into the move plan.' },
        { title: 'Storage partner integration', description: 'Self-storage and bonded warehouse partners for staged or international timelines.' },
        { title: 'Insurance selection', description: 'Goods-in-transit and liability cover options surfaced at booking.' },
        { title: 'Enterprise relocation', description: 'Workforce mobility and consolidated invoicing for UK corporate and public-sector teams.' },
        { title: 'University relocation', description: 'Move-in / move-out coordination for UK universities and student halls.' },
      ]}
      providers={[
        { label: 'Licensed moving carrier (GVOL operator)' },
        { label: 'Moving labor provider' },
        { label: 'Packing services provider' },
        { label: 'Storage facility partner' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="FlyttGo Technologies Group (Norway) — European marketplace"
      specs={[
        { label: 'ISO code', value: 'GB' },
        { label: 'Currency', value: 'GBP' },
        { label: 'Jurisdiction', value: 'England · Scotland · Wales · NI' },
        { label: 'Carrier framework', value: 'GVOL · DVSA · UK GDPR' },
        { label: 'Rollout phase', value: 'Phase 3 — European corridor' },
      ]}
      regions={['London','Manchester','Birmingham','Edinburgh','Glasgow','Bristol','Belfast']}
    />
  );
}
