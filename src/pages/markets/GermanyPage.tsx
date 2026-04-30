import CountryPage from '../../components/global/CountryPage';
import CountrySEOSection from '../../components/seo/CountrySEOSection';

export default function GermanyPage() {
  return (
    <CountryPage
      seoSlot={<CountrySEOSection countryCode="de" languageCode="de" />}
      iso2="de" flag="🇩🇪"
      name="Germany"
      localLabel="Deutschland-Knoten"
      positioning="Der deutsche Marktplatz koordiniert lizenzierte Umzugsfirmen, Umzugshelfer, Verpackungsdienste, Lagerpartner und Unternehmensumzüge. FlyttGo betreibt die Koordinationsebene; die Dienstleistungen werden von unabhängigen, lizenzierten deutschen Anbietern erbracht."
      rolloutPhase="Phase 3 of the global rollout. European corridor activation alongside France, the United Kingdom, and Norway through 2027 H1."
      compliance="EU relocation compliance awareness. Güterkraftverkehrsgesetz (GüKG) operator licences, BAG transparency, and German VAT are the licensed Umzugsfirma's responsibility, not the marketplace's. GDPR-aligned data handling for customers and providers."
      services={[
        { title: 'Labor-only move support', description: 'Vermittlung von geprüften Umzugshelfern für Be- und Entladung sowie innerstädtische Umzüge.' },
        { title: 'Licensed carrier matching', description: 'GüKG-lizenzierte Umzugsfirmen mit BAG-Transparenz für nationale und grenzüberschreitende Umzüge.' },
        { title: 'Truck rental coordination', description: 'Mietwagen- und LKW-Partner als Bestandteil der Umzugsplanung.' },
        { title: 'Packing services', description: 'Verpackungs- und Möbelmontage-Crews aus dem unabhängigen Anbieternetzwerk.' },
        { title: 'Storage partner integration', description: 'Selfstorage- und Lagerpartner für gestaffelte oder internationale Zeitpläne.' },
        { title: 'Insurance selection', description: 'Vergleich von Haftpflicht- und Transportversicherungsoptionen direkt bei der Buchung.' },
        { title: 'Enterprise relocation', description: 'Konzernumzug-Workflows für HR, Mobility und Procurement mit konsolidierter Abrechnung.' },
        { title: 'University relocation', description: 'Umzugskorridore für Studierende, Wohnheime und internationale Ankünfte.' },
      ]}
      providers={[
        { label: 'Licensed Umzugsfirma (GüKG)' },
        { label: 'Moving labor provider (Umzugshelfer)' },
        { label: 'Packing services provider' },
        { label: 'Storage facility partner (Selfstorage)' },
        { label: 'Vehicle rental partner' },
        { label: 'Freight forwarding partner (Spedition)' },
        { label: 'International relocation coordinator' },
        { label: 'University relocation partner' },
        { label: 'Corporate relocation vendor' },
      ]}
      operator="FlyttGo Technologies Group (Norway) — European marketplace"
      specs={[
        { label: 'ISO code', value: 'DE' },
        { label: 'Currency', value: 'EUR' },
        { label: 'Jurisdiction', value: 'Federal · 16 Bundesländer' },
        { label: 'Carrier framework', value: 'GüKG · BAG · EU' },
        { label: 'Rollout phase', value: 'Phase 3 — European corridor' },
      ]}
      regions={['Berlin','München','Hamburg','Frankfurt am Main','Köln','Stuttgart']}
    />
  );
}
