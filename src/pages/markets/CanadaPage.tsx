import React from 'react';
import CountryPage from '../../components/global/CountryPage';

export default function CanadaPage() {
  return (
    <CountryPage
      iso2="CA"
      name="Canada"
      localLabel="Canada deployment node"
      positioning="The Canadian marketplace coordinates interprovincial carrier matching, moving labor, packing, storage, and corporate relocation across English- and French-speaking provinces. FlyttGo provides the coordination layer; relocations are performed by independent licensed Canadian providers."
      rolloutPhase="Phase 2 of the global rollout. Activation across major metros and bilingual marketplace surfaces underway through 2026."
      compliance="Provincial transport licensing and Transport Canada awareness. Provincial sales tax, GST/HST collection, and CCMTA cross-border rules are the licensed carrier's responsibility, not the marketplace's. Bilingual disclosures align with Quebec consumer protection law."
      services={[
        { title: 'Labor-only move support', description: 'Match with vetted Canadian labor crews for loading, unloading, and in-home moves.' },
        { title: 'Licensed carrier matching', description: 'Provincially licensed and federally compliant interprovincial carriers across the Canadian marketplace.' },
        { title: 'Truck rental coordination', description: 'Vehicle rental partner integration alongside labor and carrier coordination.' },
        { title: 'Packing services', description: 'Independent packing crews and materials suppliers integrated into the move plan.' },
        { title: 'Storage partner integration', description: 'Self-storage and bonded warehouse partners for staged Canadian or cross-border timelines.' },
        { title: 'Insurance selection', description: 'Valuation and transit cover options surfaced at booking, including cross-border options.' },
        { title: 'Enterprise relocation', description: 'Workforce mobility and consolidated invoicing for Canadian corporate and public-sector teams.' },
        { title: 'University relocation', description: 'Move-in / move-out coordination for Canadian universities and college residences.' },
      ]}
      providers={[
        { label: 'Licensed moving carrier (provincial / federal)' },
        { label: 'Moving labor provider' },
        { label: 'Packing services provider' },
        { label: 'Storage facility partner' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="Wankong LLC (Delaware, United States) — North American marketplace"
      specs={[
        { label: 'ISO code', value: 'CA' },
        { label: 'Currency', value: 'CAD' },
        { label: 'Jurisdiction', value: 'Federal · 10 provinces · 3 territories' },
        { label: 'Carrier framework', value: 'Provincial · Transport Canada' },
        { label: 'Rollout phase', value: 'Phase 2 — Activating' },
      ]}
      regions={['Toronto, ON','Montreal, QC','Vancouver, BC','Calgary, AB','Ottawa, ON','Edmonton, AB']}
    />
  );
}
