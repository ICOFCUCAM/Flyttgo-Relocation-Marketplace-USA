# FlyttGo Back-Office System (BOS) — Architecture

A separate, modular operator-only subsystem for FlyttGo. Lives under
`/backoffice/*`, integrates with the existing booking system without
modifying it, and is gated by data-driven RBAC.

## 1. Design principles

- **Isolated namespace.** All BOS data lives in `bos_*` tables. The
  customer-facing tables (`bookings`, `profiles`, `driver_applications`,
  …) are read by BOS but never written.
- **Permission-gated, not role-gated.** Pages and services check
  permission strings (`markets.unlock`, `payments.view`, …) instead of
  role names. Roles are bags of permissions stored in
  `bos_role_permissions`. Adding a permission to a role = inserting
  one row.
- **Wildcard for super_admin.** The literal `*` in
  `bos_role_permissions` short-circuits `has_bos_permission(uid, perm)`
  to true. Super admins automatically pass every check.
- **RLS as the real boundary.** Every `bos_*` table is RLS-protected.
  Client-side `RequirePermission` is defensive UX, not security.
- **Append-only audit.** `bos_audit_log` has `INSERT` policy only;
  there is no `UPDATE` or `DELETE` policy. Once written, an entry
  cannot be modified or deleted via the public API.
- **Single Page id.** The whole BOS sits behind `Page = 'backoffice'`
  in the global store. Sub-pages are URL slugs (`/backoffice/markets`,
  `/backoffice/payments`, …) parsed by the BOS sub-router. Mirrors
  the `service-category` / `corridor` / `moving-city` routing pattern
  the rest of the app uses.

## 2. Schema

`docs/install-backoffice-schema.sql` ships nine tables + one
permission resolver function:

| Table | Purpose |
|-------|---------|
| `bos_roles`               | Role catalogue (id, label, description). |
| `bos_role_permissions`    | Role → permission strings. |
| `bos_user_roles`          | User → role assignments. |
| `bos_market_rollout`      | Per-(country, optional city) status (`locked` / `pilot` / `live`). |
| `bos_transactions`        | Central transaction header. |
| `bos_ledger_entries`      | Double-entry-style debit/credit lines per transaction. |
| `bos_invoices`            | Invoice records, tagged with the active accounting system. |
| `bos_feature_flags`       | Global feature toggles. |
| `bos_audit_log`           | Append-only audit trail. |
| `bos_accounting_config`   | Single-row config for the active accounting system. |

`has_bos_permission(uid, perm)` is the canonical permission resolver.
Every RLS policy on a `bos_*` table calls it. Granting a new
permission to a role = inserting a row in `bos_role_permissions`;
the change takes effect immediately.

Seeded roles: `super_admin`, `admin`, `accountant_us`, `auditor`,
`support`. Seeded permission map covers RBAC, markets, payments,
accounting, invoices, audit, feature flags, and customer-support
read access.

Seeded market rollout state: 6 legacy markets `live`, 10 expansion
markets `locked`. Operators promote via the Market Rollout page.

## 3. Routing

| URL | Page id | Sub-page |
|-----|---------|----------|
| `/backoffice`              | `backoffice` | dashboard |
| `/backoffice/markets`      | `backoffice` | markets |
| `/backoffice/payments`     | `backoffice` | payments |
| `/backoffice/accounting`   | `backoffice` | accounting |
| `/backoffice/invoices`     | `backoffice` | invoices |
| `/backoffice/super-admin`  | `backoffice` | super-admin |
| `/backoffice/audit-log`    | `backoffice` | audit-log |
| `/backoffice/feature-flags`| `backoffice` | feature-flags |

`pageRoutes.ts` prefix-matches `/backoffice` and `/backoffice/...` to
the same Page id; the BOS sub-router (`src/backoffice/index.tsx`)
reads the slug from `window.location.pathname` and renders the right
page. `setPage('backoffice')` lands on the dashboard.

## 4. RBAC primitives

`src/backoffice/rbac/`
- `permissions.ts` — `PERMISSIONS` constants + role labels +
  `PAGE_PERMISSIONS` for sidebar visibility.
- `useBackofficeAuth.ts` — react-query hook returning the current
  user's roles + flattened permission set + `hasPermission(p)` +
  `isSuperAdmin`.
- `Guard.tsx` — `<RequirePermission perm="…">` defensive wrapper.

## 5. Services

Every state-changing service calls `recordAudit()` after a successful
mutation so the trail is complete. Audit logging is fire-and-forget
— a logging failure never inverts the user-visible result.

