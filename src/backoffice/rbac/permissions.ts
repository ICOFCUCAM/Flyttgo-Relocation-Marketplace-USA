/* ─────────────────────────────────────────────────────────────────
 * BOS RBAC — permission catalogue
 *
 * Permissions are plain strings — same shape as Postgres stores them
 * in `bos_role_permissions.permission`. Using string literals (rather
 * than an enum) keeps the client and the database speaking the same
 * vocabulary without a generation step.
 *
 * The wildcard '*' grants every permission and is reserved for the
 * super_admin role. has_bos_permission() in Postgres short-circuits
 * on '*' so a super_admin row in bos_role_permissions automatically
 * passes every RLS gate.
 *
 * Pages and services should reference these constants instead of
 * inlining the strings, so a permission rename = one edit here.
 * ───────────────────────────────────────────────────────────────── */

export const PERMISSIONS = {
  /* RBAC */
  RBAC_VIEW:                'rbac.view',
  RBAC_ASSIGN:              'rbac.assign',

  /* Markets */
  MARKETS_VIEW:             'markets.view',
  MARKETS_UNLOCK:           'markets.unlock',

  /* Payments + ledger */
  PAYMENTS_VIEW:            'payments.view',
  PAYMENTS_WRITE:           'payments.write',

  /* Accounting */
  ACCOUNTING_VIEW:          'accounting.view',
  ACCOUNTING_EXPORT:        'accounting.export',
  ACCOUNTING_CONFIG:        'accounting.config',

  /* Invoices */
  INVOICES_VIEW:            'invoices.view',
  INVOICES_GENERATE:        'invoices.generate',

  /* Audit */
  AUDIT_VIEW:               'audit.view',

  /* Feature flags */
  FEATURE_FLAGS_VIEW:       'feature_flags.view',
  FEATURE_FLAGS_WRITE:      'feature_flags.write',

  /* Customer support surfaces */
  BOOKINGS_VIEW:            'bookings.view',
  CUSTOMERS_VIEW:           'customers.view',
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];
export type PermissionString = Permission | '*';

/* ── Static role labels for display only.
 *
 * The actual role inventory lives in the bos_roles table. This map
 * is the canonical client-side label set so the sidebar + role-
 * picker components don't have to await a database round-trip just
 * to render a friendly name. Adding a role = adding a row in DB +
 * an entry here. */
export const ROLE_LABELS: Record<string, string> = {
  super_admin:    'Super Admin',
  admin:          'Admin',
  accountant_us:  'US Accountant',
  auditor:        'Auditor',
  support:        'Support',
};

/* Sidebar navigation visibility — page id → required permission.
 * Components consult this to hide nav entries the user can't reach. */
export const PAGE_PERMISSIONS: Record<string, Permission> = {
  dashboard:      PERMISSIONS.RBAC_VIEW,        /* Anyone with any BOS role lands here. */
  markets:        PERMISSIONS.MARKETS_VIEW,
  payments:       PERMISSIONS.PAYMENTS_VIEW,
  accounting:     PERMISSIONS.ACCOUNTING_VIEW,
  /* The auditor-facing workspace shares the audit-log read perm —
   * if you can read the platform mutation log you can read the
   * journal-line audit surface. */
  audit:          PERMISSIONS.AUDIT_VIEW,
  /* Treasury — wallets / escrow / payout queue. Reuses the
   * payments view permission so anyone who can see central
   * payments can see the treasury totals. */
  treasury:       PERMISSIONS.PAYMENTS_VIEW,
  invoices:       PERMISSIONS.INVOICES_VIEW,
  'super-admin':  PERMISSIONS.RBAC_ASSIGN,
  'audit-log':    PERMISSIONS.AUDIT_VIEW,
  'feature-flags': PERMISSIONS.FEATURE_FLAGS_VIEW,
};
