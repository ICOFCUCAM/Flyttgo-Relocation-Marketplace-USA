import React from 'react';
import CountryPage from '../../components/global/CountryPage';

export default function NorwayPage() {
  return (
    <CountryPage
      iso2="NO"
      name="Norway"
      localLabel="Norge-distribusjonsnode"
      positioning="Den norske markedsplassen koordinerer flytteselskap med løyve, flyttehjelp, pakketjenester, lagerpartnere og bedriftsflytting. FlyttGo leverer koordineringslaget; selve flyttingen utføres av uavhengige, autoriserte norske leverandører."
      rolloutPhase="Phase 3 of the global rollout. The home market for FlyttGo Technologies Group, with continuous deployment alongside the wider European corridor through 2027 H1."
      compliance="EU/EEA relocation compliance awareness. Løyveplikt etter yrkestransportloven, MVA-registrering hos Skatteetaten, and Statens vegvesen vehicle compliance are the licensed flytteselskap's responsibility, not the marketplace's. GDPR-aligned data handling for customers and providers."
      services={[
        { title: 'Labor-only move support', description: 'Formidling av flyttehjelp for lasting, lossing og innenhus-flytting.' },
        { title: 'Licensed carrier matching', description: 'Flytteselskap med løyve for nasjonal og grensekryssende flytting.' },
        { title: 'Truck rental coordination', description: 'Partnerintegrasjon for utleie av lastebiler og varebiler.' },
        { title: 'Packing services', description: 'Uavhengige pakkeleverandører og materialer integrert i flytteplanen.' },
        { title: 'Storage partner integration', description: 'Selfstorage- og lagerpartnere for trinnvis eller internasjonal flytting.' },
        { title: 'Insurance selection', description: 'Sammenligning av ansvars- og transportforsikring direkte ved bestilling.' },
        { title: 'Enterprise relocation', description: 'Arbeidsmobilitet og konsolidert fakturering for norske bedrifter og offentlig sektor.' },
        { title: 'University relocation', description: 'Flyttekorridorer for studenter, studentboliger og internasjonale ankomster.' },
      ]}
      providers={[
        { label: 'Licensed flytteselskap (yrkestransportløyve)' },
        { label: 'Moving labor provider (flyttehjelp)' },
        { label: 'Packing services provider' },
        { label: 'Storage facility partner (selfstorage)' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="FlyttGo Technologies Group (Norway) — European marketplace"
      specs={[
        { label: 'ISO code', value: 'NO' },
        { label: 'Currency', value: 'NOK' },
        { label: 'Jurisdiction', value: 'Norway · 11 fylker · EEA' },
        { label: 'Carrier framework', value: 'Yrkestransportloven · EEA' },
        { label: 'Rollout phase', value: 'Phase 3 — Home market' },
      ]}
      regions={['Oslo','Bergen','Trondheim','Stavanger','Kristiansand','Tromsø']}
    />
  );
}