`src/backoffice/services/`
- `audit-service.ts` — `recordAudit()`, `listAudit()`.
- `rbac-service.ts` — list roles / permissions / users; assign +
  revoke role.
- `market-rollout-service.ts` — `listMarketRollout()`,
  `setMarketStatus()`.
- `payments-service.ts` — `listTransactions()`, `listLedgerEntries()`,
  `recordTransaction()` (validates debit/credit balance),
  `summariseLedger()`.
- `accounting-service.ts` — `getAccountingConfig()`,
  `setActiveAccountingSystem()`.
- `invoices-service.ts` — `listInvoices()`, `generateInvoice()`,
  `setInvoiceStatus()`.
- `feature-flags-service.ts` — `listFeatureFlags()`,
  `setFeatureFlag()`, `isFeatureEnabled(key)` (consumed by the
  customer app for feature gates).

## 6. Pages

Eight pages, one per sidebar entry:

- **Dashboard** — KPI tiles + recent audit feed.
- **Market Rollout** — table of every (country, city) row with
  `locked / pilot / live` status; operators with `markets.unlock`
  can promote/demote.
- **Central Payments** — ledger summary by account + paginated
  transaction list with type filter.
- **US Accounting** — active-system display, system switcher
  (US GAAP / EU VAT / custom) with `accounting.config` gate, ledger
  summary, and CSV export with the system's column schema.
- **Invoices** — list, generate (modal), mark-paid; tagged with the
  active accounting system at issue time.
- **Super Admin** — role catalogue with permission cards (`*`
  wildcards highlighted), user→role assignments with revoke, assign-
  role dialog.
- **Audit Log** — append-only viewer with `action` and
  `target_type` filters.
- **Feature Flags** — list + toggle. Calls back into
  `feature-flags-service.setFeatureFlag()` which audit-logs the
  change.

## 7. Accounting system switch

`bos_accounting_config` is single-row (`id = 1` check constraint) so
the system is always in exactly one mode. Switching emits an audit
entry with the before/after diff.

`src/backoffice/lib/accounting-systems.ts` is the typed catalogue:
- `us_gaap` — Calendar fiscal year, no default tax rate, USD baseline.
- `eu_vat` — Calendar fiscal year, 21% default VAT, EUR baseline,
  exports include `vat_rate`, `vat_amount`, `country_code` columns.
- `custom` — operator-defined.

CSV export pulls the active system's `exportColumns` so the file
schema follows the system. Adding a new system = adding an entry
here + (if needed) extending the SQL check constraint on
`bos_accounting_config.active_system`.

## 8. Audit log

Every state-changing service calls `recordAudit({ action, targetType,
targetId, diff })`. The audit row carries:

- `actor_id` — `auth.uid()` from the active session.
- `actor_role` — denormalised role name (caller-supplied).
- `action` — dot-namespaced verb (`markets.status.set`,
  `feature_flag.toggle`, `rbac.role.assign`, …).
- `target_type` + `target_id` — what was changed.
- `diff` — JSONB of before/after.
- `user_agent` — captured client-side.

Reads are gated on `audit.view`. Inserts are allowed for any
authenticated user (the action they're logging is the gate).
**Update + delete are not granted** — the table is append-only.

## 9. Integration with the existing booking system

BOS is read-only against the customer-facing tables. The booking
system is **not modified** by this migration:

- `bookings` is referenced by `bos_invoices.booking_id` and
  `bos_transactions.external_ref`, but nothing in the booking flow
  is rewritten to depend on BOS.
- `driver_applications` and `notifications` already feed the existing
  Admin Dashboard — BOS does not duplicate that surface.
- Feature flags (`bos_feature_flags`) can be consumed by the
  customer app via `isFeatureEnabled(key)` — that's the integration
  point if/when an expansion country wants to flip the booking
  widget on.

A future commit can add a Postgres trigger that inserts a
`bos_transactions` row on every `bookings.payment_status` change,
backfilling the central ledger from the existing payment flow. That
trigger is intentionally not part of this initial commit so the
booking system stays untouched.

## 10. Bootstrapping

To turn the BOS on for the first super_admin:

1. Apply the schema: `psql … -f docs/install-backoffice-schema.sql`
2. As a Supabase admin, run:
   ```sql
   insert into public.bos_user_roles (user_id, role_id)
   values ('<your-auth-user-id>', 'super_admin');
   ```
3. Visit `/backoffice` while signed in. Every other operator can
   then be assigned a role through the Super Admin page.
