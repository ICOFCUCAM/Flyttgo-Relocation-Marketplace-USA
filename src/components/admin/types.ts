/* Shared UI types for the admin tabs/modals. Cross-tab modal state
 * (selected booking, application, dispatch target) lives in the shell
 * and is opened via these handler callbacks passed down to each tab. */

import type { BookingRow, ApplicationRow } from '../../services/admin';

export type AdminTab =
  | 'overview'
  | 'fleet-map'
  | 'drivers'
  | 'bookings'
  | 'applications'
  | 'revenue'
  | 'disputes'
  | 'matcher'
  | 'settings';

export const ADMIN_TABS: AdminTab[] = [
  'overview',
  'fleet-map',
  'drivers',
  'bookings',
  'applications',
  'revenue',
  'disputes',
  'matcher',
  'settings',
];

export interface AdminPanelHandlers {
  openManualRefund:    (booking: BookingRow) => void;
  openManualDispatch:  (booking: BookingRow) => void;
  openTimeline:        (bookingId: string) => void;
  openApplicationDocs: (app: ApplicationRow) => void;
}
