import React from 'react';
import CountryPage from '../../components/global/CountryPage';

export default function FrancePage() {
  return (
    <CountryPage
      iso2="fr" flag="🇫🇷"
      name="France"
      localLabel="Nœud de déploiement France"
      positioning="La place de marché française coordonne des déménageurs licenciés, des équipes de manutention, des services d'emballage, des partenaires de stockage et des déménagements d'entreprise. FlyttGo fournit la couche de coordination ; les déménagements sont assurés par des prestataires français indépendants et licenciés."
      rolloutPhase="Phase 3 of the global rollout. Activation across French metros and the Île-de-France corridor in alignment with the wider European deployment through 2027 H1."
      compliance="EU relocation compliance awareness. Inscription au registre des transporteurs, attestation de capacité, and French VAT collection are the licensed déménageur's responsibility, not the marketplace's. GDPR-aligned data handling for customers and providers."
      services={[
        { title: 'Labor-only move support', description: 'Mise en relation avec des équipes vérifiées pour le chargement, le déchargement et la manutention.' },
        { title: 'Licensed carrier matching', description: 'Déménageurs inscrits au registre des transporteurs pour les déménagements nationaux et transfrontaliers.' },
        { title: 'Truck rental coordination', description: 'Partenaires de location de véhicules intégrés au plan de déménagement.' },
        { title: 'Packing services', description: 'Équipes d\'emballage et fournisseurs de matériel intégrés depuis le réseau indépendant.' },
        { title: 'Storage partner integration', description: 'Partenaires de garde-meubles et de stockage pour les calendriers échelonnés ou internationaux.' },
        { title: 'Insurance selection', description: 'Comparaison des options de couverture et d\'assurance transport au moment de la réservation.' },
        { title: 'Enterprise relocation', description: 'Workflows de mobilité interne pour les équipes RH et achats avec facturation consolidée.' },
        { title: 'University relocation', description: 'Coordination des arrivées étudiantes et des résidences universitaires.' },
      ]}
      providers={[
        { label: 'Licensed déménageur (Registre des transporteurs)' },
        { label: 'Moving labor provider (manutention)' },
        { label: 'Packing services provider (emballage)' },
        { label: 'Storage facility partner (garde-meuble)' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner (commissionnaire)' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="FlyttGo Technologies Group (Norway) — European marketplace"
      specs={[
        { label: 'ISO code', value: 'FR' },
        { label: 'Currency', value: 'EUR' },
        { label: 'Jurisdiction', value: 'Métropolitaine · 13 régions' },
        { label: 'Carrier framework', value: 'Registre transporteurs · EU' },
        { label: 'Rollout phase', value: 'Phase 3 — European corridor' },
      ]}
      regions={['Paris · Île-de-France','Lyon','Marseille','Toulouse','Bordeaux','Lille']}
    />
  );
}
