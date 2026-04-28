/* ─────────────────────────────────────────────────────────────────
 * Provider categories — the 9 top-level lanes a provider can register
 * under. Drives the first step of onboarding (and any future
 * marketplace-side filters that group results by category).
 *
 * Mirrors the categorisation block in lib/constants.ts (PROVIDER_TYPES)
 * but adds the typed shape the new onboarding rules engine consumes.
 * ───────────────────────────────────────────────────────────────── */

import type { LucideIcon } from 'lucide-react';
import {
  Truck, Users, Package, Boxes, Car, Ship, Globe2, GraduationCap,
  Building2,
} from 'lucide-react';

export type ProviderCategorySlug =
  | 'licensed-carrier'
  | 'moving-labor'
  | 'packing'
  | 'storage'
  | 'vehicle-rental'
  | 'freight-forwarding'
  | 'international-relocation'
  | 'university-relocation'
  | 'corporate-relocation';

export interface ProviderCategory {
  slug:        ProviderCategorySlug;
  name:        string;
  /** One-line description shown in the registration tile. */
  description: string;
  icon:        LucideIcon;
  /** Whether providers in this category typically operate vehicles.
   *  Drives whether the onboarding flow asks for vehicle / cargo
   *  insurance fields. Customers can override per registration. */
  defaultVehicleOperation: boolean;
  /** Whether providers in this category typically need an operator
   *  licence (USDOT / GVOL / GüKG / etc.) — surfaces the licensing
   *  fields by default. */
  defaultLicensingRequired: boolean;
}

export const PROVIDER_CATEGORIES: ProviderCategory[] = [
  {
    slug: 'licensed-carrier',
    name: 'Licensed moving carrier',
    description: 'Registered motor carrier — operates trucks under FMCSA / GVOL / GüKG / equivalent operator licence.',
    icon: Truck,
    defaultVehicleOperation: true,
    defaultLicensingRequired: true,
  },
  {
    slug: 'moving-labor',
    name: 'Moving labor provider',
    description: 'Loading, unloading, and in-home labor crews. Customer brings their own truck or rental.',
    icon: Users,
    defaultVehicleOperation: false,
    defaultLicensingRequired: false,
  },
  {
    slug: 'packing',
    name: 'Packing services provider',
    description: 'Independent packing crews + materials. Full-pack, partial-pack, or fragile-only.',
    icon: Package,
    defaultVehicleOperation: false,
    defaultLicensingRequired: false,
  },
  {
    slug: 'storage',
    name: 'Storage facility partner',
    description: 'Self-storage, bonded warehouses, and staging facilities for staged or international moves.',
    icon: Boxes,
    defaultVehicleOperation: false,
    defaultLicensingRequired: true,
  },
  {
    slug: 'vehicle-rental',
    name: 'Vehicle rental partner',
    description: 'Truck and van rental partners reserved alongside labor and carrier coordination.',
    icon: Car,
    defaultVehicleOperation: true,
    defaultLicensingRequired: true,
  },
  {
    slug: 'freight-forwarding',
    name: 'Freight forwarding partner',
    description: 'Cross-border freight, customs documentation coordination, and consolidation.',
    icon: Ship,
    defaultVehicleOperation: false,
    defaultLicensingRequired: true,
  },
  {
    slug: 'international-relocation',
    name: 'International relocation coordinator',
    description: 'End-to-end origin-country and arrival-country relocation orchestration.',
    icon: Globe2,
    defaultVehicleOperation: false,
    defaultLicensingRequired: false,
  },
  {
    slug: 'university-relocation',
    name: 'University relocation partner',
    description: 'Student move-in / move-out, residence hall windows, and semester mobility.',
    icon: GraduationCap,
    defaultVehicleOperation: true,
    defaultLicensingRequired: false,
  },
  {
    slug: 'corporate-relocation',
    name: 'Corporate relocation vendor',
    description: 'Talent mobility, project relocation, and consolidated procurement workflows.',
    icon: Building2,
    defaultVehicleOperation: false,
    defaultLicensingRequired: false,
  },
];

export function findProviderCategory(slug: ProviderCategorySlug | string): ProviderCategory | undefined {
  return PROVIDER_CATEGORIES.find(c => c.slug === slug);
}
