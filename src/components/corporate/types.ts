/* Shared types + demo data for the corporate dashboard tabs.
 *
 * The shipments / recurring / api / team blocks render seeded mock
 * data — the dashboard ships a credible enterprise preview before the
 * real Stripe / webhook / WMS integrations land. Real-data tabs go
 * through src/hooks/queries/useCorporateDashboard. */

export type DashTab =
  | 'overview' | 'shipments' | 'recurring' | 'invoices' | 'drivers'
  | 'analytics' | 'api' | 'team' | 'documents' | 'support'
  | 'relocations' | 'members' | 'contracts' | 'compliance' | 'regions';

export type RelocationStatusFilter = 'active' | 'scheduled' | 'completed' | 'all';

export interface NavItem { id: DashTab; icon: string; label: string }

export const NAV_ITEMS: NavItem[] = [
  { id: 'overview',    icon: '📊', label: 'Overview' },
  { id: 'relocations', icon: '🏢', label: 'Relocations' },
  { id: 'regions',     icon: '🌍', label: 'Deployment regions' },
  { id: 'contracts',   icon: '📜', label: 'Contracts' },
  { id: 'invoices',    icon: '💳', label: 'Invoices' },
  { id: 'compliance',  icon: '🛡️', label: 'Compliance' },
  { id: 'members',     icon: '👥', label: 'Members' },
  { id: 'shipments',   icon: '🚚', label: 'Shipments' },
  { id: 'recurring',   icon: '🔁', label: 'Recurring' },
  { id: 'drivers',     icon: '👤', label: 'Drivers' },
  { id: 'analytics',   icon: '📈', label: 'Analytics' },
  { id: 'api',         icon: '🔗', label: 'API & Webhooks' },
  { id: 'team',        icon: '👥', label: 'Team' },
  { id: 'documents',   icon: '📄', label: 'Documents' },
  { id: 'support',     icon: '🎧', label: 'Support' },
];

export const REAL_DATA_TABS: DashTab[] = [
  'relocations', 'members', 'invoices', 'contracts', 'compliance', 'regions',
];

/* Tabs that ship as demo upsells while the real integration lands. */
export const PLACEHOLDER_TABS: DashTab[] = ['drivers', 'analytics', 'documents', 'support'];

export interface DemoShipment {
  id:     string;
  from:   string;
  to:     string;
  status: 'In Transit' | 'Delivered' | 'Scheduled' | 'Exception';
  driver: string;
  eta:    string;
  value:  string;
}

export const SHIPMENTS: DemoShipment[] = [
  { id: 'SHP-10482', from: 'New York Warehouse',   to: 'Los Angeles Distribution', status: 'In Transit', driver: 'Erik Andersen', eta: '14:30',           value: '3,420 USD' },
  { id: 'SHP-10481', from: 'Chicago Store',        to: 'Ålesund Office',           status: 'Delivered',  driver: 'Maja Larsen',   eta: 'Completed',       value: '1,850 USD' },
  { id: 'SHP-10480', from: 'Los Angeles Hub',      to: 'Houston Client',           status: 'Scheduled',  driver: 'Unassigned',    eta: '09:00 Tomorrow',  value: '2,100 USD' },
  { id: 'SHP-10479', from: 'New York Central',     to: 'Phoenix Depot',            status: 'In Transit', driver: 'Lars Nilsen',   eta: '16:45',           value: '980 USD'   },
  { id: 'SHP-10478', from: 'Philadelphia Port',    to: 'New York Logistics Hub',   status: 'Exception',  driver: 'Ingrid Berg',   eta: 'Delayed',         value: '5,200 USD' },
];

export const STATUS_COLORS: Record<string, string> = {
  'In Transit': 'bg-blue-100 text-blue-700',
  'Delivered':  'bg-emerald-100 text-emerald-700',
  'Scheduled':  'bg-gray-100 text-gray-600',
  'Exception':  'bg-red-100 text-red-700',
};
