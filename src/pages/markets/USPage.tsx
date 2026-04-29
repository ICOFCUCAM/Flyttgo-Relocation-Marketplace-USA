import CountryPage from '../../components/global/CountryPage';

export default function USPage() {
  return (
    <CountryPage
      iso2="us" flag="🇺🇸"
      name="United States"
      localLabel="United States deployment node"
      positioning="The US marketplace coordinates labor-only crews, USDOT-licensed interstate carriers, packing services, storage networks, vehicle rental partners, and insurance options across all fifty states. FlyttGo is the coordination layer; the relocation itself is performed by independent licensed providers."
      rolloutPhase="Phase 1 of the global rollout. Live deployment in Austin, Atlanta, Dallas, Phoenix, and Charlotte, with progressive activation of Phase 2 metros through 2026 H2."
      compliance="FMCSA-aware verification. USDOT and MC numbers are surfaced for licensed motor carriers at provider onboarding. Sales tax, surety bonds, and FMCSA-mandated insurance are the licensed carrier's responsibility, not the marketplace's."
      services={[
        { title: 'Labor-only move support', description: 'Match with vetted moving labor crews for loading, unloading, and in-home moves. Bring your own vehicle or rental.' },
        { title: 'Licensed carrier matching', description: 'FMCSA-aware matching with USDOT-registered interstate and intrastate motor carriers for full-service relocations.' },
        { title: 'Truck rental coordination', description: 'Connect with truck rental partners and reserve the right vehicle alongside your labor or carrier booking.' },
        { title: 'Packing services', description: 'Coordinate packing crews, materials, and crating from independent packing service providers.' },
        { title: 'Storage partner integration', description: 'Self-storage and warehouse partners integrated into the move plan for staged or interstate timelines.' },
        { title: 'Insurance selection', description: 'Compare valuation coverage and third-party transit insurance options at the time of booking.' },
        { title: 'Enterprise relocation', description: 'Procurement, approvals, audit logs, and consolidated invoicing for HR, mobility, and operations teams.' },
        { title: 'University relocation', description: 'Move-in, move-out, and semester mobility coordination for universities and student housing offices.' },
      ]}
      providers={[
        { label: 'Licensed moving carrier (USDOT/MC)' },
        { label: 'Moving labor provider' },
        { label: 'Packing services provider' },
        { label: 'Storage facility partner' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="Wankong LLC (Delaware, United States)"
      specs={[
        { label: 'ISO code', value: 'US' },
        { label: 'Currency', value: 'USD' },
        { label: 'Jurisdiction', value: 'Federal · 50 states' },
        { label: 'Carrier framework', value: 'FMCSA / USDOT' },
        { label: 'Rollout phase', value: 'Phase 1 — Live' },
      ]}
      regions={['Austin, TX','Atlanta, GA','Dallas, TX','Phoenix, AZ','Charlotte, NC','Nashville, TN','Tampa, FL','Denver, CO']}
    />
  );
}
