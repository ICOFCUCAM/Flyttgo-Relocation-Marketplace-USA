/* Shared UI types for the admin tabs/modals. Cross-tab modal state
 * (selected booking, application, dispatch target) lives in the shell
 * and is opened via these handler callbacks passed down to each tab. */

import type { BookingRow, ApplicationRow, DriverRow } from '../../services/admin';

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
  /** Opened from the Applications tab — full app context. */
  openApplicationDocs: (app: ApplicationRow) => void;
  /** Opened from the Drivers tab — for already-adopted drivers,
   *  no application id is needed. */
  openDriverDocs:      (driver: DriverRow) => void;
}
